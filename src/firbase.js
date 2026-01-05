// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBqmuF4kq2JjYZ-YTfR_-ONCBbMGADgumk",
  authDomain: "kinmap-30cf3.firebaseapp.com",
  projectId: "kinmap-30cf3",
  storageBucket: "kinmap-30cf3.firebasestorage.app",
  messagingSenderId: "714098608386",
  appId: "1:714098608386:web:d300bdbe03a7dd9fc49a1b",
  measurementId: "G-KP4VFVRDHK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);