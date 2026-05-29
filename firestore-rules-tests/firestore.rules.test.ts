import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { addDoc, collection, doc, getDoc, setDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-hsvp-autorizaciones-rules';

const validPatient = {
  id: 1,
  identificationNumber: '1-1111-1111',
  name: 'Paciente Uno',
  diagnosis: 'Dx',
  authorizationCode: 'AUTH-001',
  issuer: 'CCF',
  startMonth: '012026',
  endMonth: '122026',
  dose: '10mg',
  frequency: 'Q4W',
  route: 'IV',
  totalCycles: '6',
  totalMonths: '12',
  applicationPlace: 'Hosp. México',
  prescriber: 'Dr. Test',
  specialty: 'Oncologia',
};

let testEnv: RulesTestEnvironment;

describe('firestore rules - phase 4', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    });

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'medications/med-1'), {
        code: '1-11',
        name: 'MED',
        strength: '10mg',
        route: 'IV',
        type: 'General',
        patientsSummary: { count: 0, lastUpdated: '2026-05-28' },
      });
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  it('allows authenticated read of patient doc', async () => {
    const authDb = testEnv.authenticatedContext('user-1', { email: 'editor@hsvp.com' }).firestore();
    await assertSucceeds(getDoc(doc(authDb, 'medications/med-1/patients/1')));
  });

  it('allows valid patient write for editor user', async () => {
    const authDb = testEnv.authenticatedContext('user-2', { email: 'editor@hsvp.com' }).firestore();
    await assertSucceeds(setDoc(doc(authDb, 'medications/med-1/patients/1'), validPatient));
  });

  it('denies invalid patient write (issuer out of enum)', async () => {
    const authDb = testEnv.authenticatedContext('user-3', { email: 'editor@hsvp.com' }).firestore();
    await assertFails(
      setDoc(doc(authDb, 'medications/med-1/patients/2'), {
        ...validPatient,
        id: 2,
        issuer: 'XXX',
      })
    );
  });

  it('denies write for readonly user (legacy fallback)', async () => {
    const readonlyDb = testEnv.authenticatedContext('user-4', { email: 'fhsvp2208@gmail.com' }).firestore();
    await assertFails(setDoc(doc(readonlyDb, 'medications/med-1/patients/3'), { ...validPatient, id: 3 }));
  });

  it('allows write when users/{uid}.role = editor', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/user-editor'), {
        email: 'editor@hsvp.com',
        role: 'editor',
      });
    });
    const editorDb = testEnv.authenticatedContext('user-editor', { email: 'editor@hsvp.com' }).firestore();
    await assertSucceeds(
      setDoc(doc(editorDb, 'medications/med-1/patients/10'), { ...validPatient, id: 10 })
    );
  });

  it('denies write when users/{uid}.role = viewer', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/user-viewer'), {
        email: 'viewer@hsvp.com',
        role: 'viewer',
      });
    });
    const viewerDb = testEnv.authenticatedContext('user-viewer', { email: 'viewer@hsvp.com' }).firestore();
    await assertFails(
      setDoc(doc(viewerDb, 'medications/med-1/patients/11'), { ...validPatient, id: 11 })
    );
  });

  it('user can read own users/{uid} doc only', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/user-a'), { email: 'a@x.com', role: 'editor' });
      await setDoc(doc(ctx.firestore(), 'users/user-b'), { email: 'b@x.com', role: 'editor' });
    });
    const aDb = testEnv.authenticatedContext('user-a', { email: 'a@x.com' }).firestore();
    await assertSucceeds(getDoc(doc(aDb, 'users/user-a')));
    await assertFails(getDoc(doc(aDb, 'users/user-b')));
  });

  it('denies client write to users/{uid}', async () => {
    const someDb = testEnv.authenticatedContext('user-z', { email: 'z@x.com' }).firestore();
    await assertFails(setDoc(doc(someDb, 'users/user-z'), { email: 'z@x.com', role: 'admin' }));
  });

  it('ops_logs: allows well-formed log entry', async () => {
    const db = testEnv.authenticatedContext('logger-1', { email: 'log@hsvp.com' }).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'ops_logs'), {
        ts: new Date().toISOString(),
        level: 'error',
        message: 'boom',
        meta: { code: 'XYZ' },
      })
    );
  });

  it('ops_logs: rejects invalid level', async () => {
    const db = testEnv.authenticatedContext('logger-2', { email: 'log@hsvp.com' }).firestore();
    await assertFails(
      addDoc(collection(db, 'ops_logs'), {
        ts: new Date().toISOString(),
        level: 'debug',
        message: 'x',
      })
    );
  });

  it('ops_logs: rejects oversized message', async () => {
    const db = testEnv.authenticatedContext('logger-3', { email: 'log@hsvp.com' }).firestore();
    await assertFails(
      addDoc(collection(db, 'ops_logs'), {
        ts: new Date().toISOString(),
        level: 'error',
        message: 'x'.repeat(600),
      })
    );
  });

  it('medication doc: rejects write with legacy patients array (post-2.d)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/user-strict'), {
        email: 'strict@hsvp.com',
        role: 'editor',
      });
    });
    const editorDb = testEnv.authenticatedContext('user-strict', { email: 'strict@hsvp.com' }).firestore();
    await assertFails(
      setDoc(doc(editorDb, 'medications/med-1'), {
        code: '1-11',
        name: 'MED',
        strength: '10mg',
        route: 'IV',
        type: 'General',
        patients: [],
        patientsSummary: { count: 0, lastUpdated: '2026-05-28' },
      })
    );
  });

  it('medication doc: accepts write with patientsSummary only', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/user-strict2'), {
        email: 'strict2@hsvp.com',
        role: 'editor',
      });
    });
    const editorDb = testEnv.authenticatedContext('user-strict2', { email: 'strict2@hsvp.com' }).firestore();
    await assertSucceeds(
      setDoc(doc(editorDb, 'medications/med-new'), {
        code: '2-22',
        name: 'NEW MED',
        strength: '50mg',
        route: 'Oral',
        type: 'General',
        patientsSummary: { count: 0, lastUpdated: '2026-05-28' },
      })
    );
  });

  it('medication doc: rejects write missing patientsSummary', async () => {
    const editorDb = testEnv.authenticatedContext('user-strict3', { email: 'strict3@hsvp.com' }).firestore();
    await assertFails(
      setDoc(doc(editorDb, 'medications/med-bad'), {
        code: '3-33',
        name: 'BAD MED',
        strength: '10mg',
        route: 'IV',
        type: 'General',
      })
    );
  });

  it('ops_logs: rejects unknown field', async () => {
    const db = testEnv.authenticatedContext('logger-4', { email: 'log@hsvp.com' }).firestore();
    await assertFails(
      addDoc(collection(db, 'ops_logs'), {
        ts: new Date().toISOString(),
        level: 'error',
        message: 'x',
        secret: 'leak',
      })
    );
  });
});
