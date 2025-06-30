// models/Message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    default: 'Anonymous'
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  room: { // NEW FIELD: Room name
    type: String,
    required: true,
    trim: true,
    default: 'general' // Default room if not specified
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create and export the Message Model
const Message = mongoose.model('Message', messageSchema);

export default Message;
