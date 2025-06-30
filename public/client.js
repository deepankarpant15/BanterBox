// public/client.js
const socket = io();

const messages = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("m");
const usernameOverlay = document.getElementById("usernameOverlay");
const usernameInput = document.getElementById("usernameInput");
const roomInput = document.getElementById("roomInput");
const setUsernameBtn = document.getElementById("setUsernameBtn");
const currentRoomDisplay = document.getElementById("currentRoomDisplay");
const onlineUsersList = document.getElementById("onlineUsers");
const typingIndicator = document.getElementById("typingIndicator"); // NEW: Reference to typing indicator div

let currentUsername = "Anonymous";
let currentRoom = "general";
let typing = false; // NEW: Track if this client is typing
let timeout = undefined; // NEW: For debouncing typing events

function addMessage(msg, type = "") {
  const item = document.createElement("div");
  if (typeof msg === "object" && msg.username && msg.text) {
    item.innerHTML = `<span class="username">${msg.username}:</span> ${msg.text}`;
  } else {
    item.textContent = msg;
  }
  item.classList.add("message");
  if (type) {
    item.classList.add(type);
  }
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
}

/*
function updateOnlineUsers(users) {
  onlineUsersList.innerHTML = "";
  users.forEach((user) => {
    const listItem = document.createElement("li");
    listItem.textContent = user;
    onlineUsersList.appendChild(listItem);
  });
}*/

function updateOnlineUsers(users) {
  // [DEBUG] Log when this client-side function is called and what data it received
  //console.log("[CLIENT DEBUG] updateOnlineUsers function called with:", users);
  onlineUsersList.innerHTML = "";

  if (!Array.isArray(users)) {
    console.error(
      "[CLIENT ERROR] updateOnlineUsers received non-array data:",
      users
    );
    return; // Exit if data is not an array
  }
  if (users.length === 0) {
    const listItem = document.createElement("li");
    listItem.textContent = "No other users online.";
    listItem.style.fontStyle = "italic";
    listItem.style.color = "#71717a";
    onlineUsersList.appendChild(listItem);
  } else {
    users.forEach((user) => {
      const listItem = document.createElement("li");
      listItem.textContent = user;
      onlineUsersList.appendChild(listItem);
    });
  }

  //   // [DEBUG] Log after updating the DOM
  //   console.log("[CLIENT DEBUG] Online users list updated in DOM.");
}

// NEW: Function to display who is typing
function displayTyping(data) {
  typingIndicator.textContent = `${data.username} is typing...`;
}

// NEW: Function to clear typing indicator
function clearTyping() {
  typingIndicator.textContent = "";
}

// Show username/room prompt immediately
usernameOverlay.style.display = "flex";
messageForm.style.display = "none";

setUsernameBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  const room = roomInput.value.trim();
  if (username && room) {
    currentUsername = username;
    currentRoom = room;
    currentRoomDisplay.textContent = `Room: #${currentRoom}`;
    socket.emit("join room", { username: currentUsername, room: currentRoom });
    usernameOverlay.style.display = "none";
    messageForm.style.display = "flex";
    messageInput.focus();
  } else {
    alert("Please enter both a username and a room name.");
  }
});

usernameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    roomInput.focus();
  }
});

roomInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    setUsernameBtn.click();
  }
});

socket.on("connect", () => {
  console.log("Connected to Socket.IO server!");
  addMessage("You are connected to the chat.", "system");
  if (currentUsername !== "Anonymous" && currentRoom !== "general") {
    socket.emit("join room", { username: currentUsername, room: currentRoom });
  }
});

socket.on("room history", (msgs) => {
  console.log(`Received history for room ${currentRoom}:`, msgs);
  messages.innerHTML = "";
  addMessage(`--- Chat History for #${currentRoom} Loaded ---`, "system");
  msgs.forEach((msg) => addMessage(msg));
  addMessage("-------------------------------------------", "system");
});
// NEW: Listen for 'update user list' event
socket.on("update user list", (users) => {
  // [DEBUG] Log when the client receives the 'update user list' event
  console.log(
    '[CLIENT DEBUG] Received "update user list" event from server with data:',
    users
  );
  updateOnlineUsers(users);
});

// NEW: Listen for 'typing' event from server
socket.on("typing", (data) => {
  displayTyping(data);
});

// NEW: Listen for 'stop typing' event from server
socket.on("stop typing", () => {
  clearTyping();
});

socket.on("disconnect", () => {
  console.log("Disconnected from Socket.IO server!");
  addMessage("You have disconnected from the chat.", "system");
  updateOnlineUsers([]);
  clearTyping(); // Clear typing indicator on disconnect
});

socket.on("welcome", (message) => {
  console.log("Server says:", message);
  addMessage(`Server: ${message}`, "system");
});

socket.on("connect_error", (error) => {
  console.error("Socket.IO connection error:", error);
  addMessage(`Connection Error: ${error.message}`, "system");
});

// NEW: Typing event handlers for message input
messageInput.addEventListener("keypress", () => {
  if (!typing) {
    typing = true;
    socket.emit("typing", { username: currentUsername, room: currentRoom });
  }
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    typing = false;
    socket.emit("stop typing", {
      username: currentUsername,
      room: currentRoom,
    });
  }, 1000); // 1 second debounce
});

// Also emit stop typing when message is sent
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (messageInput.value) {
    socket.emit("chat message", {
      username: currentUsername,
      room: currentRoom,
      text: messageInput.value,
    });
    messageInput.value = "";
    // Ensure stop typing is sent when message is submitted
    if (typing) {
      clearTimeout(timeout); // Clear any pending timeout
      typing = false;
      socket.emit("stop typing", {
        username: currentUsername,
        room: currentRoom,
      });
    }
  }
});

socket.on("chat message", (msg) => {
  if (msg.room === currentRoom || msg.username === "System") {
    addMessage(msg);
  }
  clearTyping(); // Clear typing indicator when a new message arrives
});
