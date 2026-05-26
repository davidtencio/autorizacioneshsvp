import { firebaseApp } from './app';
import { initializeFirestore } from 'firebase/firestore';

export const db = initializeFirestore(firebaseApp, {
  experimentalAutoDetectLongPolling: true,
});
