import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  projectId: 'hsvp-autorizaciones-7819d',
  appId: '1:620052027670:web:b7b8548e3465b6cbe45837',
  storageBucket: 'hsvp-autorizaciones-7819d.firebasestorage.app',
  apiKey: 'AIzaSyARt9u11esaE4ILz4T-A17CCR0HMyp7UGE',
  authDomain: 'hsvp-autorizaciones-7819d.firebaseapp.com',
  messagingSenderId: '620052027670',
  measurementId: 'G-P5TXJVEDVC',
};

export const firebaseApp = initializeApp(firebaseConfig);
