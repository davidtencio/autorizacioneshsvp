import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

/**
 * Phase 2 migration: consolidate patients into the subcollection and
 * replace the embedded `patients[]` array with `patientsSummary`.
 *
 * Phases (run separately, each idempotent):
 *
 *   --phase=verify       Reports diffs array vs subcollection. Read-only.
 *   --phase=consolidate  Copies any array-only patient into subcollection.
 *                        Leaves the array intact.
 *   --phase=summarize    Replaces array with patientsSummary = { count, lastUpdated }.
 *                        Requires the subcollection to be at least as complete
 *                        as the array (consolidate must run successfully first).
 *
 * Default mode is dry-run. Pass --apply to write.
 *
 * Usage:
 *   node scripts/migrations/consolidate-patients-admin.mjs --phase=verify
 *   node scripts/migrations/consolidate-patients-admin.mjs --phase=consolidate
 *   node scripts/migrations/consolidate-patients-admin.mjs --phase=consolidate --apply
 *   node scripts/migrations/consolidate-patients-admin.mjs --phase=summarize --apply
 */

const projectId = process.env.FIREBASE_PROJECT_ID || 'hsvp-autorizaciones-7819d';
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const apply = process.argv.includes('--apply');
const phaseArg = (process.argv.find((a) => a.startsWith('--phase=')) ?? '--phase=verify').split('=')[1];

if (!['verify', 'consolidate', 'summarize'].includes(phaseArg)) {
  console.error(`Invalid --phase=${phaseArg}. Must be one of: verify | consolidate | summarize`);
  process.exit(1);
}

if (!getApps().length) {
  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({ credential: cert(serviceAccount), projectId });
  } else {
    initializeApp({ credential: applicationDefault(), projectId });
  }
}

const db = getFirestore();

function patientKey(p) {
  return p && p.id !== undefined && p.id !== null ? String(p.id) : null;
}

async function loadMedications() {
  const snap = await db.collection('medications').get();
  return snap.docs;
}

async function loadSubcollectionMap(medId) {
  const snap = await db.collection(`medications/${medId}/patients`).get();
  const map = new Map();
  for (const d of snap.docs) {
    map.set(d.id, d.data());
  }
  return map;
}

function diffArrayVsSub(arr, subMap) {
  const onlyInArray = [];
  const onlyInSub = [];
  const both = [];
  const seenInArray = new Set();
  for (const p of arr) {
    const key = patientKey(p);
    if (!key) continue;
    seenInArray.add(key);
    if (subMap.has(key)) both.push({ key, arr: p, sub: subMap.get(key) });
    else onlyInArray.push({ key, patient: p });
  }
  for (const [key, p] of subMap.entries()) {
    if (!seenInArray.has(key)) onlyInSub.push({ key, patient: p });
  }
  return { onlyInArray, onlyInSub, both };
}

