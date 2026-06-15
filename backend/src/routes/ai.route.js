import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { queryMemory, handleWebhook } from "../controllers/ai.controller.js";

const router = express.Router();

// Grounded AI coaching prompt query
router.post("/coach", protectRoute, queryMemory);

// GetStream chat event webhook (ingestion)
router.post("/webhook", handleWebhook);

export default router;
