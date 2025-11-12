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

/* ------------------------------
   Register new user
-------------------------------- */
export async function registerUser(email, password, username) {
  try {
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
  } catch (err) {
    console.error("Register error:", err);
    alert(err.message);
  }
}

/* ------------------------------
   Sign in existing user
-------------------------------- */
export async function loginUser(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Signed in successfully!");
  } catch (err) {
    console.error("Login error:", err);
    alert(err.message);
  }
}

/* ------------------------------
   Guest login (anonymous)
-------------------------------- */
export async function guestLogin() {
  try {
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
  } catch (err) {
    console.error("Guest login error:", err);
    alert(err.message);
  }
}

/* ------------------------------
   Auto-login listener
-------------------------------- */
onAuthStateChanged(auth, async (user) => {
  const statusEl = document.getElementById("auth-status");
  if (!statusEl) return;

  if (user) {
    const playerRef = doc(db, "players", user.uid);
    const snapshot = await getDoc(playerRef);
    const data = snapshot.exists() ? snapshot.data() : null;

    statusEl.textContent = `Logged in as ${data?.username || "Unknown"}`;
    console.log("User data loaded:", data);
  } else {
    statusEl.textContent = "Not logged in.";
  }
});

/* ------------------------------
   Load player data
-------------------------------- */
export async function getPlayerData() {
  const user = auth.currentUser;
  if (!user) return null;

  const ref = doc(db, "players", user.uid);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}

/* ------------------------------
   Log out
-------------------------------- */
export async function logoutUser() {
  try {
    await signOut(auth);
    alert("Logged out successfully.");
    document.location.reload(); // reload to reset UI
  } catch (err) {
    console.error("Logout error:", err);
    alert(err.message);
  }
}

/* ------------------------------
   Upgrade guest → full account
-------------------------------- */
export async function upgradeGuestAccount(email, password, username) {
  try {
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
  } catch (err) {
    console.error("Upgrade error:", err);
    alert(err.message);
  }
}
