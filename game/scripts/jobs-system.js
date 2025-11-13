// Jobs management system
import { auth, db } from './firebase-init.js';
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { staffState } from './staff-system.js';
import { equipmentState, updateConsumablesDisplay } from './equipment-system.js';

// At the top, define consumables locally or import them
const consumableItems = {
  tape: { targetJob: 'packing', efficiencyBonus: 0.1, consumable: true, name: 'Packing Tape' },
  boxes: { targetJob: 'packing', efficiencyBonus: 0.15, consumable: true, name: 'Moving Boxes' },
  dolly: { targetJob: 'driver', efficiencyBonus: 0.2, consumable: false, limitedResource: true, name: 'Hand Dolly' }
};

// Job state
const jobState = {
  currentJob: null,
  progress: 0,
  intervalId: null,
  assignedJobs: {},
  recoveringEmployees: {},
  assignedJobsInterval: null,
  dollysInUse: {} // Track which employees are using dollys: { employeeId: true }
};

// Player stats (will be loaded from Firebase)
export let playerStats = {
  gold: 0,
  exp: 0,
  level: 1
};

// Job definitions
const jobs = {
  packing: {
    id: 'packing',
    name: 'Packing Job',
    duration: 10000,
    goldReward: 10,
    expReward: 5,
    injuryChance: 0.05,
    returnAfterInjury: true,
    requiredLevel: 1
  },
  driver: {
    id: 'driver',
    name: 'Help a Driver',
    duration: 30000,
    goldReward: 35,
    expReward: 18,
    injuryChance: 0.05,
    returnAfterInjury: false,
    requiredLevel: 5,
    injuryNote: '(Injuries cause the Driver to drop you off)'
  }
};

// Recovery duration
const RECOVERY_DURATION = 30000;

// Initialize jobs system
export function initJobsSystem() {
  loadPlayerStats();
  loadAssignedJobs();
  renderJobsUI();
  startAssignedJobsInterval();
}

// Check if player has employees on the books
function hasEmployeesAssigned() {
  return staffState.onTheBooks && staffState.onTheBooks.length > 0;
}

