import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  streamMessageId: {
    type: String,
    required: true,
    unique: true,
  },
  channelId: {
    type: String,
    required: true,
    index: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  text: {
    type: String,
    required: true,
  },
  languagePair: {
    type: String,
    default: "unknown",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Message = mongoose.model("Message", messageSchema);
export default Message;
