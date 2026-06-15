import { getEmbedding } from "../lib/embeddings.js";
import { searchMessages } from "../lib/qdrant.js";
import { generateCoachingResponse } from "../lib/groq.js";
import { ingestMessageDoc } from "../lib/ingest.js";
import Message from "../models/Message.js";

/**
 * Handles user questions, performs semantic RAG search on their past messages,
 * and calls Gemini to generate coaching response.
 */
export async function queryMemory(req, res) {
  try {
    const { question } = req.body;
    const userId = req.user._id;

    if (!question || typeof question !== "string") {
      return res.status(400).json({ message: "A valid question string is required." });
    }

    console.log(`RAG: Processing question from user ${userId}: "${question}"`);

    // 1. Generate query embedding vector
    const queryVector = await getEmbedding(question, true);

    // 2. Search Qdrant for top 5 semantically similar messages (threshold > 0.65)
    const retrievedMessages = await searchMessages({
      userId: userId,
      queryVector: queryVector,
      limit: 5,
    });

    console.log(`RAG: Retrieved ${retrievedMessages.length} relevant messages.`);

    // 3. Send text + context to Gemini 1.5 Flash
    const coachResponse = await generateCoachingResponse(retrievedMessages, question);

    return res.status(200).json({
      success: true,
      response: coachResponse,
      sources: retrievedMessages,
    });
  } catch (error) {
    console.error("Error in queryMemory controller:", error.message);
    return res.status(500).json({ message: "Failed to query AI Coach memory." });
  }
}

/**
 * Handles Webhooks incoming from GetStream Chat.
 * When a user sends a message, it is persisted to MongoDB and indexed to Qdrant.
 */
export async function handleWebhook(req, res) {
  try {
    const { type, message, cid } = req.body;

    // We only care about new messages
    if (type === "message.new" && message && cid) {
      const channelId = cid.split(":")[1] || cid;
      const senderId = message.user.id;
      
      // Parse receiver ID from channelId (format: user1Id-user2Id sorted)
      const members = channelId.split("-");
      const receiverId = members.find((id) => id !== senderId) || senderId;

      console.log(`Webhook: Received new message from ${senderId} to ${receiverId}`);

      // Check if message is already in MongoDB (prevents duplicates)
      const existingMessage = await Message.findOne({ streamMessageId: message.id });
      
      if (!existingMessage) {
        // Create MongoDB Message document
        const newMessage = await Message.create({
          streamMessageId: message.id,
          channelId: channelId,
          senderId: senderId,
          receiverId: receiverId,
          text: message.text,
          timestamp: message.created_at || new Date(),
        });

        // Trigger direct ingestion to Qdrant immediately.
        // This acts as a fallback if MongoDB is not running in replica-set mode (no change streams).
        // Since Qdrant points are indexed deterministically by Mongo ObjectId, double indexing is safe.
        ingestMessageDoc(newMessage).catch((err) => {
          console.error(`Webhook: Async direct Qdrant ingestion failed for ${newMessage._id}:`, err.message);
        });
      }
    }

    // Always respond 200 OK to webhooks
    return res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Webhook processing failed:", error.message);
    return res.status(200).json({ status: "error", message: error.message });
  }
}
