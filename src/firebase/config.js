import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBhtEcInMLxSH-QqGBflFx3LWIJi3O-KeE",
  authDomain: "hotdog-miniapp.firebaseapp.com",
  projectId: "hotdog-miniapp",
  storageBucket: "hotdog-miniapp.firebasestorage.app",
  messagingSenderId: "145439252658",
  appId: "1:145439252658:web:8ace7290dcc9913bc529ab",
  measurementId: "G-GDSS9GVZ5R"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };