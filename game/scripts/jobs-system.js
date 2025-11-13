// Jobs management system
import { auth, db } from './firebase-init.js';
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// Job state
const jobState = {
  currentJob: null,
  progress: 0,
  intervalId: null
};

// Player stats (will be loaded from Firebase)
let playerStats = {
  gold: 0,
  exp: 0,
  level: 1
};

// Job definitions
const jobs = {
  packing: {
    id: 'packing',
    name: 'Packing Job',
    duration: 10000, // 10 seconds in milliseconds
    goldReward: 10,
    expReward: 5
  }
};

// Initialize jobs system
export function initJobsSystem() {
  loadPlayerStats();
  renderJobsUI();
}

// Check if player has employees on the books
function hasEmployeesAssigned() {
  // We need to check the staff state from staff-system.js
  // For now, we'll check the DOM to see if there are filled slots
  const slots = document.querySelectorAll('.employee-slot.filled');
  return slots.length > 0;
}

// Render the jobs UI
function renderJobsUI() {
  const container = document.getElementById('jobs-content');
  
  if (!hasEmployeesAssigned()) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; opacity: 0.8;">
        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">⚠️ No Employees Assigned</p>
        <p style="font-size: 0.9rem; color: var(--text-muted);">
          Please go to the STAFF tab to hire and assign employees before starting jobs.
        </p>
      </div>
    `;
    return;
  }

  // Player has employees, show job interface
  container.innerHTML = `
    <div style="padding: 1rem;">
      <div style="background: #2a2a2a; padding: 1rem; border-radius: var(--radius); margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
          <span>💰 Gold: <strong id="player-gold">${playerStats.gold}</strong></span>
          <span>⭐ Level: <strong id="player-level">${playerStats.level}</strong></span>
        </div>
        <div style="margin-top: 0.5rem;">
          <span>📊 EXP: <strong id="player-exp">${playerStats.exp}</strong></span>
        </div>
      </div>

      <h3>Available Jobs</h3>
      <div id="job-list">
        <!-- Jobs will be rendered here -->
      </div>

      <div id="active-job-container" style="display: none; margin-top: 1rem;">
        <div style="background: #2a2a2a; padding: 1rem; border-radius: var(--radius);">
          <h3 id="active-job-name" style="margin-top: 0;">Packing Job</h3>
          <div style="background: #1a1a1a; height: 30px; border-radius: 15px; overflow: hidden; margin: 1rem 0;">
            <div id="progress-bar" style="background: var(--accent); height: 100%; width: 0%; transition: width 0.1s linear;"></div>
          </div>
          <div style="text-align: center; color: var(--text-muted); font-size: 0.9rem;">
            <span id="progress-text">0%</span>
          </div>
        </div>
      </div>
    </div>
  `;

  renderJobList();
}

// Render available jobs
function renderJobList() {
  const container = document.getElementById('job-list');
  if (!container) return;

  container.innerHTML = '';

  Object.values(jobs).forEach(job => {
    const jobCard = document.createElement('div');
    jobCard.style.cssText = `
      background: #2a2a2a;
      border: 2px solid #3a3a3a;
      border-radius: var(--radius);
      padding: 1rem;
      margin-bottom: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
    `;

    jobCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: bold; margin-bottom: 0.3rem;">${job.name}</div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Duration: ${job.duration / 1000}s
          </div>
        </div>
        <div style="text-align: right;">
          <div style="color: #ffd700; font-weight: bold;">+${job.goldReward} Gold</div>
          <div style="color: #4a9eff; font-size: 0.85rem;">+${job.expReward} EXP</div>
        </div>
      </div>
    `;

    jobCard.onmouseover = () => {
      jobCard.style.borderColor = 'var(--accent)';
      jobCard.style.transform = 'translateY(-2px)';
    };

    jobCard.onmouseout = () => {
      jobCard.style.borderColor = '#3a3a3a';
      jobCard.style.transform = 'translateY(0)';
    };

    jobCard.onclick = () => startJob(job);

    container.appendChild(jobCard);
  });
}

