import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config";

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

export const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY || undefined,
  checkCompatibility: false,
});

const COLLECTION_NAME = "messages";

/**
 * Deterministically converts a 24-character hex MongoDB ObjectId into a 36-character UUIDv4.
 * This allows Qdrant to use the MongoDB ObjectId as a point ID.
 * @param {string} mongoId Mongoose/MongoDB ObjectId string
 * @returns {string} Formatted UUID
 */
export function mongoIdToUuid(mongoId) {
  const hex = mongoId.toString().replace(/[^0-9a-fA-F]/g, "");
  if (hex.length !== 24) {
    // Generate a fallback UUID if it's not a valid MongoDB ObjectId
    return "00000000-0000-4000-8000-000000000000";
  }
  // Pad the 24 hex characters to 32 hex characters by prepending 8 zeros
  const padded = "00000000" + hex;
  // Format as standard UUID: 8-4-4-4-12
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20, 32)}`;
}

/**
 * Initializes the Qdrant collection for messages if it does not already exist.
 */
export async function initQdrant() {
  try {
    const response = await qdrantClient.getCollections();
    const collectionExists = response.collections.some(
      (c) => c.name === COLLECTION_NAME
    );

    if (!collectionExists) {
      console.log(`Qdrant: Collection '${COLLECTION_NAME}' not found. Creating...`);
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 1024, // 1024 dimensions for multilingual-e5-large
          distance: "Cosine",
        },
      });
      console.log(`Qdrant: Collection '${COLLECTION_NAME}' created successfully.`);
    } else {
      console.log(`Qdrant: Collection '${COLLECTION_NAME}' is ready.`);
    }
  } catch (error) {
    console.error("Qdrant initialization error:", error.message);
  }
}

/**
 * Upserts a chat message embedding and metadata into Qdrant.
 * 
 * @param {Object} params
 * @param {string} params.messageId MongoDB message ID
 * @param {string} params.channelId Chat channel ID
 * @param {string} params.senderId Sender User ID
 * @param {string} params.receiverId Receiver User ID
 * @param {string} params.text Message text content
 * @param {string} params.languagePair Target language pair (e.g. "en-es")
 * @param {Date|string} params.timestamp Message timestamp
 * @param {number[]} params.vector 1024-dimensional embedding vector
 */
export async function upsertMessage({
  messageId,
  channelId,
  senderId,
  receiverId,
  text,
  languagePair,
  timestamp,
  vector,
}) {
  try {
    const pointId = mongoIdToUuid(messageId);
    
    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: pointId,
          vector: vector,
          payload: {
            messageId: messageId.toString(),
            channelId: channelId,
            senderId: senderId.toString(),
            receiverId: receiverId.toString(),
            text: text,
            languagePair: languagePair,
            timestamp: new Date(timestamp).toISOString(),
          },
        },
      ],
    });
  } catch (error) {
    console.error(`Error upserting point to Qdrant (ID: ${messageId}):`, error.message);
  }
}

/**
 * Searches Qdrant for messages belonging to a user (as sender or receiver)
 * that match the query vector. Filters results with a similarity threshold > 0.65.
 * 
 * @param {Object} params
 * @param {string} params.userId User ID to filter messages for (must be sender or receiver)
 * @param {number[]} params.queryVector 1024-dimensional query embedding vector
 * @param {number} [params.limit=5] Maximum number of results to return
 * @returns {Promise<Object[]>} Array of retrieved message items with score
 */
export async function searchMessages({ userId, queryVector, limit = 5 }) {
  try {
    const result = await qdrantClient.search(COLLECTION_NAME, {
      vector: queryVector,
      limit: limit,
      score_threshold: 0.65, // Only return matching vectors with cosine similarity > 0.65
      filter: {
        should: [
          {
            key: "senderId",
            match: { value: userId.toString() },
          },
          {
            key: "receiverId",
            match: { value: userId.toString() },
          },
        ],
      },
    });

    return result.map((point) => ({
      messageId: point.payload.messageId,
      text: point.payload.text,
      senderId: point.payload.senderId,
      receiverId: point.payload.receiverId,
      timestamp: point.payload.timestamp,
      score: point.score,
    }));
  } catch (error) {
    console.error("Error searching Qdrant:", error.message);
    return [];
  }
}
