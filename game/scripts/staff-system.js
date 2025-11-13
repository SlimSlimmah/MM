// Staff management system
import { auth, db } from './firebase-init.js';
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { stopEmployeeJob } from './jobs-system.js';

// Employee rarities with efficiency ranges
const rarities = {
  common: {
    name: 'Common',
    color: '#b0b0b0',
    weight: 50,
    efficiencyMin: 0.9,
    efficiencyMax: 1.1
  },
  uncommon: {
    name: 'Uncommon',
    color: '#5cb85c',
    weight: 30,
    efficiencyMin: 1.0,
    efficiencyMax: 1.2
  },
  rare: {
    name: 'Rare',
    color: '#5bc0de',
    weight: 15,
    efficiencyMin: 1.15,
    efficiencyMax: 1.35
  },
  legendary: {
    name: 'Legendary',
    color: '#f0ad4e',
    weight: 5,
    efficiencyMin: 1.4,
    efficiencyMax: 1.6
  }
};

// Employee name pool
const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa', 'Tom', 'Anna', 'Ryan', 'Kate', 'Alex', 'Mia', 'Sam'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor'];

// Game state
export const staffState = {
  activeSlots: 1,
  onTheBooks: [],
  availableEmployees: [],
  jobSeekers: [
    {
      id: 'default_1',
      name: 'John Doe',
      icon: '👤',
      efficiency: 1.0,
      cost: 0,
      rarity: 'common'
    }
  ],
  nextRefreshTime: Date.now() + (5 * 60 * 1000), // 5 minutes from now
  refreshInterval: null,
  slotCost: 1000
};

// Initialize staff system
export async function initStaffSystem() {
  await loadStaffData();
  
  // If this is a fresh account with only the default employee, populate with 3
  if (staffState.jobSeekers.length === 1 && staffState.jobSeekers[0].id === 'default_1') {
    refreshJobSeekers();
  }
  
  renderActiveSlots();
  renderJobSeekers();
  renderAvailableEmployees();
  startRefreshTimer();
}

// Generate a random rarity based on weights
function getRandomRarity() {
  const totalWeight = Object.values(rarities).reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [key, rarity] of Object.entries(rarities)) {
    random -= rarity.weight;
    if (random <= 0) return key;
  }
  
  return 'common';
}

