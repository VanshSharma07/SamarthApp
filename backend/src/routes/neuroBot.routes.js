import express from "express";
import {
  startSession,
  processAnswer,
  generateReport
} from "../controllers/neuroBot.controller.js";

const router = express.Router();

router.post("/start", startSession);
router.post("/answer", processAnswer);
router.post("/report", generateReport);

export default router;

