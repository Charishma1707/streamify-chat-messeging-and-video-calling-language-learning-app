import { generateStreamToken } from "../lib/stream.js";
import Message from "../models/Message.js";
import { ingestMessageDoc } from "../lib/ingest.js";

export async function getStreamToken(req, res) {
  try {
    const token = generateStreamToken(req.user.id);

    res.status(200).json({ token });
  } catch (error) {
    console.log("Error in getStreamToken controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function saveMessage(req, res) {
  try {
    const { streamMessageId, channelId, senderId, receiverId, text, timestamp } = req.body;

    if (!streamMessageId || !channelId || !senderId || !receiverId || !text) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existingMessage = await Message.findOne({ streamMessageId });
    if (!existingMessage) {
      const newMessage = await Message.create({
        streamMessageId,
        channelId,
        senderId,
        receiverId,
        text,
        timestamp: timestamp || new Date(),
      });

      console.log(`Direct Ingest: Created MongoDB Message (${newMessage._id})`);

      ingestMessageDoc(newMessage).catch((err) => {
        console.error(`Direct Ingest: Async Qdrant ingestion failed for ${newMessage._id}:`, err.message);
      });

      return res.status(201).json({ success: true, message: newMessage });
    }

    return res.status(200).json({ success: true, message: existingMessage });
  } catch (error) {
    console.error("Error in saveMessage controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}