// Matches MM/YYYY or YYYY-MM-DD prefix; ignores malformed legacy values
// like "82/6" so they don't pollute patientsSummary.lastUpdated.
const VALID_DATE_RE = /^(\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/;

function summaryFor(patients) {
  // The subcollection is the source of truth post-migration.
  const safeArr = Array.isArray(patients) ? patients : [];
  let lastUpdated = '';
  for (const p of safeArr) {
    const candidates = [p?.suspensionDate, p?.endMonth, p?.startMonth].filter(
      (v) => typeof v === 'string' && VALID_DATE_RE.test(v)
    );
    for (const c of candidates) {
      if (c > lastUpdated) lastUpdated = c;
    }
  }
  return {
    count: safeArr.length,
    lastUpdated: lastUpdated || new Date().toISOString().slice(0, 10),
  };
}

async function runVerify(meds) {
  let totalMeds = 0;
  let totalArrayOnly = 0;
  let totalSubOnly = 0;
  let totalBoth = 0;
  for (const medDoc of meds) {
    const arr = Array.isArray(medDoc.data().patients) ? medDoc.data().patients : [];
    const subMap = await loadSubcollectionMap(medDoc.id);
    const { onlyInArray, onlyInSub, both } = diffArrayVsSub(arr, subMap);
    totalMeds += 1;
    totalArrayOnly += onlyInArray.length;
    totalSubOnly += onlyInSub.length;
    totalBoth += both.length;
    if (onlyInArray.length || onlyInSub.length || arr.length > 0) {
      console.log(
        `[verify] ${medDoc.id} (${medDoc.data().name ?? ''}) arr=${arr.length} sub=${subMap.size} arr_only=${onlyInArray.length} sub_only=${onlyInSub.length} both=${both.length}`
      );
    }
  }
  console.log('');
  console.log(`[verify] DONE — medications: ${totalMeds}`);
  console.log(`[verify]   patients only in array (need consolidate): ${totalArrayOnly}`);
  console.log(`[verify]   patients only in subcollection: ${totalSubOnly}`);
  console.log(`[verify]   patients in both: ${totalBoth}`);
}

async function runConsolidate(meds) {
  let writes = 0;
  for (const medDoc of meds) {
    const arr = Array.isArray(medDoc.data().patients) ? medDoc.data().patients : [];
    const subMap = await loadSubcollectionMap(medDoc.id);
    const { onlyInArray } = diffArrayVsSub(arr, subMap);
    if (onlyInArray.length === 0) continue;

    console.log(`[consolidate] ${medDoc.id}: ${onlyInArray.length} array-only patient(s) to copy`);
    if (!apply) continue;

    let batch = db.batch();
    let ops = 0;
    for (const { key, patient } of onlyInArray) {
      const ref = db.doc(`medications/${medDoc.id}/patients/${key}`);
      batch.set(ref, patient, { merge: true });
      ops += 1;
      writes += 1;
      if (ops === 450) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();
  }
  console.log('');
  console.log(`[consolidate] DONE — mode: ${apply ? 'APPLY' : 'DRY-RUN'} — patient writes: ${writes}`);
}

async function runSummarize(meds) {
  let processed = 0;
  let skipped = 0;
  for (const medDoc of meds) {
    const data = medDoc.data();
    const arr = Array.isArray(data.patients) ? data.patients : [];
    const subMap = await loadSubcollectionMap(medDoc.id);
    const { onlyInArray } = diffArrayVsSub(arr, subMap);

    if (onlyInArray.length > 0) {
      console.error(
        `[summarize] SKIP ${medDoc.id}: ${onlyInArray.length} patient(s) still missing from subcollection. Run --phase=consolidate --apply first.`
      );
      skipped += 1;
      continue;
    }

    // Compute summary from subcollection — it's the source of truth.
    // Fall back to array only if subcollection is empty (shouldn't happen after consolidate).
    const sourcePatients = subMap.size > 0 ? Array.from(subMap.values()) : arr;
    const summary = summaryFor(sourcePatients);
    console.log(
      `[summarize] ${medDoc.id} (${data.name ?? ''}) → count=${summary.count} (arr=${arr.length} sub=${subMap.size}) lastUpdated=${summary.lastUpdated}`
    );

    if (!apply) {
      processed += 1;
      continue;
    }

    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(medDoc.ref);
      const freshData = fresh.data() ?? {};
      const update = {
        patients: FieldValue.delete(),
        patientsSummary: summary,
        patientsSummaryMigratedAt: Timestamp.now(),
      };
      if (!('patientsSummary' in freshData) && !('patients' in freshData)) {
        // already migrated; still safe to re-set summary for consistency
      }
      tx.update(medDoc.ref, update);
    });
    processed += 1;
  }
  console.log('');
  console.log(
    `[summarize] DONE — mode: ${apply ? 'APPLY' : 'DRY-RUN'} — medications processed: ${processed}, skipped: ${skipped}`
  );
}

async function main() {
  console.log(`[migrate-p2] project=${projectId} phase=${phaseArg} mode=${apply ? 'APPLY' : 'DRY-RUN'}`);
  const meds = await loadMedications();
  console.log(`[migrate-p2] medications: ${meds.length}`);
  console.log('');

  if (phaseArg === 'verify') return runVerify(meds);
  if (phaseArg === 'consolidate') return runConsolidate(meds);
  if (phaseArg === 'summarize') return runSummarize(meds);
}

main().catch((err) => {
  console.error('[migrate-p2] FAILED:', err);
  process.exit(1);
});