// Function to stop an employee's job (called from staff-system when unassigning)
export function stopEmployeeJob(employeeId) {
  if (jobState.assignedJobs[employeeId]) {
    delete jobState.assignedJobs[employeeId];
    saveAssignedJobs();
    renderJobsUI();
  }
  if (jobState.recoveringEmployees[employeeId]) {
    delete jobState.recoveringEmployees[employeeId];
    saveAssignedJobs();
    renderJobsUI();
  }
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
      <div id="job-list"></div>

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

      <div id="assigned-jobs-container" style="margin-top: 1.5rem;">
        <h3>Assigned Jobs</h3>
        <div id="assigned-jobs-list"></div>
      </div>

      <div id="recovering-container" style="margin-top: 1.5rem; display: none;">
        <h3>Recovering</h3>
        <div id="recovering-list"></div>
      </div>
    </div>
  `;

  renderJobList();
  renderAssignedJobs();
  renderRecoveringEmployees();
}

// Render available jobs
function renderJobList() {
  const container = document.getElementById('job-list');
  if (!container) return;

  container.innerHTML = '';

  Object.values(jobs).forEach(job => {
    const isLocked = playerStats.level < job.requiredLevel;
    
    const jobCard = document.createElement('div');
    jobCard.style.cssText = `
      background: #2a2a2a;
      border: 2px solid #3a3a3a;
      border-radius: var(--radius);
      padding: 1rem;
      margin-bottom: 0.5rem;
      cursor: ${isLocked ? 'not-allowed' : 'pointer'};
      transition: all 0.2s;
      user-select: none;
      opacity: ${isLocked ? '0.5' : '1'};
    `;

    jobCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: bold; margin-bottom: 0.3rem;">
            ${job.name}
            ${isLocked ? `<span style="color: #ff6b6b; font-size: 0.8rem; margin-left: 0.5rem;">🔒 Level ${job.requiredLevel}</span>` : ''}
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Duration: ${job.duration / 1000}s
          </div>
          ${job.injuryNote ? `<div style="font-size: 0.75rem; color: #ff9090; margin-top: 0.3rem;">${job.injuryNote}</div>` : ''}
        </div>
        <div style="text-align: right;">
          <div style="color: #ffd700; font-weight: bold;">+${job.goldReward} Gold</div>
          <div style="color: #4a9eff; font-size: 0.85rem;">+${job.expReward} EXP</div>
        </div>
      </div>
      ${!isLocked ? `
        <div style="margin-top: 0.5rem; text-align: center; font-size: 0.75rem; color: var(--text-muted);">
          💡 Click to start once • Hold 1s to assign employee
        </div>
        <div id="hold-indicator-${job.id}" style="display: none; margin-top: 0.5rem; text-align: center; color: var(--accent); font-weight: bold;">
          ⏱️ Assigning...
        </div>
      ` : ''}
    `;

    if (!isLocked) {
      let pressTimer = null;
      let isLongPress = false;

      const startPress = () => {
        isLongPress = false;
        const indicator = document.getElementById(`hold-indicator-${job.id}`);
        if (indicator) indicator.style.display = 'block';
        
        pressTimer = setTimeout(() => {
          isLongPress = true;
          openEmployeeAssignModal(job);
        }, 1000);
      };

      const endPress = () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
        const indicator = document.getElementById(`hold-indicator-${job.id}`);
        if (indicator) indicator.style.display = 'none';
        
        if (!isLongPress) {
          startJob(job);
        }
      };

      const cancelPress = () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
        const indicator = document.getElementById(`hold-indicator-${job.id}`);
        if (indicator) indicator.style.display = 'none';
        isLongPress = false;
      };

      jobCard.addEventListener('mousedown', startPress);
      jobCard.addEventListener('mouseup', endPress);
      jobCard.addEventListener('mouseleave', cancelPress);
      jobCard.addEventListener('touchstart', startPress);
      jobCard.addEventListener('touchend', endPress);

      jobCard.onmouseover = () => {
        jobCard.style.borderColor = 'var(--accent)';
        jobCard.style.transform = 'translateY(-2px)';
      };

      jobCard.onmouseout = () => {
        jobCard.style.borderColor = '#3a3a3a';
        jobCard.style.transform = 'translateY(0)';
      };
    }

    container.appendChild(jobCard);
  });
}

