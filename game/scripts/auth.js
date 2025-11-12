// scripts/auth.js
import { auth, db } from './firebase-init.js';
import {
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  linkWithCredential,
  EmailAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
  doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// (existing registerUser, loginUser, guestLogin, onAuthStateChanged remain here)

// 🧩 Load player data
export async function getPlayerData() {
  const user = auth.currentUser;
  if (!user) return null;

  const ref = doc(db, "players", user.uid);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}

// 🧩 Log out
export async function logoutUser() {
  await signOut(auth);
  alert("Logged out successfully.");
  document.location.reload(); // reset UI
}

// 🧩 Upgrade guest → full account
export async function upgradeGuestAccount(email, password, username) {
  const user = auth.currentUser;
  if (!user || !user.isAnonymous) {
    alert("You are not logged in as a guest.");
    return;
  }

  const credential = EmailAuthProvider.credential(email, password);
  const linkedUser = await linkWithCredential(user, credential);

  await updateProfile(linkedUser.user, { displayName: username });

  // Update Firestore player doc
  const playerRef = doc(db, "players", linkedUser.user.uid);
  await setDoc(playerRef, {
    username,
    upgraded: true,
    upgradedAt: Date.now()
  }, { merge: true });

  alert("Account upgraded successfully!");
}
