import { logoutUser, upgradeGuestAccount } from "./auth.js";

const gameTab = document.getElementById("tab-game");
const accountTab = document.getElementById("tab-account");
const gameContent = document.getElementById("game-tab");
const accountContent = document.getElementById("account-tab");

// Tab switching logic
function switchTab(tab) {
  if (tab === "game") {
    gameTab.classList.add("active");
    accountTab.classList.remove("active");
    gameContent.classList.add("active");
    accountContent.classList.remove("active");
  } else {
    accountTab.classList.add("active");
    gameTab.classList.remove("active");
    accountContent.classList.add("active");
    gameContent.classList.remove("active");
  }
}

gameTab.onclick = () => switchTab("game");
accountTab.onclick = () => switchTab("account");

// Collapsible upgrade section
const collapsible = document.getElementById("upgrade-section");
const header = collapsible.querySelector(".collapsible-header");
header.onclick = () => collapsible.classList.toggle("active");

// Logout and upgrade
document.getElementById("logout-btn").onclick = () => logoutUser();

document.getElementById("upgrade-btn").onclick = (e) => {
  e.preventDefault();
  const username = document.getElementById("upgrade-username").value;
  const email = document.getElementById("upgrade-email").value;
  const password = document.getElementById("upgrade-password").value;
  upgradeGuestAccount(email, password, username);
};
