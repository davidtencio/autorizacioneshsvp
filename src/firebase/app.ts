import { initializeApp } from 'firebase/app';

const DEFAULTS = {
  projectId: 'hsvp-autorizaciones-7819d',
  appId: '1:620052027670:web:b7b8548e3465b6cbe45837',
  storageBucket: 'hsvp-autorizaciones-7819d.firebasestorage.app',
  apiKey: 'AIzaSyARt9u11esaE4ILz4T-A17CCR0HMyp7UGE',
  authDomain: 'hsvp-autorizaciones-7819d.firebaseapp.com',
  messagingSenderId: '620052027670',
  measurementId: 'G-P5TXJVEDVC',
} as const;

const env = import.meta.env;

const firebaseConfig = {
  projectId: env.VITE_FB_PROJECT_ID ?? DEFAULTS.projectId,
  appId: env.VITE_FB_APP_ID ?? DEFAULTS.appId,
  storageBucket: env.VITE_FB_STORAGE_BUCKET ?? DEFAULTS.storageBucket,
  apiKey: env.VITE_FB_API_KEY ?? DEFAULTS.apiKey,
  authDomain: env.VITE_FB_AUTH_DOMAIN ?? DEFAULTS.authDomain,
  messagingSenderId: env.VITE_FB_MESSAGING_SENDER_ID ?? DEFAULTS.messagingSenderId,
  measurementId: env.VITE_FB_MEASUREMENT_ID ?? DEFAULTS.measurementId,
};

export const firebaseApp = initializeApp(firebaseConfig);
