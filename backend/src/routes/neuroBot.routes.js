import express from "express";
import {
  startSession,
  processAnswer,
  processSTT,
  generateReport
} from "../controllers/neuroBot.controller.js";

const router = express.Router();

router.post("/start", startSession);
router.post("/answer", processAnswer);
router.post("/stt", processSTT);
router.post("/report", generateReport);

export default router;

