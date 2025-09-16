// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBB9mCtbtIOPjmSB3xHrSICmhgR0MMFTWc",
  authDomain: "taskcolab-677bf.firebaseapp.com",
  projectId: "taskcolab-677bf",
  storageBucket: "taskcolab-677bf.firebasestorage.app",
  messagingSenderId: "339650089124",
  appId: "1:339650089124:web:e36820145d89e795731631"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with proper error handling for React Native
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: {
      type: 'LOCAL'
    }
  });
} catch (error) {
  // If initializeAuth fails (e.g., already initialized), use getAuth
  console.warn('Auth already initialized, using getAuth:', error);
  auth = getAuth(app);
}

export type { Auth } from 'firebase/auth';
export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);