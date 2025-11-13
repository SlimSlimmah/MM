// Equipment management system
import { auth, db } from './firebase-init.js';
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { updateStatsDisplay, playerStats } from './jobs-system.js';

// Truck rarities with efficiency ranges
const truckRarities = {
  common: {
    name: 'Common',
    color: '#b0b0b0',
    weight: 50,
    efficiencyMin: 1.0,
    efficiencyMax: 1.2
  },
  uncommon: {
    name: 'Uncommon',
    color: '#5cb85c',
    weight: 30,
    efficiencyMin: 1.15,
    efficiencyMax: 1.35
  },
  rare: {
    name: 'Rare',
    color: '#5bc0de',
    weight: 15,
    efficiencyMin: 1.3,
    efficiencyMax: 1.5
  },
  legendary: {
    name: 'Legendary',
    color: '#f0ad4e',
    weight: 5,
    efficiencyMin: 1.45,
    efficiencyMax: 1.7
  }
};

// Truck name parts
const truckBrands = ['Ford', 'Chevy', 'Ram', 'GMC', 'Mercedes', 'Isuzu', 'Freightliner'];
const truckModels = ['Express', 'Sprinter', 'Transit', 'ProMaster', 'Savana', 'Cargo', 'Box Truck'];

// Consumable definitions
const consumables = {
  tape: {
    id: 'tape',
    name: 'Packing Tape',
    icon: '📦',
    description: 'Secure boxes efficiently',
    buff: '+0.1x efficiency for Packing Job',
    cost: 5,
    targetJob: 'packing',
    efficiencyBonus: 0.1,
    consumable: true
  },
  boxes: {
    id: 'boxes',
    name: 'Moving Boxes',
    icon: '📦',
    description: 'Professional moving boxes',
    buff: '+0.15x efficiency for Packing Job',
    cost: 10,
    targetJob: 'packing',
    efficiencyBonus: 0.15,
    consumable: true
  },
  dolly: {
    id: 'dolly',
    name: 'Hand Dolly',
    icon: '🛒',
    description: 'Move heavy items easier (permanent)',
    buff: '+0.2x efficiency for Help a Driver',
    cost: 500,
    targetJob: 'driver',
    efficiencyBonus: 0.2,
    consumable: false
  }
};

// Equipment state
export const equipmentState = {
  consumables: {
    tape: 0,
    boxes: 0,
    dolly: 0
  },
  ownedTrucks: [],
  availableTrucks: [],
  nextTruckRefresh: Date.now() + (5 * 60 * 1000),
  refreshInterval: null,
  purchaseQuantities: {
    tape: 1,
    boxes: 1,
    dolly: 1
  }
};

// Initialize equipment system
export async function initEquipmentSystem() {
  await loadEquipmentData();
  renderConsumablesInventory();
  renderConsumablesShop();
  renderOwnedTrucks();
  renderAvailableTrucks();
  startTruckRefreshTimer();
}

// Generate a random truck rarity
function getRandomTruckRarity() {
  const totalWeight = Object.values(truckRarities).reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [key, rarity] of Object.entries(truckRarities)) {
    random -= rarity.weight;
    if (random <= 0) return key;
  }
  
  return 'common';
}

// Generate a random truck
function generateTruck() {
  const rarityKey = getRandomTruckRarity();
  const rarity = truckRarities[rarityKey];
  
  const brand = truckBrands[Math.floor(Math.random() * truckBrands.length)];
  const model = truckModels[Math.floor(Math.random() * truckModels.length)];
  const efficiency = parseFloat((Math.random() * (rarity.efficiencyMax - rarity.efficiencyMin) + rarity.efficiencyMin).toFixed(2));
  
  // Cost based on rarity
  const baseCost = {
    common: 10000,
    uncommon: 25000,
    rare: 60000,
    legendary: 150000
  };
  
  return {
    id: 'truck_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name: `${brand} ${model}`,
    icon: '🚚',
    efficiency: efficiency,
    cost: baseCost[rarityKey],
    rarity: rarityKey
  };
}

// Refresh available trucks
function refreshAvailableTrucks() {
  equipmentState.availableTrucks = [];
  for (let i = 0; i < 3; i++) {
    equipmentState.availableTrucks.push(generateTruck());
  }
  
  equipmentState.nextTruckRefresh = Date.now() + (5 * 60 * 1000);
  saveEquipmentData();
  renderAvailableTrucks();
}

