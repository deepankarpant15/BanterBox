// config/db.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file
const connectDB = async () => {
  // IMPORTANT: Replace this with your actual MongoDB URI.
  // For local: 'mongodb://localhost:27017/chatApp'
  // For Atlas: 'mongodb+srv://<username>:<password>@<cluster-url>/chatApp?retryWrites=true&w=majority'
  const url = process.env.MONGO_URI;

  try {
    await mongoose.connect(url);
    console.log("MongoDB connected successfully!");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    // Exit process with failure
    process.exit(1);
  }
};

export default connectDB;
