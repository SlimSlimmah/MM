// scripts/ui-auth.js
import { registerUser, loginUser, guestLogin } from './auth.js';

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("register-btn").addEventListener("click", async () => {
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const username = document.getElementById("reg-username").value;
    await registerUser(email, password, username);
  });

  document.getElementById("login-btn").addEventListener("click", async () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    await loginUser(email, password);
  });

  document.getElementById("guest-btn").addEventListener("click", async () => {
    await guestLogin();
  });
});
