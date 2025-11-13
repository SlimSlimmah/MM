// Leaderboard system
import { auth, db } from './firebase-init.js';
import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// Initialize leaderboard system
export function initLeaderboardSystem() {
  const leaderboardIcon = document.getElementById('leaderboard-icon');
  const leaderboardModal = document.getElementById('leaderboard-modal');
  
  leaderboardIcon.onclick = () => {
    leaderboardModal.classList.add('active');
    loadLeaderboard();
  };
  
  // Close modal when clicking outside
  leaderboardModal.onclick = (e) => {
    if (e.target === leaderboardModal) {
      leaderboardModal.classList.remove('active');
    }
  };
}

// Load and display leaderboard
async function loadLeaderboard() {
  const container = document.getElementById('leaderboard-list');
  container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Loading...</p>';
  
  try {
    const playersRef = collection(db, 'players');
    const q = query(playersRef, orderBy('gold', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No players yet</p>';
      return;
    }
    
    const players = [];
    snapshot.forEach((doc) => {
      players.push({ id: doc.id, ...doc.data() });
    });
    
    renderLeaderboard(players);
  } catch (err) {
    console.error('Error loading leaderboard:', err);
    container.innerHTML = '<p style="text-align: center; color: #ff6b6b;">Error loading leaderboard</p>';
  }
}

// Render leaderboard
function renderLeaderboard(players) {
  const container = document.getElementById('leaderboard-list');
  const user = auth.currentUser;
  
  container.innerHTML = '';
  
  players.forEach((player, index) => {
    const rank = index + 1;
    const isOwnRank = user && player.id === user.uid;
    
    const item = document.createElement('div');
    item.className = `leaderboard-item ${isOwnRank ? 'own-rank' : ''}`;
    
    let rankClass = '';
    if (rank === 1) rankClass = 'top-1';
    else if (rank === 2) rankClass = 'top-2';
    else if (rank === 3) rankClass = 'top-3';
    
    item.innerHTML = `
      <div class="leaderboard-rank ${rankClass}">#${rank}</div>
      <div class="leaderboard-info">
        <div class="leaderboard-username">${player.username || 'Anonymous'}</div>
        <div class="leaderboard-level">Level ${player.level || 1}</div>
      </div>
      <div class="leaderboard-gold">💰 ${player.gold || 0}</div>
    `;
    
    container.appendChild(item);
  });
}