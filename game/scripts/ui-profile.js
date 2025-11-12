// scripts/ui-profile.js
import { getPlayerData, logoutUser, upgradeGuestAccount } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { auth } from './firebase-init.js';

document.addEventListener("DOMContentLoaded", () => {
  const profilePanel = document.getElementById("profile-panel");
  const upgradePanel = document.getElementById("upgrade-panel");
  const logoutBtn = document.getElementById("logout-btn");

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const data = await getPlayerData();
      if (!data) return;

      document.getElementById("profile-username").textContent = data.username;
      document.getElementById("profile-level").textContent = data.level;
      document.getElementById("profile-gold").textContent = data.gold;

      // Show upgrade panel only if guest
      if (user.isAnonymous) {
        upgradePanel.style.display = "block";
      } else {
        upgradePanel.style.display = "none";
      }

      profilePanel.style.display = "block";
    } else {
      profilePanel.style.display = "none";
    }
  });

  logoutBtn.addEventListener("click", logoutUser);

  document.getElementById("upgrade-btn").addEventListener("click", async () => {
    const email = document.getElementById("upgrade-email").value;
    const password = document.getElementById("upgrade-password").value;
    const username = document.getElementById("upgrade-username").value;
    await upgradeGuestAccount(email, password, username);
  });
});