// Generate a random employee
function generateEmployee() {
  const rarityKey = getRandomRarity();
  const rarity = rarities[rarityKey];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const efficiency = parseFloat((Math.random() * (rarity.efficiencyMax - rarity.efficiencyMin) + rarity.efficiencyMin).toFixed(2));
  
  // Cost based on rarity
  const baseCost = {
    common: 50,
    uncommon: 150,
    rare: 400,
    legendary: 1000
  };
  
  const icons = ['👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '🧑‍💼', '👷', '👨‍🔧', '👩‍🔧'];
  
  return {
    id: 'emp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name: `${firstName} ${lastName}`,
    icon: icons[Math.floor(Math.random() * icons.length)],
    efficiency: efficiency,
    cost: baseCost[rarityKey],
    rarity: rarityKey
  };
}

// Refresh job seekers
function refreshJobSeekers() {
  // Keep default employee if it's still there
  const defaultEmp = staffState.jobSeekers.find(s => s.id === 'default_1');
  
  staffState.jobSeekers = [];
  
  // If default employee hasn't been hired yet, include it
  if (defaultEmp) {
    staffState.jobSeekers.push(defaultEmp);
    // Generate 2 more to make 3 total
    for (let i = 0; i < 2; i++) {
      staffState.jobSeekers.push(generateEmployee());
    }
  } else {
    // Generate 3 new employees
    for (let i = 0; i < 3; i++) {
      staffState.jobSeekers.push(generateEmployee());
    }
  }
  
  // Set next refresh time
  staffState.nextRefreshTime = Date.now() + (5 * 60 * 1000);
  
  saveStaffData();
  renderJobSeekers();
}

// Start the refresh timer
function startRefreshTimer() {
  // Clear any existing interval
  if (staffState.refreshInterval) {
    clearInterval(staffState.refreshInterval);
  }
  
  // Update timer every second
  staffState.refreshInterval = setInterval(() => {
    updateRefreshTimer();
    
    // Check if it's time to refresh
    if (Date.now() >= staffState.nextRefreshTime) {
      refreshJobSeekers();
    }
  }, 1000);
}

// Update the refresh timer display
function updateRefreshTimer() {
  const timerEl = document.getElementById('refresh-timer');
  if (!timerEl) return;
  
  const remaining = Math.max(0, staffState.nextRefreshTime - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Render active employee slots
function renderActiveSlots() {
  const container = document.getElementById('active-slots');
  container.innerHTML = '';

  // Render filled slots
  for (let i = 0; i < staffState.activeSlots; i++) {
    const slot = document.createElement('div');
    slot.className = 'employee-slot';
    
    const employee = staffState.onTheBooks[i];
    
    if (employee) {
      slot.classList.add('filled');
      const rarity = rarities[employee.rarity] || rarities.common;
      slot.style.borderColor = rarity.color;
      slot.innerHTML = `
        <div class="slot-icon">${employee.icon}</div>
        <div class="slot-label">${employee.name}</div>
        <div style="font-size: 0.7rem; color: ${rarity.color};">${employee.efficiency.toFixed(2)}x</div>
      `;
      slot.onclick = () => unassignEmployee(i);
    } else {
      slot.innerHTML = `
        <div class="slot-icon">➕</div>
        <div class="slot-label">Empty Slot</div>
      `;
      slot.onclick = () => openAssignModal(i);
    }
    
    container.appendChild(slot);
  }
  
  // Render purchaseable slot
  const purchaseSlot = document.createElement('div');
  purchaseSlot.className = 'employee-slot purchase-slot';
  purchaseSlot.innerHTML = `
    <div class="slot-icon">🔒</div>
    <div class="slot-label">Buy Slot</div>
    <div style="font-size: 0.8rem; color: #ffd700; margin-top: 0.3rem;">$${staffState.slotCost}</div>
  `;
  purchaseSlot.onclick = () => purchaseSlot_func();
  container.appendChild(purchaseSlot);
}

// Purchase a new slot
window.purchaseSlot_func = async function() {
  // Get current gold
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const snapshot = await getDoc(doc(db, "players", user.uid));
    const playerData = snapshot.data();
    const currentGold = playerData.gold || 0;
    
    if (currentGold < staffState.slotCost) {
      showFeedback(`Not enough gold! Need $${staffState.slotCost}`, 'error');
      return;
    }
    
    // Deduct gold
    const newGold = currentGold - staffState.slotCost;
    await updateDoc(doc(db, "players", user.uid), { gold: newGold });
    
    // Add slot
    staffState.activeSlots++;
    
    // Double the cost for next slot
    staffState.slotCost *= 2;
    
    // Save and re-render
    saveStaffData();
    renderActiveSlots();
    
    showFeedback(`Slot purchased! Next slot costs $${staffState.slotCost}`);
    
    // Update gold display everywhere
    updateAllGoldDisplays(newGold);
    
  } catch (err) {
    console.error("Error purchasing slot:", err);
    showFeedback('Error purchasing slot', 'error');
  }
};

// Helper function to update gold display everywhere
function updateAllGoldDisplays(gold) {
  const goldEl = document.getElementById('player-gold');
  if (goldEl) goldEl.textContent = gold;
}

// Render available employees
function renderAvailableEmployees() {
  const container = document.getElementById('available-employees');
  
  if (staffState.availableEmployees.length === 0) {
    container.innerHTML = '<p style="opacity: 0.6; font-size: 0.9rem;">No employees available</p>';
    return;
  }

  container.innerHTML = '';
  staffState.availableEmployees.forEach((emp) => {
    const card = createEmployeeCard(emp, 'available');
    container.appendChild(card);
  });
}

// Render job seekers
function renderJobSeekers() {
  const container = document.getElementById('job-seekers');
  container.innerHTML = '';
  
  // Add refresh timer - matching employee card width
  const timerDiv = document.createElement('div');
  timerDiv.className = 'employee-card';
  timerDiv.style.cssText = `
    background: #2a2a2a;
    border: 2px solid #3a3a3a;
    padding: 0.8rem;
    text-align: center;
    font-size: 0.9rem;
    width: 140px;
  `;
  timerDiv.innerHTML = `
    <div style="color: var(--text-muted); margin-bottom: 0.3rem;">Next Refresh</div>
    <div id="refresh-timer" style="color: var(--accent); font-weight: bold; font-size: 1.1rem;">5:00</div>
  `;
  container.appendChild(timerDiv);

  staffState.jobSeekers.forEach((seeker) => {
    const card = createEmployeeCard(seeker, 'seeker');
    container.appendChild(card);
  });
  
  updateRefreshTimer();
}

// Create employee card element
function createEmployeeCard(employee, type) {
  const card = document.createElement('div');
  card.className = `employee-card ${type === 'available' ? 'available' : ''}`;
  
  const rarity = rarities[employee.rarity] || rarities.common;
  if (type === 'seeker') {
    card.style.borderColor = rarity.color;
  }
  
  card.innerHTML = `
    <div class="card-header">
      <div class="card-icon">${employee.icon}</div>
      <div class="card-name">${employee.name}</div>
    </div>
    <div style="color: ${rarity.color}; font-size: 0.75rem; margin: 0.2rem 0;">${rarity.name}</div>
    <div class="card-stats">Efficiency: ${employee.efficiency.toFixed(2)}x</div>
    ${type === 'seeker' ? `
      <div class="card-price">${employee.cost === 0 ? 'FREE' : `$${employee.cost}`}</div>
      <button onclick="window.hireEmployee('${employee.id}')">Hire</button>
    ` : ''}
  `;

  if (type === 'available') {
    card.onclick = () => {
      // This will be handled by the assign modal
    };
  }

  return card;
}

// Show inline feedback message
function showFeedback(message, type = 'success') {
  const container = document.getElementById('active-slots').parentElement;
  const feedback = document.createElement('div');
  feedback.style.cssText = `
    background: ${type === 'success' ? '#2a5a2a' : '#5a2a2a'};
    color: ${type === 'success' ? '#90ee90' : '#ff9090'};
    padding: 0.5rem;
    border-radius: var(--radius);
    margin: 0.5rem 0;
    text-align: center;
    animation: fadeIn 0.3s;
  `;
  feedback.textContent = message;
  container.insertBefore(feedback, container.firstChild);

  setTimeout(() => {
    feedback.style.animation = 'fadeOut 0.3s';
    setTimeout(() => feedback.remove(), 300);
  }, 2000);
}

// Hire employee from job seekers
window.hireEmployee = async function(employeeId) {
  const seeker = staffState.jobSeekers.find(s => s.id === employeeId);
  if (!seeker) return;
  
  // Check if player has enough gold
  if (seeker.cost > 0) {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      const snapshot = await getDoc(doc(db, "players", user.uid));
      const playerData = snapshot.data();
      const currentGold = playerData.gold || 0;
      
      if (currentGold < seeker.cost) {
        showFeedback(`Not enough gold! Need $${seeker.cost}`, 'error');
        return;
      }
      
      // Deduct gold
      const newGold = currentGold - seeker.cost;
      await updateDoc(doc(db, "players", user.uid), { gold: newGold });
      
      // Update gold display everywhere
      updateAllGoldDisplays(newGold);
      
    } catch (err) {
      console.error("Error checking gold:", err);
      showFeedback('Error hiring employee', 'error');
      return;
    }
  }

  // Remove from job seekers
  staffState.jobSeekers = staffState.jobSeekers.filter(s => s.id !== employeeId);

  // Add to available employees
  staffState.availableEmployees.push({
    id: seeker.id,
    name: seeker.name,
    icon: seeker.icon,
    efficiency: seeker.efficiency,
    rarity: seeker.rarity
  });

  // Re-render
  renderJobSeekers();
  renderAvailableEmployees();
  saveStaffData();

  showFeedback(`${seeker.name} hired successfully!`);
  
  // If this was the last job seeker, or if default was just hired, refresh the list
  if (staffState.jobSeekers.length === 0 || employeeId === 'default_1') {
    refreshJobSeekers();
  }
};

// Open modal to assign employee to slot
function openAssignModal(slotIndex) {
  if (staffState.availableEmployees.length === 0) {
    showFeedback('No available employees to assign. Hire someone first!', 'error');
    return;
  }

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Select Employee</h3>
      <div class="employee-list" id="modal-employee-list"></div>
      <div class="modal-buttons">
        <button onclick="this.closest('.modal').remove()">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const listContainer = modal.querySelector('#modal-employee-list');
  staffState.availableEmployees.forEach((emp, index) => {
    const card = createEmployeeCard(emp, 'available');
    card.onclick = () => {
      assignEmployee(slotIndex, index);
      modal.remove();
    };
    listContainer.appendChild(card);
  });

  // Close modal when clicking outside
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
}

// Assign employee to active slot
function assignEmployee(slotIndex, availableIndex) {
  const employee = staffState.availableEmployees[availableIndex];
  
  // Remove from available
  staffState.availableEmployees.splice(availableIndex, 1);
  
  // Add to active slot
  staffState.onTheBooks[slotIndex] = employee;

  // Re-render
  renderActiveSlots();
  renderAvailableEmployees();
  saveStaffData();
  
  showFeedback(`${employee.name} assigned to work!`);
}

// Unassign employee from active slot
function unassignEmployee(slotIndex) {
  const employee = staffState.onTheBooks[slotIndex];
  if (!employee) return;

  // Stop any assigned job or recovery for this employee
  stopEmployeeJob(employee.id);

  // Remove from active
  staffState.onTheBooks.splice(slotIndex, 1);

  // Add back to available
  staffState.availableEmployees.push(employee);

  // Re-render
  renderActiveSlots();
  renderAvailableEmployees();
  saveStaffData();
  
  showFeedback(`${employee.name} unassigned`);
}

// Save staff data to Firestore
async function saveStaffData() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await updateDoc(doc(db, "players", user.uid), {
      staffData: {
        activeSlots: staffState.activeSlots,
        onTheBooks: staffState.onTheBooks,
        availableEmployees: staffState.availableEmployees,
        jobSeekers: staffState.jobSeekers,
        nextRefreshTime: staffState.nextRefreshTime,
        slotCost: staffState.slotCost
      }
    });
  } catch (err) {
    console.error("Error saving staff data:", err);
  }
}

// Load staff data from Firestore
async function loadStaffData() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const snapshot = await getDoc(doc(db, "players", user.uid));
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data.staffData) {
        staffState.activeSlots = data.staffData.activeSlots || 1;
        staffState.onTheBooks = data.staffData.onTheBooks || [];
        staffState.availableEmployees = data.staffData.availableEmployees || [];
        staffState.jobSeekers = data.staffData.jobSeekers || staffState.jobSeekers;
        staffState.nextRefreshTime = data.staffData.nextRefreshTime || Date.now() + (5 * 60 * 1000);
        staffState.slotCost = data.staffData.slotCost || 1000;

        renderActiveSlots();
        renderAvailableEmployees();
        renderJobSeekers();
        
        // Check if refresh time has passed
        if (Date.now() >= staffState.nextRefreshTime) {
          refreshJobSeekers();
        }
      }
    }
  } catch (err) {
    console.error("Error loading staff data:", err);
  }
}