// Open modal to assign employee to job
function openEmployeeAssignModal(job) {
  if (staffState.onTheBooks.length === 0) {
    showFeedback('No employees on the books!', 'error');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Assign Employee to ${job.name}</h3>
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">
        This employee will work on this job indefinitely
      </p>
      <div class="employee-list" id="modal-employee-list"></div>
      <div class="modal-buttons">
        <button onclick="this.closest('.modal').remove()">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const listContainer = modal.querySelector('#modal-employee-list');
  staffState.onTheBooks.forEach((emp) => {
    const isAssigned = Object.keys(jobState.assignedJobs).includes(emp.id);
    const isRecovering = Object.keys(jobState.recoveringEmployees).includes(emp.id);
    
    const card = document.createElement('div');
    card.className = 'employee-card';
    card.style.cssText = (isAssigned || isRecovering) ? 'opacity: 0.5; cursor: not-allowed;' : 'cursor: pointer;';
    
    card.innerHTML = `
      <div class="card-header">
        <div class="card-icon">${emp.icon}</div>
        <div class="card-name">${emp.name}</div>
      </div>
      <div class="card-stats">Efficiency: ${emp.efficiency}x</div>
      ${isAssigned ? '<div style="color: var(--accent); font-size: 0.8rem;">Already Assigned</div>' : ''}
      ${isRecovering ? '<div style="color: #ff6b6b; font-size: 0.8rem;">Recovering</div>' : ''}
    `;

    if (!isAssigned && !isRecovering) {
      card.onclick = () => {
        assignEmployeeToJob(emp, job);
        modal.remove();
      };
    }

    listContainer.appendChild(card);
  });

  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
}

// Assign employee to work on job indefinitely
function assignEmployeeToJob(employee, job) {
  // Check if this is a driver job and needs a dolly
  if (job.id === 'driver') {
    const dollysOwned = equipmentState.consumables['dolly'] || 0;
    const dollysInUse = Object.keys(jobState.dollysInUse).length;
    const dollysAvailable = dollysOwned - dollysInUse;
    
    if (dollysAvailable > 0) {
      // Assign dolly to this employee
      jobState.dollysInUse[employee.id] = true;
    } else {
      // No dollys available, can still work but without buff
      showFeedback(`${employee.name} assigned to ${job.name} (no dolly available - reduced efficiency)`, 'error');
    }
  }
  
  jobState.assignedJobs[employee.id] = {
    jobId: job.id,
    startTime: Date.now(),
    employeeName: employee.name,
    employeeIcon: employee.icon,
    efficiency: employee.efficiency
  };

  saveAssignedJobs();
  renderAssignedJobs();
  showFeedback(`${employee.name} assigned to ${job.name}!`);
}

// Render assigned jobs
function renderAssignedJobs() {
  const container = document.getElementById('assigned-jobs-list');
  if (!container) return;

  const assignedCount = Object.keys(jobState.assignedJobs).length;
  
  if (assignedCount === 0) {
    container.innerHTML = '<p style="opacity: 0.6; font-size: 0.9rem;">No assigned jobs</p>';
    return;
  }

  container.innerHTML = '';

  Object.entries(jobState.assignedJobs).forEach(([employeeId, assignment]) => {
    const job = jobs[assignment.jobId];
    if (!job) return;

    // Calculate equipment bonus for this job
    let equipmentBonus = 0;
    let itemsAvailable = [];
    
    Object.entries(consumableItems).forEach(([itemId, item]) => {
      if (item.targetJob === assignment.jobId) {
        if (item.limitedResource) {
          // Check if this employee is using a dolly
          if (jobState.dollysInUse[employeeId]) {
            equipmentBonus += item.efficiencyBonus;
            itemsAvailable.push(`${item.name} 🛒`);
          }
        } else if (item.consumable && equipmentState.consumables[itemId] > 0) {
          equipmentBonus += item.efficiencyBonus;
          itemsAvailable.push(`${item.name} (${equipmentState.consumables[itemId]})`);
        }
      }
    });
    
    const totalEfficiency = assignment.efficiency + equipmentBonus;

    const card = document.createElement('div');
    card.style.cssText = `
      background: #2a2a2a;
      border: 2px solid var(--accent);
      border-radius: var(--radius);
      padding: 1rem;
      margin-bottom: 0.5rem;
    `;

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
            <span style="font-size: 1.2rem;">${assignment.employeeIcon}</span>
            <span style="font-weight: bold;">${assignment.employeeName}</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Working on ${job.name}
          </div>
          <div style="font-size: 0.75rem; color: var(--accent); margin-top: 0.3rem;">
            ⚙️ Running indefinitely (${totalEfficiency.toFixed(2)}x total efficiency)
          </div>
          ${itemsAvailable.length > 0 ? `
            <div style="font-size: 0.7rem; color: #90ee90; margin-top: 0.2rem;">
              📦 Using: ${itemsAvailable.join(', ')}
            </div>
          ` : ''}
        </div>
        <button onclick="window.unassignJob('${employeeId}')" style="padding: 0.5rem 1rem; margin: 0; background: #d9534f; color: white;">
          Stop
        </button>
      </div>
    `;

    container.appendChild(card);
  });
  
  // Show dolly availability
  if (equipmentState.consumables['dolly'] > 0) {
    const dollysOwned = equipmentState.consumables['dolly'];
    const dollysInUse = Object.keys(jobState.dollysInUse).length;
    const dollysAvailable = dollysOwned - dollysInUse;
    
    const dollyInfo = document.createElement('div');
    dollyInfo.style.cssText = `
      background: #2a2a2a;
      padding: 0.5rem;
      border-radius: var(--radius);
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 0.5rem;
    `;
    dollyInfo.innerHTML = `🛒 Dollys: ${dollysAvailable}/${dollysOwned} available`;
    
    container.appendChild(dollyInfo);
  }
}

// Render recovering employees
function renderRecoveringEmployees() {
  const container = document.getElementById('recovering-list');
  const section = document.getElementById('recovering-container');
  if (!container || !section) return;

  const recoveringCount = Object.keys(jobState.recoveringEmployees).length;
  
  if (recoveringCount === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  container.innerHTML = '';

  Object.entries(jobState.recoveringEmployees).forEach(([employeeId, recovery]) => {
    const job = recovery.previousJobId ? jobs[recovery.previousJobId] : null;

    const elapsed = Date.now() - recovery.startTime;
    const progress = Math.min((elapsed / RECOVERY_DURATION) * 100, 100);
    const remainingSeconds = Math.ceil((RECOVERY_DURATION - elapsed) / 1000);

    const card = document.createElement('div');
    card.style.cssText = `
      background: #2a2a2a;
      border: 2px solid #ff6b6b;
      border-radius: var(--radius);
      padding: 1rem;
      margin-bottom: 0.5rem;
    `;

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
            <span style="font-size: 1.2rem;">${recovery.employeeIcon}</span>
            <span style="font-weight: bold;">${recovery.employeeName}</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            🤕 Injured ${job ? `from ${job.name}` : ''}
          </div>
          ${recovery.previousJobId ? 
            '<div style="font-size: 0.75rem; color: var(--accent); margin-top: 0.2rem;">Will return to work after recovery</div>' :
            '<div style="font-size: 0.75rem; color: #ff9090; margin-top: 0.2rem;">Will not return to previous job</div>'
          }
        </div>
        <div style="text-align: right; color: #ff6b6b;">
          <div style="font-size: 0.9rem;">${remainingSeconds}s</div>
        </div>
      </div>
      <div style="background: #1a1a1a; height: 8px; border-radius: 4px; overflow: hidden;">
        <div style="background: #ff6b6b; height: 100%; width: ${progress}%;"></div>
      </div>
    `;

    container.appendChild(card);
  });
}

// Unassign job
window.unassignJob = function(employeeId) {
  const assignment = jobState.assignedJobs[employeeId];
  if (assignment) {
    // Free up dolly if this employee was using one
    if (jobState.dollysInUse[employeeId]) {
      delete jobState.dollysInUse[employeeId];
    }
    
    delete jobState.assignedJobs[employeeId];
    saveAssignedJobs();
    renderAssignedJobs();
    renderRecoveringEmployees();
    showFeedback(`${assignment.employeeName} unassigned from job`);
  }
};

// Start interval to check assigned jobs and award rewards in real-time
function startAssignedJobsInterval() {
  if (jobState.assignedJobsInterval) {
    clearInterval(jobState.assignedJobsInterval);
  }

  jobState.assignedJobsInterval = setInterval(() => {
    processAssignedJobs();
    processRecovering();
    renderRecoveringEmployees();
  }, 1000);
}

// Process assigned jobs and award rewards
function processAssignedJobs() {
  const now = Date.now();
  let totalGold = 0;
  let totalExp = 0;
  let anyCompleted = false;

  Object.entries(jobState.assignedJobs).forEach(([employeeId, assignment]) => {
    const job = jobs[assignment.jobId];
    if (!job) return;

    const elapsed = now - assignment.startTime;
    
    if (elapsed >= job.duration) {
      // Calculate equipment bonus
      let equipmentBonus = 0;
      let usedItems = [];
      let itemsConsumed = false;
      
      Object.entries(consumableItems).forEach(([itemId, item]) => {
        if (item.targetJob === assignment.jobId) {
          // For limited resources (dolly), check if this employee is using one
          if (item.limitedResource) {
            if (jobState.dollysInUse[employeeId]) {
              equipmentBonus += item.efficiencyBonus;
            }
          } 
          // For consumables, check if we have any and consume them
          else if (item.consumable && equipmentState.consumables[itemId] > 0) {
            equipmentBonus += item.efficiencyBonus;
            equipmentState.consumables[itemId]--;
            usedItems.push(item.name);
            itemsConsumed = true;
          }
        }
      });
      
      // Save and update display if items were consumed
      if (itemsConsumed) {
        saveEquipmentState();
        updateConsumablesDisplay();
      }
      
      // Check for injury
      if (Math.random() < job.injuryChance) {
        // Free up dolly if injured
        if (jobState.dollysInUse[employeeId]) {
          delete jobState.dollysInUse[employeeId];
        }
        
        jobState.recoveringEmployees[employeeId] = {
          previousJobId: job.returnAfterInjury ? assignment.jobId : null,
          startTime: now,
          employeeName: assignment.employeeName,
          employeeIcon: assignment.employeeIcon,
          efficiency: assignment.efficiency
        };
        
        delete jobState.assignedJobs[employeeId];
        
        showFeedback(`🤕 ${assignment.employeeName} was injured and is recovering!`, 'error');
        saveAssignedJobs();
        renderAssignedJobs();
        renderRecoveringEmployees();
        return;
      }
      
      // Calculate total efficiency
      const totalEfficiency = assignment.efficiency + equipmentBonus;
      
      // Award rewards
      const gold = job.goldReward * totalEfficiency;
      const exp = job.expReward;
      
      totalGold += gold;
      totalExp += exp;
      anyCompleted = true;

      assignment.startTime = now;
    }
  });

  if (anyCompleted) {
    playerStats.gold += Math.floor(totalGold);
    playerStats.exp += Math.floor(totalExp);

    let leveledUp = false;
    while (playerStats.exp >= playerStats.level * 20) {
      playerStats.exp -= playerStats.level * 20;
      playerStats.level++;
      leveledUp = true;
    }

    updateStatsDisplay();
    savePlayerStats();
    saveAssignedJobs();
    renderAssignedJobs();

    if (leveledUp) {
      showFeedback(`🎉 Level Up! Now Level ${playerStats.level}!`);
      renderJobList();
    }
  }
}




// Process recovering employees
function processRecovering() {
  const now = Date.now();

  Object.entries(jobState.recoveringEmployees).forEach(([employeeId, recovery]) => {
    const elapsed = now - recovery.startTime;
    
    if (elapsed >= RECOVERY_DURATION) {
      if (recovery.previousJobId) {
        jobState.assignedJobs[employeeId] = {
          jobId: recovery.previousJobId,
          startTime: now,
          employeeName: recovery.employeeName,
          employeeIcon: recovery.employeeIcon,
          efficiency: recovery.efficiency
        };
        showFeedback(`✅ ${recovery.employeeName} has recovered and returned to work!`);
      } else {
        showFeedback(`✅ ${recovery.employeeName} has recovered!`);
      }
      
      delete jobState.recoveringEmployees[employeeId];
      
      saveAssignedJobs();
      renderAssignedJobs();
      renderRecoveringEmployees();
    }
  });
}

// Calculate offline progress
function calculateOfflineProgress() {
  const now = Date.now();
  let totalGold = 0;
  let totalExp = 0;
  let completedJobs = 0;

  Object.entries(jobState.assignedJobs).forEach(([employeeId, assignment]) => {
    const job = jobs[assignment.jobId];
    if (!job) return;

    const elapsed = now - assignment.startTime;
    const jobsCompleted = Math.floor(elapsed / job.duration);
    
    if (jobsCompleted > 0) {
      totalGold += jobsCompleted * job.goldReward * assignment.efficiency;
      totalExp += jobsCompleted * job.expReward;
      completedJobs += jobsCompleted;

      assignment.startTime = now - (elapsed % job.duration);
    }
  });

  Object.entries(jobState.recoveringEmployees).forEach(([employeeId, recovery]) => {
    const elapsed = now - recovery.startTime;
    
    if (elapsed >= RECOVERY_DURATION) {
      if (recovery.previousJobId) {
        jobState.assignedJobs[employeeId] = {
          jobId: recovery.previousJobId,
          startTime: now,
          employeeName: recovery.employeeName,
          employeeIcon: recovery.employeeIcon,
          efficiency: recovery.efficiency
        };
      }
      delete jobState.recoveringEmployees[employeeId];
    }
  });

  if (completedJobs > 0) {
    playerStats.gold += Math.floor(totalGold);
    playerStats.exp += Math.floor(totalExp);

    let leveledUp = false;
    while (playerStats.exp >= playerStats.level * 20) {
      playerStats.exp -= playerStats.level * 20;
      playerStats.level++;
      leveledUp = true;
    }

    savePlayerStats();
    saveAssignedJobs();

    showFeedback(`Offline Progress: ${completedJobs} jobs completed! +${Math.floor(totalGold)} Gold, +${Math.floor(totalExp)} EXP${leveledUp ? ', Level Up!' : ''}`);
  }
}

// Start a job
function startJob(job) {
  if (jobState.currentJob) {
    showFeedback('A job is already in progress!', 'error');
    return;
  }

  if (!hasEmployeesAssigned()) {
    showFeedback('You need to assign employees first!', 'error');
    renderJobsUI();
    return;
  }

  jobState.currentJob = job;
  jobState.progress = 0;

  document.getElementById('job-list').style.display = 'none';
  const activeContainer = document.getElementById('active-job-container');
  activeContainer.style.display = 'block';
  document.getElementById('active-job-name').textContent = job.name;

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
  if (jobState.intervalId) {
    clearInterval(jobState.intervalId);
    jobState.intervalId = null;
  }

  playerStats.gold += job.goldReward;
  playerStats.exp += job.expReward;

  let leveledUp = false;
  const expNeeded = playerStats.level * 20;
  if (playerStats.exp >= expNeeded) {
    playerStats.level++;
    playerStats.exp -= expNeeded;
    leveledUp = true;
  }

  savePlayerStats();

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

  jobState.currentJob = null;
  jobState.progress = 0;

  setTimeout(() => {
    renderJobsUI();
  }, 1000);
}

// Update stats display
export function updateStatsDisplay() {
  const goldEl = document.getElementById('player-gold');
  const expEl = document.getElementById('player-exp');
  const levelEl = document.getElementById('player-level');

  if (goldEl) goldEl.textContent = playerStats.gold;
  if (expEl) expEl.textContent = playerStats.exp;
  if (levelEl) levelEl.textContent = playerStats.level;
}

// Show inline feedback message
function showFeedback(message, type = 'success') {
  const container = document.getElementById('jobs-content');
  if (!container) return;
  
  const feedback = document.createElement('div');
  feedback.style.cssText = `
    background: ${type === 'success' ? '#2a5a2a' : '#5a2a2a'};
    color: ${type === 'success' ? '#90ee90' : '#ff9090'};
    padding: 0.5rem;
    border-radius: var(--radius);
    margin: 0.5rem 1rem;
    text-align: center;
    animation: fadeIn 0.3s;
  `;
  feedback.textContent = message;
  container.insertBefore(feedback, container.firstChild);

  setTimeout(() => {
    feedback.style.animation = 'fadeOut 0.3s';
    setTimeout(() => feedback.remove(), 300);
  }, 3000);
}

// Save equipment state (called when consuming items)
async function saveEquipmentState() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await updateDoc(doc(db, "players", user.uid), {
      'equipmentData.consumables': equipmentState.consumables
    });
  } catch (err) {
    console.error("Error saving equipment state:", err);
  }
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

    updateStatsDisplay();
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

      updateStatsDisplay();
    }
  } catch (err) {
    console.error("Error loading player stats:", err);
  }
}

// Save assigned jobs and recovering employees
async function saveAssignedJobs() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await updateDoc(doc(db, "players", user.uid), {
      assignedJobs: jobState.assignedJobs,
      recoveringEmployees: jobState.recoveringEmployees,
      dollysInUse: jobState.dollysInUse
    });
  } catch (err) {
    console.error("Error saving assigned jobs:", err);
  }
}

// Load assigned jobs and recovering employees
async function loadAssignedJobs() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const snapshot = await getDoc(doc(db, "players", user.uid));
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data.assignedJobs) {
        jobState.assignedJobs = data.assignedJobs;
      }
      if (data.recoveringEmployees) {
        jobState.recoveringEmployees = data.recoveringEmployees;
      }
      if (data.dollysInUse) {
        jobState.dollysInUse = data.dollysInUse;
      }
      calculateOfflineProgress();
    }
  } catch (err) {
    console.error("Error loading assigned jobs:", err);
  }
}

// Re-render when switching to jobs tab
export function refreshJobsUI() {
  renderJobsUI();
}