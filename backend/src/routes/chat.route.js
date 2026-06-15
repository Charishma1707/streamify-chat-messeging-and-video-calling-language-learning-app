import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getStreamToken, saveMessage } from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/token", protectRoute, getStreamToken);
router.post("/message", protectRoute, saveMessage);

export default router;