import {
  detectLanguage,
  isWhyQuestion,
  getQuestionExplanation,
  QUESTIONS,
  isAgeAnswerHeuristic,
  validateAnswer,
  generateConversationalMessage,
  textToSpeech,
  generateMedicalReport
} from "../services/neuroBot.service.js";

import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { Blob } from "buffer";

const upload = multer();
const sessions = {};
const ELEVEN_KEY = process.env.ELEVEN_API_KEY;

export const startSession = async (req, res) => {
  const sessionId = uuidv4();

  sessions[sessionId] = {
    index: -1,
    answers: {},
    history: [],
    lang: "en"
  };

  const text =
    "Hello! Before we begin, please tell me your preferred language: English or Hindi. / शुरू करने से पहले कृपया बताएं आपकी पसंदीदा भाषा कौन सी है: English या Hindi";

  const audio = await textToSpeech(text, "en");

  sessions[sessionId].history.push({
    from: "bot",
    text,
    meta: { step: "language_prompt" }
  });

  res.json({
    sessionId,
    botText: text,
    audio,
    question: { id: "language", text, type: "text" }
  });
};

export const processAnswer = async (req, res) => {
  try {
    const { sessionId, answer } = req.body;
    const session = sessions[sessionId];

    if (!session) return res.status(400).json({ error: "Session not found" });

    session.history.push({ from: "user", text: answer });

    // 1. LANGUAGE SELECT
    if (session.index === -1) {
      const lang = detectLanguage(answer);
      session.lang = lang;

      const firstQ = QUESTIONS[lang][0];

      const botText = await generateConversationalMessage(
        "Language selection",
        answer,
        firstQ.text,
        lang
      );

      const audio = await textToSpeech(botText, lang);
      session.index = 0;

      return res.json({
        finished: false,
        botText,
        audio,
        nextQuestion: firstQ
      });
    }

    const lang = session.lang;
    const currentQ = QUESTIONS[lang][session.index];

    // 2. WHY-QUESTION
    if (isWhyQuestion(answer)) {
      const reason = getQuestionExplanation(currentQ.id, lang);
      const reply = `${reason}\n\n${currentQ.text}`;
      const audio = await textToSpeech(reply, lang);

      return res.json({
        finished: false,
        botText: reply,
        audio,
        nextQuestion: currentQ
      });
    }

    // 3. VALIDATION
    let valid = false;

    if (currentQ.id === "age") {
      valid =
        isAgeAnswerHeuristic(answer) ||
        (await validateAnswer(currentQ.text, answer, lang));
    } else {
      valid = await validateAnswer(currentQ.text, answer, lang);
    }

    if (!valid) {
      const repeat =
        lang === "hi"
          ? `आपका उत्तर इस प्रश्न का जवाब नहीं लगता है। कृपया फिर से उत्तर दें।\n\n${currentQ.text}`
          : `It seems your response didn't answer the question. Please try again.\n\n${currentQ.text}`;

      const audio = await textToSpeech(repeat, lang);

      return res.json({
        finished: false,
        botText: repeat,
        audio,
        nextQuestion: currentQ
      });
    }

    // STORE ANSWER
    session.answers[currentQ.id] = answer;

    const nextIndex = session.index + 1;

    // 4. COMPLETED
    if (nextIndex >= QUESTIONS[lang].length) {
      const finalMsg =
        lang === "hi"
          ? "धन्यवाद, आपने सभी प्रश्न पूरे कर लिए हैं।"
          : "Thank you, you have completed all questions.";

      const audio = await textToSpeech(finalMsg, lang);

      return res.json({
        finished: true,
        botText: finalMsg,
        audio,
        history: session.history,
        answers: session.answers
      });
    }

    // 5. NEXT QUESTION
    const nextQ = QUESTIONS[lang][nextIndex];

    const botText = await generateConversationalMessage(
      currentQ.text,
      answer,
      nextQ.text,
      lang
    );

    const audio = await textToSpeech(botText, lang);

    session.index = nextIndex;

    res.json({
      finished: false,
      botText,
      audio,
      nextQuestion: nextQ
    });
  } catch (err) {
    console.error("NEUROBOT ERROR:", err.message);
    res.status(500).json({ error: "Processing error" });
  }
};

// =====================
// STT
// =====================
export const processSTT = [
  upload.single("audio"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No audio uploaded" });

      const eleven = new ElevenLabsClient({ apiKey: ELEVEN_KEY });

      const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype });

      const transcription = await eleven.speechToText.convert({
        file: audioBlob,
        modelId: "scribe_v1"
      });

      return res.json({ text: transcription.text });
    } catch (err) {
      console.error("STT ERROR:", err.message);
      res.status(500).json({ text: "" });
    }
  }
];

// =====================
// REPORT
// =====================
// =====================
// REPORT
// =====================

export const generateReport = async (req, res) => {
  const { sessionId } = req.body;
  const session = sessions[sessionId];

  if (!session) return res.status(400).json({ error: "Session not found" });

  try {
      const report = await generateMedicalReport(session.answers, session.lang);
      
      res.json({
        answers: session.answers,
        history: session.history,
        report // Include the generated report
      });
  } catch (err) {
      console.error("Report Error:", err);
      res.status(500).json({ error: "Failed to generate report" });
  }
};
