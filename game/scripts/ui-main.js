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

// Sub-tab switching logic for GAME tab
const jobsSubTab = document.getElementById("subtab-jobs");
const staffSubTab = document.getElementById("subtab-staff");
const equipmentSubTab = document.getElementById("subtab-equipment");

const jobsContent = document.getElementById("jobs-content");
const staffContent = document.getElementById("staff-content");
const equipmentContent = document.getElementById("equipment-content");

function switchSubTab(subTab) {
  // Remove active from all sub-tabs
  jobsSubTab.classList.remove("active");
  staffSubTab.classList.remove("active");
  equipmentSubTab.classList.remove("active");

  // Remove active from all sub-content
  jobsContent.classList.remove("active");
  staffContent.classList.remove("active");
  equipmentContent.classList.remove("active");

  // Hide all content first
  jobsContent.style.display = "none";
  staffContent.style.display = "none";
  equipmentContent.style.display = "none";

  // Add active to selected sub-tab and show content
  if (subTab === "jobs") {
    jobsSubTab.classList.add("active");
    jobsContent.classList.add("active");
    jobsContent.style.display = "block";
  } else if (subTab === "staff") {
    staffSubTab.classList.add("active");
    staffContent.classList.add("active");
    staffContent.style.display = "block";
  } else if (subTab === "equipment") {
    equipmentSubTab.classList.add("active");
    equipmentContent.classList.add("active");
    equipmentContent.style.display = "block";
  }
}

jobsSubTab.onclick = () => switchSubTab("jobs");
staffSubTab.onclick = () => switchSubTab("staff");
equipmentSubTab.onclick = () => switchSubTab("equipment");