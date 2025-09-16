// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth } from 'firebase/auth';
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
export const auth = initializeAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);