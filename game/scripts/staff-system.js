// Staff management system
import { auth, db } from './firebase-init.js';
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// Game state
const staffState = {
  activeSlots: 1, // Number of "on the books" slots
  onTheBooks: [], // Employee IDs currently active
  availableEmployees: [], // Employees owned but not assigned
  jobSeekers: [
    {
      id: 'default_1',
      name: 'John Doe',
      icon: '👤',
      efficiency: 1.0,
      cost: 0
    }
  ]
};

// Initialize staff system
export function initStaffSystem() {
  renderActiveSlots();
  renderJobSeekers();
  loadStaffData();
}

// Render active employee slots
function renderActiveSlots() {
  const container = document.getElementById('active-slots');
  container.innerHTML = '';

  for (let i = 0; i < staffState.activeSlots; i++) {
    const slot = document.createElement('div');
    slot.className = 'employee-slot';
    
    const employee = staffState.onTheBooks[i];
    
    if (employee) {
      slot.classList.add('filled');
      slot.innerHTML = `
        <div class="slot-icon">${employee.icon}</div>
        <div class="slot-label">${employee.name}</div>
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

  staffState.jobSeekers.forEach((seeker) => {
    const card = createEmployeeCard(seeker, 'seeker');
    container.appendChild(card);
  });
}

// Create employee card element
function createEmployeeCard(employee, type) {
  const card = document.createElement('div');
  card.className = `employee-card ${type === 'available' ? 'available' : ''}`;
  
  card.innerHTML = `
    <div class="card-header">
      <div class="card-icon">${employee.icon}</div>
      <div class="card-name">${employee.name}</div>
    </div>
    <div class="card-stats">Efficiency: ${employee.efficiency}x</div>
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

// Hire employee from job seekers
window.hireEmployee = function(employeeId) {
  const seeker = staffState.jobSeekers.find(s => s.id === employeeId);
  if (!seeker) return;

  // Remove from job seekers
  staffState.jobSeekers = staffState.jobSeekers.filter(s => s.id !== employeeId);

  // Add to available employees
  staffState.availableEmployees.push({
    id: seeker.id,
    name: seeker.name,
    icon: seeker.icon,
    efficiency: seeker.efficiency
  });

  // Re-render
  renderJobSeekers();
  renderAvailableEmployees();
  saveStaffData();

  alert(`${seeker.name} hired successfully!`);
};

// Open modal to assign employee to slot
function openAssignModal(slotIndex) {
  if (staffState.availableEmployees.length === 0) {
    alert('No available employees to assign. Hire someone first!');
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
}

// Unassign employee from active slot
function unassignEmployee(slotIndex) {
  const employee = staffState.onTheBooks[slotIndex];
  if (!employee) return;

  const confirm = window.confirm(`Unassign ${employee.name}?`);
  if (!confirm) return;

  // Remove from active
  staffState.onTheBooks.splice(slotIndex, 1);

  // Add back to available
  staffState.availableEmployees.push(employee);

  // Re-render
  renderActiveSlots();
  renderAvailableEmployees();
  saveStaffData();
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
        jobSeekers: staffState.jobSeekers
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

        renderActiveSlots();
        renderAvailableEmployees();
        renderJobSeekers();
      }
    }
  } catch (err) {
    console.error("Error loading staff data:", err);
  }
}