// Start a job
function startJob(job) {
  if (jobState.currentJob) {
    alert('A job is already in progress!');
    return;
  }

  if (!hasEmployeesAssigned()) {
    alert('You need to assign employees first!');
    renderJobsUI();
    return;
  }

  jobState.currentJob = job;
  jobState.progress = 0;

  // Hide job list, show active job
  document.getElementById('job-list').style.display = 'none';
  const activeContainer = document.getElementById('active-job-container');
  activeContainer.style.display = 'block';
  document.getElementById('active-job-name').textContent = job.name;

  // Start progress
  const startTime = Date.now();
  const duration = job.duration;

  jobState.intervalId = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min((elapsed / duration) * 100, 100);
    
    jobState.progress = progress;
    updateProgressBar(progress);

    if (progress >= 100) {
      completeJob(job);
    }
  }, 100);
}

// Update progress bar
function updateProgressBar(progress) {
  const bar = document.getElementById('progress-bar');
  const text = document.getElementById('progress-text');
  
  if (bar) bar.style.width = progress + '%';
  if (text) text.textContent = Math.floor(progress) + '%';
}

// Complete a job
function completeJob(job) {
  // Clear interval
  if (jobState.intervalId) {
    clearInterval(jobState.intervalId);
    jobState.intervalId = null;
  }

  // Award rewards
  playerStats.gold += job.goldReward;
  playerStats.exp += job.expReward;

  // Check for level up (simple formula: 20 exp per level)
  let leveledUp = false;
  const expNeeded = playerStats.level * 20;
  if (playerStats.exp >= expNeeded) {
    playerStats.level++;
    playerStats.exp -= expNeeded;
    leveledUp = true;
  }

  // Save to Firebase
  savePlayerStats();

  // Show rewards in the progress bar area
  const activeContainer = document.getElementById('active-job-container');
  if (activeContainer) {
    activeContainer.innerHTML = `
      <div style="background: #2a2a2a; padding: 2rem; border-radius: var(--radius); text-align: center;">
        <div style="font-size: 1.5rem; margin-bottom: 1rem;">✅ Complete!</div>
        <div style="font-size: 1.2rem; color: #ffd700; margin: 0.5rem 0;">
          +${job.goldReward} Gold
        </div>
        <div style="font-size: 1rem; color: #4a9eff; margin: 0.5rem 0;">
          +${job.expReward} EXP
        </div>
        ${leveledUp ? `
          <div style="font-size: 1.1rem; color: var(--accent); margin-top: 1rem; animation: pulse 0.5s;">
            🎉 Level Up! Now Level ${playerStats.level}!
          </div>
        ` : ''}
      </div>
    `;
  }

  // Reset job state
  jobState.currentJob = null;
  jobState.progress = 0;

  // Wait 1 second, then show job list again
  setTimeout(() => {
    renderJobsUI();
  }, 1000);
}

// Save player stats to Firebase
async function savePlayerStats() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await updateDoc(doc(db, "players", user.uid), {
      gold: playerStats.gold,
      exp: playerStats.exp,
      level: playerStats.level
    });

    // Update display
    const goldEl = document.getElementById('player-gold');
    const expEl = document.getElementById('player-exp');
    const levelEl = document.getElementById('player-level');

    if (goldEl) goldEl.textContent = playerStats.gold;
    if (expEl) expEl.textContent = playerStats.exp;
    if (levelEl) levelEl.textContent = playerStats.level;
  } catch (err) {
    console.error("Error saving player stats:", err);
  }
}

// Load player stats from Firebase
async function loadPlayerStats() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const snapshot = await getDoc(doc(db, "players", user.uid));
    if (snapshot.exists()) {
      const data = snapshot.data();
      playerStats.gold = data.gold || 0;
      playerStats.exp = data.exp || 0;
      playerStats.level = data.level || 1;

      // Update display if elements exist
      const goldEl = document.getElementById('player-gold');
      const expEl = document.getElementById('player-exp');
      const levelEl = document.getElementById('player-level');

      if (goldEl) goldEl.textContent = playerStats.gold;
      if (expEl) expEl.textContent = playerStats.exp;
      if (levelEl) levelEl.textContent = playerStats.level;
    }
  } catch (err) {
    console.error("Error loading player stats:", err);
  }
}

// Re-render when switching to jobs tab
export function refreshJobsUI() {
  renderJobsUI();
}