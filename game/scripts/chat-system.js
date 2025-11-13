// Chat system
import { auth, db } from './firebase-init.js';
import { doc, collection, addDoc, query, orderBy, limit, onSnapshot, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

let lastSeenTimestamp = Date.now();
let unsubscribeChat = null;

// Initialize chat system
export function initChatSystem() {
  loadLastSeenTimestamp();
  setupChatListeners();
  
  // Listen for new messages in real-time
  listenToChat();
}

// Setup event listeners
function setupChatListeners() {
  const chatIcon = document.getElementById('chat-icon');
  const chatModal = document.getElementById('chat-modal');
  const sendBtn = document.getElementById('send-message-btn');
  const chatInput = document.getElementById('chat-input');
  
  chatIcon.onclick = () => {
    chatModal.classList.add('active');
    markMessagesAsSeen();
  };
  
  // Close modal when clicking outside
  chatModal.onclick = (e) => {
    if (e.target === chatModal) {
      chatModal.classList.remove('active');
    }
  };
  
  // Send message
  sendBtn.onclick = () => sendMessage();
  chatInput.onkeypress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };
}

// Listen to chat messages in real-time
function listenToChat() {
  const messagesRef = collection(db, 'chat');
  const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));
  
  unsubscribeChat = onSnapshot(q, (snapshot) => {
    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    
    // Reverse to show oldest first
    messages.reverse();
    
    renderMessages(messages);
    checkForNewMessages(messages);
  });
}

// Render chat messages
function renderMessages(messages) {
  const container = document.getElementById('chat-messages');
  const user = auth.currentUser;
  
  container.innerHTML = '';
  
  if (messages.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 2rem;">No messages yet. Be the first to chat!</p>';
    return;
  }
  
  messages.forEach((msg) => {
    const isOwnMessage = user && msg.userId === user.uid;
    
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${isOwnMessage ? 'own-message' : ''}`;
    
    const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
    
    messageEl.innerHTML = `
      <div class="message-header">
        <span class="message-username">${msg.username}</span>
        <span class="message-time">${time}</span>
      </div>
      <div class="message-text">${escapeHtml(msg.text)}</div>
    `;
    
    container.appendChild(messageEl);
  });
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

// Check for new messages
function checkForNewMessages(messages) {
  if (messages.length === 0) return;
  
  const latestMessage = messages[messages.length - 1];
  const notification = document.getElementById('chat-notification');
  const chatModal = document.getElementById('chat-modal');
  
  // Show notification if there are new messages and chat is closed
  if (latestMessage.timestamp > lastSeenTimestamp && !chatModal.classList.contains('active')) {
    notification.style.display = 'block';
  }
}

// Send a message
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  
  if (!text) return;
  
  const user = auth.currentUser;
  if (!user) {
    alert('You must be logged in to chat');
    return;
  }
  
  try {
    // Get username from player data
    const playerDoc = await getDoc(doc(db, 'players', user.uid));
    const username = playerDoc.exists() ? playerDoc.data().username : 'Anonymous';
    
    // Add message to Firestore
    await addDoc(collection(db, 'chat'), {
      text: text,
      username: username,
      userId: user.uid,
      timestamp: Date.now()
    });
    
    input.value = '';
  } catch (err) {
    console.error('Error sending message:', err);
    alert('Failed to send message');
  }
}

// Mark messages as seen
async function markMessagesAsSeen() {
  lastSeenTimestamp = Date.now();
  document.getElementById('chat-notification').style.display = 'none';
  
  // Save to Firestore
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    await updateDoc(doc(db, 'players', user.uid), {
      lastSeenChat: lastSeenTimestamp
    });
  } catch (err) {
    console.error('Error saving last seen:', err);
  }
}

// Load last seen timestamp
async function loadLastSeenTimestamp() {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const playerDoc = await getDoc(doc(db, 'players', user.uid));
    if (playerDoc.exists() && playerDoc.data().lastSeenChat) {
      lastSeenTimestamp = playerDoc.data().lastSeenChat;
    }
  } catch (err) {
    console.error('Error loading last seen:', err);
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Cleanup
export function cleanupChatSystem() {
  if (unsubscribeChat) {
    unsubscribeChat();
  }
}