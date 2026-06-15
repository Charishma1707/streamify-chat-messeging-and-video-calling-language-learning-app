import mongoose from "mongoose";
import Message from "../models/Message.js";
import { getEmbedding } from "./embeddings.js";
import { upsertMessage, mongoIdToUuid, qdrantClient } from "./qdrant.js";

/**
 * Common ingestion handler to convert a MongoDB Message document
 * into a Qdrant vector point with metadata.
 * 
 * @param {Object} doc Mongoose Message document
 */
export async function ingestMessageDoc(doc) {
  try {
    // Look up sender and receiver to construct languagePair
    const sender = await mongoose.model("User").findById(doc.senderId);
    const receiver = await mongoose.model("User").findById(doc.receiverId);
    
    const nativeLang = sender?.nativeLanguage || "unknown";
    const learnLang = receiver?.nativeLanguage || "unknown";
    const languagePair = `${nativeLang}-${learnLang}`;

    console.log(`Ingest: Generating embedding for message (${doc._id})...`);
    const vector = await getEmbedding(doc.text, false);

    await upsertMessage({
      messageId: doc._id.toString(),
      channelId: doc.channelId,
      senderId: doc.senderId.toString(),
      receiverId: doc.receiverId.toString(),
      text: doc.text,
      languagePair: languagePair,
      timestamp: doc.timestamp,
      vector: vector,
    });
    
    console.log(`Ingest: Message (${doc._id}) successfully indexed in Qdrant.`);
  } catch (error) {
    console.error(`Ingest: Error indexing message (${doc._id}):`, error.message);
    throw error;
  }
}

/**
 * Starts watching the Messages collection via MongoDB Change Streams.
 * Gracefully falls back if MongoDB is not running in replica set mode.
 */
export function startChangeStream() {
  try {
    const changeStream = Message.watch();

    changeStream.on("change", async (change) => {
      if (change.operationType === "insert") {
        const fullDoc = change.fullDocument;
        console.log(`Change Stream: Detected new message (${fullDoc._id}). Ingesting...`);
        try {
          await ingestMessageDoc(fullDoc);
        } catch (err) {
          console.error("Change Stream: Ingestion error:", err.message);
        }
      }
    });

    changeStream.on("error", (error) => {
      console.warn("MongoDB Change Stream: Error occurred, connection might have reset:", error.message);
    });

    console.log("MongoDB Change Stream: Successfully listening for new message inserts.");
  } catch (error) {
    console.warn(
      "MongoDB Change Stream: Could not start change stream (likely not a replica set). " +
      "Falling back to direct ingestion in controllers. Error: " + error.message
    );
  }
}

/**
 * Scans MongoDB for existing messages and backfills them into Qdrant if they do not exist.
 */
export async function backfillMessages() {
  try {
    console.log("Backfill: Verifying collection index in Qdrant...");
    const messages = await Message.find({});
    console.log(`Backfill: Found ${messages.length} messages in MongoDB.`);

    let backfilledCount = 0;
    for (const msg of messages) {
      const qdrantId = mongoIdToUuid(msg._id.toString());
      try {
        // Check if message is already stored in Qdrant
        const existingPoints = await qdrantClient.retrieve("messages", {
          ids: [qdrantId],
        });

        if (existingPoints && existingPoints.length > 0) {
          // Point already exists, skip embedding step
          continue;
        }

        console.log(`Backfill: Message ${msg._id} is missing in Qdrant. Ingesting...`);
        await ingestMessageDoc(msg);
        backfilledCount++;
      } catch (err) {
        console.error(`Backfill: Error processing message ${msg._id}:`, err.message);
      }
    }

    console.log(`Backfill: Completed. Synchronized ${backfilledCount} new messages into Qdrant.`);
  } catch (error) {
    console.error("Backfill: Error during synchronization:", error.message);
  }
}
