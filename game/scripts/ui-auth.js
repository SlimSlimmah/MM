import { registerUser, loginUser, guestLogin, logoutUser } from "./auth.js";
import { auth } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const loginTab = document.getElementById("login-tab");
const registerTab = document.getElementById("register-tab");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const guestBtn = document.getElementById("guest-btn");
const authUI = document.getElementById("auth-ui");
const profile = document.getElementById("profile");

loginTab.onclick = () => {
  loginTab.classList.add("active");
  registerTab.classList.remove("active");
  loginForm.classList.add("active");
  registerForm.classList.remove("active");
};

registerTab.onclick = () => {
  registerTab.classList.add("active");
  loginTab.classList.remove("active");
  registerForm.classList.add("active");
  loginForm.classList.remove("active");
};

// Auth buttons
document.getElementById("register-btn").onclick = (e) => {
  e.preventDefault();
  const email = document.getElementById("reg-email").value;
  const pass = document.getElementById("reg-password").value;
  const username = document.getElementById("reg-username").value;
  registerUser(email, pass, username);
};

document.getElementById("login-btn").onclick = (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const pass = document.getElementById("login-password").value;
  loginUser(email, pass);
};

guestBtn.onclick = () => guestLogin();

// Auth state UI
onAuthStateChanged(auth, (user) => {
  const authUI = document.getElementById("auth-ui");
  const mainFrame = document.getElementById("main-frame");

  if (user) {
    authUI.style.display = "none";
    mainFrame.style.display = "flex";
    document.getElementById("profile-name").textContent =
      user.displayName || "Guest";
  } else {
    authUI.style.display = "block";
    mainFrame.style.display = "none";
  }
});

