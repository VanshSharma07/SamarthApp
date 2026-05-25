import {
  detectLanguage,
  processConversationalTurn,
  generateMedicalReport
} from "../services/neuroBot.service.js";

import { v4 as uuidv4 } from "uuid";
import NeuroBotAssessment from "../models/NeuroBotAssessment.js";

const sessions = {};

const PREDEFINED_QUESTIONS = {
  en: [
    "What is your age?",
    "Have you been experiencing any recent memory loss or forgetting recently learned information?",
    "Do you find it difficult to perform familiar, daily tasks?",
    "Have you felt confused about time or place recently?",
    "Do you have trouble understanding visual images and spatial relationships?",
    "Are you having problems finding the right words when speaking or writing?",
    "Have you been misplacing things and losing the ability to retrace your steps?",
    "Have you noticed any decreased or poor judgment in your decision making?",
    "Have you withdrawn from work, hobbies, or social activities lately?",
    "Have you experienced any recent changes in your mood or personality?"
  ],
  hi: [
    "आपकी उम्र क्या है?",
    "क्या आप हाल ही में कुछ भूलने लगे हैं या नई सीखी हुई बातें याद रखने में परेशानी हो रही है?",
    "क्या आपको अपने रोजमर्रा के काम करने में कठिनाई होती है?",
    "क्या आप समय या जगह को लेकर अक्सर भ्रमित (confused) रहते हैं?",
    "क्या आपको चीजों को देखने या उनके आकार को समझने में परेशानी होती है?",
    "क्या बोलते या लिखते समय सही शब्द ढूंढने में आपको दिक्कत होती है?",
    "क्या आप चीजें रखकर भूल जाते हैं और उन्हें दोबारा ढूंढ नहीं पाते?",
    "क्या आपको लगता है कि आपकी निर्णय लेने की क्षमता (judgment) कमजोर हो गई है?",
    "क्या आपने हाल ही में अपने काम, शौक या सामाजिक गतिविधियों से दूरी बना ली है?",
    "क्या आपने हाल ही में अपने स्वभाव या मूड में कोई बदलाव महसूस किया है?"
  ]
};

export const startSession = async (req, res) => {
  const { userId } = req.body || {};
  const sessionId = uuidv4();

  sessions[sessionId] = {
    userId,
    extractedData: {}, // will hold question/answer pairs
    history: [],
    questionIndex: -1,
    lang: null
  };

  const text =
    "Hello! Before we begin, please tell me your preferred language: English or Hindi.";

  sessions[sessionId].history.push({
    from: "bot",
    text,
    meta: { step: "language_prompt" }
  });

  res.json({
    sessionId,
    botText: text
  });
};

export const processAnswer = async (req, res) => {
  try {
    const { sessionId, answer } = req.body;
    const session = sessions[sessionId];

    if (!session) return res.status(400).json({ error: "Session not found" });

    session.history.push({ from: "user", text: answer });

    // 1. LANGUAGE SELECT
    if (!session.lang) {
      session.lang = detectLanguage(answer);
      session.questionIndex = 0; // Start questions
      
      const botText = PREDEFINED_QUESTIONS[session.lang][session.questionIndex];
      session.history.push({ from: "bot", text: botText });
      
      return res.json({
        finished: false,
        botText
      });
    }

    // Save previous question's answer
    const prevQ = PREDEFINED_QUESTIONS[session.lang][session.questionIndex];
    session.extractedData[`Question ${session.questionIndex + 1}: ${prevQ}`] = answer;
    
    session.questionIndex++;

    if (session.questionIndex >= PREDEFINED_QUESTIONS[session.lang].length) {
       const finishedText = session.lang === 'hi' 
            ? "धन्यवाद, आपकी स्क्रीनिंग पूरी हो गई है। हमारी AI आपकी रिपोर्ट तैयार कर रही है।" 
            : "Thank you, your screening is complete. Our AI is now generating your report.";
       
       session.history.push({ from: "bot", text: finishedText });
       return res.json({
         finished: true,
         botText: finishedText,
         history: session.history,
         answers: session.extractedData
       });
    }

    const nextQ = PREDEFINED_QUESTIONS[session.lang][session.questionIndex];
    session.history.push({ from: "bot", text: nextQ });

    return res.json({
      finished: false,
      botText: nextQ
    });
    
  } catch (err) {
    console.error("NEUROBOT ERROR:", err.message);
    res.status(500).json({ error: "Processing error" });
  }
};

// =====================
// REPORT
// =====================

export const generateReport = async (req, res) => {
  const { sessionId } = req.body;
  const session = sessions[sessionId];

  if (!session) return res.status(400).json({ error: "Session not found" });

  try {
      // Generate using the dynamically extracted data
      const report = await generateMedicalReport(session.extractedData, session.lang || "en");
      
      // Save session data to DB as a specialized assessment
      if (session.userId) {
          console.log(`[NeuroBot] Attempting to save assessment result for user: ${session.userId}`);
          try {
              const savedAssessment = await NeuroBotAssessment.create({
                  userId: session.userId,
                  type: 'neurobot',
                  status: 'COMPLETED',
                  timestamp: new Date(),
                  history: session.history,
                  metrics: {
                      riskLevel: report?.riskLevel || 'Unknown',
                      summary: report?.summary || '',
                      recommendations: report?.recommendations || [],
                      overallScore: report?.riskLevel === 'Low' ? 90 : (report?.riskLevel === 'Medium' ? 60 : 30)
                  },
                  report: report || {}
              });
              console.log(`[NeuroBot] Assessment saved successfully with ID: ${savedAssessment._id}`);
          } catch (dbErr) {
              console.error("[NeuroBot] Failed to save assessment to DB:", dbErr);
          }
      } else {
          console.warn("[NeuroBot] No userId found in session, skipping DB persistence.");
      }

      res.json({
        answers: session.extractedData,
        history: session.history,
        report
      });
  } catch (err) {
      console.error("Report Error:", err);
      res.status(500).json({ error: "Failed to generate report" });
  }
};
