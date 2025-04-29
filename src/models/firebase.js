// src/modelsfirebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC8tAD6r7P6Uw-3l8sTzKZJbZkDamsXgYk",
  authDomain: "preticor-b8c0d.firebaseapp.com",
  projectId: "preticor-b8c0d",
  storageBucket: "preticor-b8c0d.appspot.com",
  messagingSenderId: "1052984801220",
  appId: "1:1052984801220:web:7ce62b4d83230d2b665691",
  measurementId: "G-ZB8DV4RBT1"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { db, auth, analytics };