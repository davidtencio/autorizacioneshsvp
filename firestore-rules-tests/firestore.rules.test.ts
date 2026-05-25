import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
        patients: [],
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

  it('denies write for readonly user', async () => {
    const readonlyDb = testEnv.authenticatedContext('user-4', { email: 'fhsvp2208@gmail.com' }).firestore();
    await assertFails(setDoc(doc(readonlyDb, 'medications/med-1/patients/3'), { ...validPatient, id: 3 }));
  });
});
