// app.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

import connectDB from "./config/db.js";
// Removed direct import of Message as it's now handled by socketController
import initializeSocketListeners from "./controllers/socketController.js"; // Import our new controller

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// --- Connect to MongoDB ---
connectDB();

// --- Express Static Files ---
app.use(express.static(path.join(__dirname, "public")));

// --- Initialize Socket.IO Listeners ---
// Pass the 'io' instance to our socket controller
initializeSocketListeners(io);

// --- Start Server ---
httpServer.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Serving static files from: ${path.join(__dirname, "public")}`);
  console.log("Socket.IO is listening for connections.");
});
