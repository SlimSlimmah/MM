// scripts/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyClRI8sQUSJF0vYgLqWKUuQsgVL69UkYew",
  authDomain: "moving-manager-46513.firebaseapp.com",
  projectId: "moving-manager-46513",
  storageBucket: "moving-manager-46513.firebasestorage.app",
  messagingSenderId: "590670384322",
  appId: "1:590670384322:web:b4ebf7fa4af05eab497f5b",
  measurementId: "G-CJLMLJFGTN"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
