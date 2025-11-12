// scripts/auth.js
import { auth, db } from './firebase-init.js';
import {
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
  doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// 🧱 Register new user
export async function registerUser(email, password, username) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;

  await updateProfile(user, { displayName: username });

  // Create Firestore player record
  await setDoc(doc(db, "players", user.uid), {
    username,
    createdAt: Date.now(),
    gold: 0,
    level: 1,
  });

  alert(`Welcome, ${username}! Account created.`);
}

// 🧱 Sign in existing user
export async function loginUser(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
  alert("Signed in successfully!");
}

// 🧱 Guest login (anonymous)
export async function guestLogin() {
  const result = await signInAnonymously(auth);
  const uid = result.user.uid;

  // Create guest record if it doesn’t exist
  const playerRef = doc(db, "players", uid);
  const snapshot = await getDoc(playerRef);
  if (!snapshot.exists()) {
    await setDoc(playerRef, {
      username: "Guest_" + uid.slice(0, 5),
      createdAt: Date.now(),
      gold: 0,
      level: 1,
      guest: true
    });
  }

  alert("Logged in as Guest!");
}

// 🧱 Auto-login listener
onAuthStateChanged(auth, async (user) => {
  const statusEl = document.getElementById("auth-status");
  if (user) {
    const playerRef = doc(db, "players", user.uid);
    const snapshot = await getDoc(playerRef);
    const data = snapshot.data();

    statusEl.textContent = `Logged in as ${data.username}`;
    console.log("User data loaded:", data);
  } else {
    statusEl.textContent = "Not logged in.";
  }
});
