import { logoutUser, upgradeGuestAccount } from "./auth.js";

// Collapsible logic
const collapsible = document.getElementById("upgrade-section");
const header = collapsible.querySelector(".collapsible-header");
header.onclick = () => collapsible.classList.toggle("active");

document.getElementById("logout-btn").onclick = () => logoutUser();

document.getElementById("upgrade-btn").onclick = (e) => {
  e.preventDefault();
  const username = document.getElementById("upgrade-username").value;
  const email = document.getElementById("upgrade-email").value;
  const password = document.getElementById("upgrade-password").value;
  upgradeGuestAccount(email, password, username);
};
