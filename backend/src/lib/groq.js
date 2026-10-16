import Groq from "groq-sdk";
import "dotenv/config";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.warn("Groq: GROQ_API_KEY is missing from environment variables.");
}

const groq = new Groq({ apiKey: GROQ_API_KEY });

/**
 * Generates a coaching response grounded in retrieved chat messages using Groq API.
 * 
 * @param {Object[]} messages Array of retrieved message objects from Qdrant
 * @param {string} userQuestion The user's query/question
 * @returns {Promise<string>} Groq generated response
 */
export async function generateCoachingResponse(messages, userQuestion) {
  if (!GROQ_API_KEY) {
    throw new Error("Groq API key is not configured in environment variables.");
  }

  // Format the messages as the context block
  let contextBlock = "";
  if (messages.length === 0) {
    contextBlock = "No relevant past messages found in this user's chat history.";
  } else {
    contextBlock = messages
      .map((msg, index) => {
        const dateStr = new Date(msg.timestamp).toLocaleDateString();
        return `[${index + 1}] (On ${dateStr}): "${msg.text}"`;
      })
      .join("\n");
  }

  const systemPrompt = 
    "You are Fluentify Coach, a friendly, encouraging, and highly competent AI Language Learning Coach. " +
    "Your goal is to help users learn their target language by reviewing their past conversations with real language partners. " +
    "You correct grammatical mistakes, explain local idioms/slang, suggest natural vocabulary alternatives, and keep the user motivated. " +
    "Always ground your responses in the actual chat history messages provided in the context. " +
    "Refer to specific messages using citation brackets, e.g. [1], [2], when referencing them. " +
    "Be concise, clear, and structure your responses with markdown.";

  const userPrompt = `
=== CONTEXT: PAST CHAT MESSAGES ===
${contextBlock}
===================================

USER QUESTION:
"${userQuestion}"

Please answer the user's question grounded in the chat messages listed in the context. If the question asks about something not present in the context, helpfully explain what you do see, or provide general language learning advice. Remember to cite the messages as [1], [2] etc. where appropriate.
`;

  const candidateModels = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama3-70b-8192",
  ];

  let lastError = null;
  for (const modelName of candidateModels) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: modelName,
        temperature: 0.3,
        max_completion_tokens: 1024,
      });

      const responseText = chatCompletion.choices[0]?.message?.content;
      if (responseText) {
        return responseText;
      }
    } catch (error) {
      lastError = error;
      console.warn(`Groq model ${modelName} failed (${error.message}), trying next fallback...`);
    }
  }

  console.error("All Groq models failed:", lastError?.message);
  throw new Error("Failed to generate response from Groq AI Coach");
}