// Start the refresh timer for trucks
function startTruckRefreshTimer() {
  if (equipmentState.refreshInterval) {
    clearInterval(equipmentState.refreshInterval);
  }
  
  equipmentState.refreshInterval = setInterval(() => {
    updateTruckRefreshTimer();
    
    if (Date.now() >= equipmentState.nextTruckRefresh) {
      refreshAvailableTrucks();
    }
  }, 1000);
}

// Update the refresh timer display
function updateTruckRefreshTimer() {
  const timerEl = document.getElementById('truck-refresh-timer');
  if (!timerEl) return;
  
  const remaining = Math.max(0, equipmentState.nextTruckRefresh - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Render consumables inventory
function renderConsumablesInventory() {
  const container = document.getElementById('consumables-inventory');
  
  const hasItems = Object.values(equipmentState.consumables).some(count => count > 0);
  
  if (!hasItems) {
    container.innerHTML = '<div class="inventory-empty">No consumables owned</div>';
    return;
  }
  
  container.innerHTML = '';
  
  Object.entries(consumables).forEach(([id, item]) => {
    const owned = equipmentState.consumables[id] || 0;
    if (owned === 0) return;
    
    const itemDiv = document.createElement('div');
    itemDiv.style.cssText = `
      background: #2a2a2a;
      padding: 0.8rem;
      border-radius: var(--radius);
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    `;
    
    itemDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.8rem;">
        <span style="font-size: 1.5rem;">${item.icon}</span>
        <div>
          <div style="font-weight: bold;">${item.name}</div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">${item.description}</div>
        </div>
      </div>
      <div style="font-size: 1.1rem; font-weight: bold; color: var(--accent);">×${owned}</div>
    `;
    
    container.appendChild(itemDiv);
  });
}

// Render consumables shop
function renderConsumablesShop() {
  const container = document.getElementById('consumables-shop');
  container.innerHTML = '';
  
  Object.entries(consumables).forEach(([id, item]) => {
    const owned = equipmentState.consumables[id] || 0;
    const isOwned = !item.consumable && owned > 0;
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'consumable-item';
    itemDiv.style.opacity = isOwned ? '0.6' : '1';
    
    if (item.consumable) {
      // Consumable items - show quantity selector below button
      const quantity = equipmentState.purchaseQuantities[id];
      const totalCost = item.cost * quantity;
      
      itemDiv.innerHTML = `
        <div class="consumable-info">
          <div class="consumable-name">
            <span class="consumable-icon">${item.icon}</span>
            <span>${item.name}</span>
          </div>
          <div class="consumable-description">${item.description}</div>
          <div class="consumable-buff">${item.buff}</div>
          <div style="font-size: 0.8rem; color: #ffd700; margin-top: 0.3rem;">$${item.cost} each • Consumed per task</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem;">
          <div class="consumable-owned">Owned: ${owned}</div>
          <button class="purchase-btn" onclick="window.purchaseConsumable('${id}')">
            Buy $${totalCost}
          </button>
          <div class="quantity-selector">
            <button class="quantity-btn" onclick="window.adjustQuantity('${id}', -1)">-</button>
            <div class="quantity-display">${quantity}</div>
            <button class="quantity-btn" onclick="window.adjustQuantity('${id}', 1)">+</button>
          </div>
        </div>
      `;
    } else {
      // Non-consumable items - one-time purchase
      itemDiv.innerHTML = `
        <div class="consumable-info">
          <div class="consumable-name">
            <span class="consumable-icon">${item.icon}</span>
            <span>${item.name}</span>
            ${isOwned ? '<span style="color: var(--accent); font-size: 0.8rem; margin-left: 0.5rem;">✓ OWNED</span>' : ''}
          </div>
          <div class="consumable-description">${item.description}</div>
          <div class="consumable-buff">${item.buff}</div>
          <div style="font-size: 0.8rem; color: #ffd700; margin-top: 0.3rem;">$${item.cost} • Permanent upgrade</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem;">
          ${!isOwned ? `
            <button class="purchase-btn" onclick="window.purchaseConsumable('${id}')">
              Purchase $${item.cost}
            </button>
          ` : `
            <div style="color: var(--accent); font-weight: bold;">Owned</div>
          `}
        </div>
      `;
    }
    
    container.appendChild(itemDiv);
  });
}

// Adjust purchase quantity
window.adjustQuantity = function(itemId, change) {
  equipmentState.purchaseQuantities[itemId] = Math.max(1, Math.min(99, equipmentState.purchaseQuantities[itemId] + change));
  renderConsumablesShop();
};

// Purchase consumable
window.purchaseConsumable = async function(itemId) {
  const item = consumables[itemId];
  
  // Check if non-consumable and already owned
  if (!item.consumable && equipmentState.consumables[itemId] > 0) {
    showFeedback('You already own this item!', 'error');
    return;
  }
  
  const quantity = item.consumable ? equipmentState.purchaseQuantities[itemId] : 1;
  const totalCost = item.cost * quantity;
  
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const snapshot = await getDoc(doc(db, "players", user.uid));
    const playerData = snapshot.data();
    const currentGold = playerData.gold || 0;
    
    if (currentGold < totalCost) {
      showFeedback(`Not enough gold! Need $${totalCost}`, 'error');
      return;
    }
    
    // Deduct gold
    const newGold = currentGold - totalCost;
    await updateDoc(doc(db, "players", user.uid), { gold: newGold });
    
    // Add items
    equipmentState.consumables[itemId] += quantity;
    
    // Save and re-render
    saveEquipmentData();
    renderConsumablesInventory();
    renderConsumablesShop();
    
    if (item.consumable) {
      showFeedback(`Purchased ${quantity}x ${item.name}!`);
    } else {
      showFeedback(`Purchased ${item.name}! Permanent buff active.`);
    }
    
    // Update gold display everywhere
    updateAllGoldDisplays(newGold);
    
  } catch (err) {
    console.error("Error purchasing consumable:", err);
    showFeedback('Error purchasing item', 'error');
  }
};

// Render owned trucks
function renderOwnedTrucks() {
  const container = document.getElementById('owned-trucks');
  
  if (equipmentState.ownedTrucks.length === 0) {
    container.innerHTML = '<div class="inventory-empty">No trucks owned</div>';
    return;
  }
  
  container.innerHTML = '';
  
  equipmentState.ownedTrucks.forEach((truck) => {
    const card = createTruckCard(truck, 'owned');
    container.appendChild(card);
  });
}

// Render available trucks
function renderAvailableTrucks() {
  const container = document.getElementById('available-trucks');
  container.innerHTML = '';
  
  // Add refresh timer
  const timerDiv = document.createElement('div');
  timerDiv.className = 'truck-card';
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
    <div id="truck-refresh-timer" style="color: var(--accent); font-weight: bold; font-size: 1.1rem;">5:00</div>
  `;
  container.appendChild(timerDiv);
  
  equipmentState.availableTrucks.forEach((truck) => {
    const card = createTruckCard(truck, 'available');
    container.appendChild(card);
  });
  
  updateTruckRefreshTimer();
}

// Create truck card
function createTruckCard(truck, type) {
  const card = document.createElement('div');
  card.className = `truck-card ${type === 'owned' ? 'owned' : ''}`;
  
  const rarity = truckRarities[truck.rarity];
  card.style.borderColor = rarity.color;
  
  card.innerHTML = `
    <div class="card-header">
      <div class="card-icon">${truck.icon}</div>
      <div class="card-name">${truck.name}</div>
    </div>
    <div class="card-rarity" style="color: ${rarity.color};">${rarity.name}</div>
    <div class="card-stats">Efficiency: ${truck.efficiency.toFixed(2)}x</div>
    ${type === 'available' ? `
      <div class="card-price">$${truck.cost.toLocaleString()}</div>
      <button onclick="window.purchaseTruck('${truck.id}')">Purchase</button>
    ` : `
      <div style="text-align: center; color: var(--accent); font-size: 0.8rem; margin-top: 0.5rem;">Owned</div>
    `}
  `;
  
  return card;
}

// Purchase truck
window.purchaseTruck = async function(truckId) {
  const truck = equipmentState.availableTrucks.find(t => t.id === truckId);
  if (!truck) return;
  
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const snapshot = await getDoc(doc(db, "players", user.uid));
    const playerData = snapshot.data();
    const currentGold = playerData.gold || 0;
    
    if (currentGold < truck.cost) {
      showFeedback(`Not enough gold! Need $${truck.cost.toLocaleString()}`, 'error');
      return;
    }
    
    // Deduct gold
    const newGold = currentGold - truck.cost;
    await updateDoc(doc(db, "players", user.uid), { gold: newGold });
    
    // Remove from available
    equipmentState.availableTrucks = equipmentState.availableTrucks.filter(t => t.id !== truckId);
    
    // Add to owned
    equipmentState.ownedTrucks.push({
      id: truck.id,
      name: truck.name,
      icon: truck.icon,
      efficiency: truck.efficiency,
      rarity: truck.rarity
    });
    
    // Save and re-render
    saveEquipmentData();
    renderOwnedTrucks();
    renderAvailableTrucks();
    
    showFeedback(`Purchased ${truck.name}!`);
    
    // Update gold display everywhere
    updateAllGoldDisplays(newGold);
    
    // If no more trucks available, refresh
    if (equipmentState.availableTrucks.length === 0) {
      refreshAvailableTrucks();
    }
    
  } catch (err) {
    console.error("Error purchasing truck:", err);
    showFeedback('Error purchasing truck', 'error');
  }
};

// Consume an item (called when a job completes)
export function consumeItem(itemId) {
  const item = consumables[itemId];
  
  // Only consume if it's a consumable item
  if (item && item.consumable && equipmentState.consumables[itemId] > 0) {
    equipmentState.consumables[itemId]--;
    saveEquipmentData();
    renderConsumablesInventory();
    return true;
  }
  
  // Non-consumable items just check if owned
  if (item && !item.consumable && equipmentState.consumables[itemId] > 0) {
    return true;
  }
  
  return false;
}

// Get equipment bonus for a job
export function getEquipmentBonus(jobId) {
  let bonus = 0;
  
  // Check consumables
  Object.entries(consumables).forEach(([id, item]) => {
    if (item.targetJob === jobId && equipmentState.consumables[id] > 0) {
      bonus += item.efficiencyBonus;
    }
  });
  
  return bonus;
}

// Check if player has consumables for a job
export function hasConsumablesForJob(jobId) {
  return Object.entries(consumables).some(([id, item]) => 
    item.targetJob === jobId && equipmentState.consumables[id] > 0
  );
}

// Helper function to update gold display everywhere
function updateAllGoldDisplays(gold) {
  // Update playerStats in jobs system
  playerStats.gold = gold;
  // Update the display in jobs tab
  updateStatsDisplay();
}

// Show inline feedback message
function showFeedback(message, type = 'success') {
  const container = document.getElementById('equipment-content');
  if (!container) return;
  
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

// Save equipment data to Firestore
async function saveEquipmentData() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await updateDoc(doc(db, "players", user.uid), {
      equipmentData: {
        consumables: equipmentState.consumables,
        ownedTrucks: equipmentState.ownedTrucks,
        availableTrucks: equipmentState.availableTrucks,
        nextTruckRefresh: equipmentState.nextTruckRefresh
      }
    });
  } catch (err) {
    console.error("Error saving equipment data:", err);
  }
}

// Load equipment data from Firestore
async function loadEquipmentData() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const snapshot = await getDoc(doc(db, "players", user.uid));
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data.equipmentData) {
        equipmentState.consumables = data.equipmentData.consumables || { tape: 0, boxes: 0, dolly: 0 };
        equipmentState.ownedTrucks = data.equipmentData.ownedTrucks || [];
        equipmentState.availableTrucks = data.equipmentData.availableTrucks || [];
        equipmentState.nextTruckRefresh = data.equipmentData.nextTruckRefresh || Date.now() + (5 * 60 * 1000);
        
        // Check if refresh time has passed
        if (Date.now() >= equipmentState.nextTruckRefresh || equipmentState.availableTrucks.length === 0) {
          refreshAvailableTrucks();
        }
      } else {
        // First time, generate trucks
        refreshAvailableTrucks();
      }
    }
  } catch (err) {
    console.error("Error loading equipment data:", err);
  }
}

// Export render function so jobs system can update display
export function updateConsumablesDisplay() {
  renderConsumablesInventory();
  renderConsumablesShop(); // Also update the shop to show current owned counts
}