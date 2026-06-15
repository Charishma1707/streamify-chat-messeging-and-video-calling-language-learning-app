import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import "dotenv/config";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "dummy_key");

/**
 * Generates a 1024-dimension vector embedding for the given text.
 * Prioritizes HuggingFace (intfloat/multilingual-e5-large) and falls back to Google Gemini.
 * 
 * @param {string} text The text to embed
 * @param {boolean} isQuery Whether the text is a query (true) or a passage to index (false)
 * @returns {Promise<number[]>} The 1024-dimensional embedding vector
 */
export async function getEmbedding(text, isQuery = false) {
  if (!text || typeof text !== "string") {
    throw new Error("Text must be a non-empty string");
  }

  // 1. Try HuggingFace first
  if (HUGGINGFACE_API_KEY) {
    try {
      const prefix = isQuery ? "query: " : "passage: ";
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/intfloat/multilingual-e5-large",
        { inputs: [prefix + text] },
        {
          headers: {
            Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      let result = response.data;
      if (Array.isArray(result) && Array.isArray(result[0])) {
        result = result[0];
      }

      if (Array.isArray(result) && result.length === 1024) {
        return result;
      }
      console.warn(`HuggingFace returned vector of length ${result?.length || "none"}, falling back to Gemini.`);
    } catch (error) {
      console.error("Error generating embedding from HuggingFace:", error.response?.data || error.message);
    }
  }

  // 2. Fallback to Gemini
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    const response = await model.embedContent({
      content: { parts: [{ text }] },
      outputDimensionality: 1024,
    });

    const result = response.embedding?.values;

    if (!Array.isArray(result) || result.length !== 1024) {
      throw new Error(`Invalid embedding vector returned. Expected 1024 elements, got: ${result?.length || "none"}`);
    }

    return result;
  } catch (error) {
    console.error("Error generating embedding from Gemini:", error.message);
    throw new Error("Failed to generate embedding from any embedding service");
  }
}
