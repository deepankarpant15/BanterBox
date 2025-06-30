// controllers/socketController.js
import Message from "../models/Message.js";

// A Map to store which users are typing in which room
// Key: roomName, Value: Set of usernames typing in that room
const typingUsers = new Map(); // NEW: Global map to track typing users

// Helper function to get usernames in a specific room
const getUsersInRoom = async (io, roomName) => {
  try {
    console.log(`[DEBUG] Calling getUsersInRoom for room: #${roomName}`);
    const socketsInRoom = await io.in(roomName).allSockets();
    const users = [];
    for (const socketId of socketsInRoom) {
      const individualSocket = io.sockets.sockets.get(socketId);
      // Get username from socket (which will already be normalized)
      if (individualSocket && individualSocket.username) {
        users.push(individualSocket.username);
      }
    }
    const uniqueUsers = Array.from(new Set(users));
    console.log(
      `[DEBUG] getUsersInRoom for #${roomName}: Found ${socketsInRoom.size} sockets, Unique usernames:`,
      uniqueUsers
    );
    return uniqueUsers;
  } catch (error) {
    console.error(`[ERROR] Failed to get users in room #${roomName}:`, error);
    return [];
  }
};

const initializeSocketListeners = (io) => {
  io.on("connection", async (socket) => {
    console.log("A user connected");

    socket.username = "Anonymous";
    socket.currentRoom = "general";

    // Listen for 'set username' event from the client
    socket.on("set username", (name) => {
      // Normalize username to lowercase
      socket.username = name.toLowerCase(); // <--- MODIFIED
      console.log(`User ${socket.id} set username to: ${socket.username}`);
    });

    socket.emit("welcome", "Welcome to the chat!");

    // Listen for 'join room' event from the client
    socket.on("join room", async (data) => {
      const { username, room } = data;
      // Normalize username and room name to lowercase
      const normalizedUsername = username.toLowerCase(); // <--- MODIFIED
      const normalizedRoom = room.toLowerCase(); // <--- MODIFIED

      console.log(
        `User ${socket.id} (${normalizedUsername}) attempting to join room: ${normalizedRoom}`
      );

      const previousRoom = socket.currentRoom;

      // Leave previous room if different
      if (previousRoom && previousRoom !== normalizedRoom) {
        socket.leave(previousRoom);
        console.log(`${normalizedUsername} left room: ${previousRoom}`);
        io.to(previousRoom).emit("chat message", {
          username: "System",
          text: `${normalizedUsername} has left room #${previousRoom}.`,
        });
        const usersInPreviousRoom = await getUsersInRoom(io, previousRoom);
        console.log(
          `[DEBUG] Emitting update user list for previous room #${previousRoom}:`,
          usersInPreviousRoom
        );
        io.to(previousRoom).emit("update user list", usersInPreviousRoom);
      }

      // Join the new room
      socket.join(normalizedRoom);
      socket.username = normalizedUsername; // Update socket's username to normalized version
      socket.currentRoom = normalizedRoom; // Update socket's current room to normalized version
      console.log(`${normalizedUsername} joined room: ${normalizedRoom}`);

      io.to(normalizedRoom).emit("chat message", {
        username: "System",
        text: `${normalizedUsername} has joined room #${normalizedRoom}.`,
      });

      // Load past messages for the new room (query using normalized room name)
      try {
        const pastMessages = await Message.find({
          room: socket.currentRoom,
        }).sort({ timestamp: 1 });
        console.log(
          `Sending ${pastMessages.length} past messages for room #${socket.currentRoom} to ${normalizedUsername}.`
        );
        // Send back the original (stored) username but the normalized room
        socket.emit(
          "room history",
          pastMessages.map((msg) => ({
            username: msg.username,
            text: msg.text,
            room: msg.room,
          }))
        );
      } catch (error) {
        console.error("Error fetching past messages for room:", error);
      }

      // Update user list for the new room
      const usersInNewRoom = await getUsersInRoom(io, socket.currentRoom);
      console.log(
        `[DEBUG] Emitting update user list for new room #${socket.currentRoom}:`,
        usersInNewRoom
      );
      io.to(socket.currentRoom).emit("update user list", usersInNewRoom);
    });

    // NEW: Listen for 'typing' event
    socket.on("typing", (data) => {
      const { username, room } = data;
      // Add user to typing set for their room
      if (!typingUsers.has(room)) {
        typingUsers.set(room, new Set());
      }
      typingUsers.get(room).add(username);
      console.log(
        `[TYPING] ${username} is typing in room #${room}. Current typing users:`,
        Array.from(typingUsers.get(room))
      );

      // Broadcast typing event to others in the same room
      // Only send if this is the first user typing or if the message changes
      if (typingUsers.get(room).size === 1) {
        // Only broadcast if this is the first user to type
        socket.broadcast.to(room).emit("typing", { username: username });
      } else {
        // If multiple users are typing, just indicate "multiple users are typing..."
        // Or we can choose to send the actual username of the latest typer
        // For simplicity, we'll just re-emit the last one
        socket.broadcast.to(room).emit("typing", { username: username });
      }
    });

    // NEW: Listen for 'stop typing' event
    socket.on("stop typing", (data) => {
      const { username, room } = data;
      // Remove user from typing set for their room
      if (typingUsers.has(room)) {
        typingUsers.get(room).delete(username);
        console.log(
          `[TYPING] ${username} stopped typing in room #${room}. Current typing users:`,
          Array.from(typingUsers.get(room))
        );
        // If no one else is typing in that room, send 'stop typing'
        if (typingUsers.get(room).size === 0) {
          socket.broadcast.to(room).emit("stop typing");
        } else {
          // If others are still typing, re-emit one of them, or a generic message
          const remainingTypers = Array.from(typingUsers.get(room));
          socket.broadcast
            .to(room)
            .emit("typing", { username: remainingTypers[0] });
        }
      }
    });

    // Listen for 'chat message' events from this client
    socket.on("chat message", async (data) => {
      // Use the normalized username and room from the socket
      const senderUsername = socket.username || "Anonymous";
      const messageText = data.text;
      const messageRoom = socket.currentRoom || "general";

      console.log(
        `Message received from ${senderUsername} in room #${messageRoom}: ${messageText}`
      );

      if (
        !messageText ||
        typeof messageText !== "string" ||
        messageText.trim() === ""
      ) {
        console.log("Received empty or invalid message, not saving.");
        return;
      }

      try {
        // Save message with the normalized username and room
        const newMessage = new Message({
          username: senderUsername,
          text: messageText,
          room: messageRoom,
        }); // <--- MODIFIED (using normalized values)
        await newMessage.save();
        console.log("Message successfully saved to DB:", newMessage);

        // Broadcast the message using normalized room and username
        io.to(messageRoom).emit("chat message", {
          username: senderUsername,
          text: messageText,
          room: messageRoom,
        }); // <--- MODIFIED

        // NEW: After a message is sent, ensure this user is marked as "not typing"
        if (typingUsers.has(messageRoom)) {
          typingUsers.get(messageRoom).delete(senderUsername);
          if (typingUsers.get(messageRoom).size === 0) {
            socket.broadcast.to(messageRoom).emit("stop typing");
          } else {
            const remainingTypers = Array.from(typingUsers.get(messageRoom));
            socket.broadcast
              .to(messageRoom)
              .emit("typing", { username: remainingTypers[0] });
          }
        }
      } catch (error) {
        console.error("ERROR during message save to DB:", error);
        if (error.name === "ValidationError") {
          console.error(
            "Mongoose Validation Error:",
            error.message,
            error.errors
          );
        } else if (error.name === "MongoNetworkError") {
          console.error(
            "MongoDB Network Error: Is the database running and accessible?",
            error.message
          );
        }
      }
    });

    socket.on("disconnect", async () => {
      console.log("User disconnected");
      // Use the normalized username and room from the socket
      const disconnectedUsername = socket.username || "A user";
      const disconnectedRoom = socket.currentRoom || "an unknown room";

      io.to(disconnectedRoom).emit("chat message", {
        username: "System",
        text: `${disconnectedUsername} has left room #${disconnectedRoom}.`,
      });
      // NEW: Remove disconnected user from typing state
      if (typingUsers.has(disconnectedRoom)) {
        typingUsers.get(disconnectedRoom).delete(disconnectedUsername);
        if (typingUsers.get(disconnectedRoom).size === 0) {
          io.to(disconnectedRoom).emit("stop typing"); // io.to, as the disconnected socket is no longer available for broadcast.
        } else {
          const remainingTypers = Array.from(typingUsers.get(disconnectedRoom));
          // Emit from another socket or use io.to if possible to keep sending a name.
          // For simplicity, we just send generic 'stop typing' if the last one leaves,
          // or send a remaining typer.
          // This is a subtle point, io.to.emit is better than socket.broadcast.to here
          // because the original socket is gone.
          if (remainingTypers.length > 0) {
            io.to(disconnectedRoom).emit("typing", {
              username: remainingTypers[0],
            });
          }
        }
      }

      // Update user list for the room they just left
      const usersInLeftRoom = await getUsersInRoom(io, disconnectedRoom);
      console.log(
        `[DEBUG] Emitting update user list for disconnected user's room #${disconnectedRoom}:`,
        usersInLeftRoom
      );
      io.to(disconnectedRoom).emit("update user list", usersInLeftRoom);
    });
  });
};

export default initializeSocketListeners;
