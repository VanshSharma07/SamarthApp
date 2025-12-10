import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { Blob } from "buffer";

const WORKER_URL = "https://llm-worker.karan-cse.workers.dev/";
const WORKER_KEY = process.env.WORKER_API_KEY;

const ELEVEN_KEY = process.env.ELEVEN_API_KEY;
const ELEVEN_VOICE_EN = process.env.ELEVEN_VOICE_EN;
const ELEVEN_VOICE_HI = process.env.ELEVEN_VOICE_HI;

// =========================
// 1. DETECT LANGUAGE
// =========================
export function detectLanguage(text) {
  if (!text) return "en";
  const lower = text.toLowerCase();
  // Check for "Hindi", "Hi", or Devanagari script or Gujarati/Bengali etc commonly used in India
  // Added \u0900-\u0D7F covering Devanagari, Bengali, Gurmukhi, Gujarati, Oriya, Tamil, Telugu, Kannada, Malayalam
  if (
    lower.includes("hindi") || 
    lower.includes("hndi") || 
    lower.includes("india") ||
    lower === "hi" || 
    /[\u0900-\u0D7F]/.test(text) 
  ) {
    return "hi";
  }
  return "en";
}

// =========================
// 2. WHY-QUESTION DETECTION
// =========================
export function isWhyQuestion(answerRaw) {
  if (!answerRaw) return false;

  const text = answerRaw.trim().toLowerCase();

  const patterns = [
    "why", "kyun", "kyon", "क्यों", "क्युं", "क्यूँ", "kyu",
    "main kyun bataun", "main kyon bataun", "मैं क्यों बताऊ",
    "मुझे क्यों बताना", "purpose", "reason", "karan", "wajah",
    "kisliye", "what is the reason", "kya zarurat", "zarurat kya",
    "why should i", "i don't want to tell", "i don’t want to tell", "mai nahi bataunga",
    "मैं नहीं बताऊँगा", "jana hai"
  ];

  return patterns.some((p) => text.includes(p));
}

// =========================
// 3. EXPLANATION OF QUESTION
// =========================
export function getQuestionExplanation(questionId, lang) {
  const explanations = {
    age: {
      en: "Your age helps assess neurological risk and tailor screening accurately.",
      hi: "आपकी उम्र जानना न्यूरोलॉजिकल जोखिम और सही स्क्रीनिंग समझने के लिए आवश्यक है।"
    },
    memory: {
      en: "Memory issues are an early sign in many neurological conditions.",
      hi: "याददाश्त की समस्या कई न्यूरोलॉजिकल स्थितियों का शुरुआती संकेत हो सकती है।"
    },
    daily: {
      en: "Daily task difficulties help measure how symptoms impact your routine.",
      hi: "रोज़मर्रा के कार्यों में कठिनाई से पता चलता है कि समस्या आपके जीवन को कितना प्रभावित कर रही है।"
    },
    tremor: {
      en: "Tremors are a key indicator in Parkinson’s screening.",
      hi: "कंपकंपी पार्किन्सन की स्क्रीनिंग में एक महत्वपूर्ण संकेत है।"
    },
    balance: {
      en: "Balance issues can signal neurological or motor problems.",
      hi: "संतुलन की समस्या न्यूरोलॉजिकल या मोटर दिक्कतों का संकेत हो सकती है।"
    },
    seizure: {
      en: "Seizure-like episodes help identify epilepsy-related risks.",
      hi: "दौरे जैसे लक्षण एपिलेप्सी का जोखिम समझने में मदद करते हैं।"
    },
    trigger: {
      en: "Trigger sensitivity helps identify seizure-related patterns.",
      hi: "ट्रिगर संवेदनशीलता दौरे से जुड़े पैटर्न समझने में मदद करती है।"
    }
  };

  return explanations[questionId]?.[lang] || "";
}

// =========================
// 4. QUESTION BANK
// =========================
export const QUESTIONS = {
  en: [
    { id: "age", text: "May I know your age?", type: "number" },
    { id: "memory", text: "Have you noticed memory problems recently?", type: "yesno" },
    { id: "daily", text: "Do these issues affect your daily tasks?", type: "yesno" },
    { id: "tremor", text: "Do you experience tremors or shaking at rest?", type: "yesno" },
    { id: "balance", text: "Any stiffness or trouble keeping balance?", type: "yesno" },
    { id: "seizure", text: "Have you had seizure-like episodes?", type: "yesno" },
    { id: "trigger", text: "Do bright lights, stress or lack of sleep trigger unusual spells?", type: "yesno" }
  ],
  hi: [
    { id: "age", text: "क्या मैं आपकी उम्र जान सकता हूँ?", type: "number" },
    { id: "memory", text: "क्या आपने हाल ही में याददाश्त की समस्या महसूस की है?", type: "yesno" },
    { id: "daily", text: "क्या ये समस्याएँ आपके रोज़मर्रा के कामों को प्रभावित करती हैं?", type: "yesno" },
    { id: "tremor", text: "क्या आपको आराम की स्थिति में हाथ कांपने जैसी समस्या होती है?", type: "yesno" },
    { id: "balance", text: "क्या आपको कठोरता या संतुलन रखने में परेशानी होती है?", type: "yesno" },
    { id: "seizure", text: "क्या आपको कभी दौरे जैसे लक्षण हुए हैं?", type: "yesno" },
    { id: "trigger", text: "क्या तेज़ रोशनी, तनाव या नींद की कमी से आपको कोई असामान्य समस्या होती है?", type: "yesno" }
  ]
};

// =========================
// 5. AGE HEURISTIC
// =========================
export function extractLLMResponse(data) {
  return data?.response || data?.output || data?.message || data?.text || "";
}

// =========================
// 5. AGE HEURISTIC
// =========================
export function isAgeAnswerHeuristic(answerRaw) {
  if (!answerRaw) return false;
  const answer = answerRaw.trim().toLowerCase();

  const numMatch = answer.match(/\d{1,3}/);
  if (numMatch) {
    const val = parseInt(numMatch[0], 10);
    if (val >= 1 && val <= 120) return true;
  }

  const hasYearWord = /साल|वर्ष/.test(answer);
  const hindiNumbers = /(एक|दो|तीन|चार|पांच|पाँच|छह|सात|आठ|नौ|दस|ग्यारह|बारह|तेरह|चौदह|पंद्रह|सोलह|सत्रह|अठारह|उन्नीस|बीस|इक्कीस|बाइस|तेईस)/;
  if (hasYearWord && (hindiNumbers.test(answer) || numMatch)) return true;

  return false;
}

// =========================
// 6. VALIDATE ANSWER USING LLM
// =========================
export async function validateAnswer(question, userAnswer, lang) {
  const prompt = `
You are an AI that checks whether a patient's reply actually answers a medical question.

QUESTION: "${question}"
USER ANSWER: "${userAnswer}"
LANGUAGE: ${lang}

IMPORTANT:
- The user might reply in **Hinglish** (Hindi in English script) e.g. "han", "haan", "ha" = Yes, "nahi", "na" = No.
- The user might reply in **Devanagari** transliteration of English words (e.g. "ट्वेंटी टू" = Twenty Two).
- The user might answer in a MIX of English and Hindi.
- IF the answer contains a valid number or age (even if written in Hindi script like "पच्चीस" or "ट्वेंटी"), accept it.
- Accept these as RELEVANT answers.

Respond with ONLY:
YES → if answer is relevant (confirms age, yes/no, or explains)
NO → if answer is irrelevant or evasive
`;

  const response = await axios.post(
    WORKER_URL,
    { messages: [{ role: "user", content: prompt }] },
    { headers: { "x-api-key": WORKER_KEY } }
  );

  return extractLLMResponse(response.data).trim().toUpperCase() === "YES";
}

// =========================
// 7. GENERATE CONVERSATIONAL MSG
// =========================
export async function generateConversationalMessage(prevQ, answer, nextQ, lang) {
  const prompt = `
You are a warm, professional neurological screening assistant.

LANGUAGE: ${lang}

INSTRUCTIONS:
1. Acknowledge the user's answer briefly and empathetically.
2. TRANSITION DIRECTLY to the "Target Next Question".
3. **CRITICAL**: You MUST ask the "Target Next Question" content EXACTLY as provided below.
4. **DO NOT** ask "Shall we begin?", "Are you ready?", or "Do you want to know about health?".
5. **DO NOT** change the meaning of the "Target Next Question".

FORMAT:
[Short acknowledgement/Transition]
<blank line>
[Target Next Question Content]

Previous Question: "${prevQ}"
User Answer: "${answer}"
Target Next Question: "${nextQ}"
`;

  const response = await axios.post(
    WORKER_URL,
    { messages: [{ role: "user", content: prompt }] },
    { headers: { "x-api-key": WORKER_KEY } }
  );

  return extractLLMResponse(response.data);
}

// =========================
// 8. TEXT → SPEECH
// =========================
export async function textToSpeech(text, lang) {
  const voiceId = lang === "hi" ? ELEVEN_VOICE_HI : ELEVEN_VOICE_EN;

  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      text,
      voice_settings: { stability: 0.4, similarity_boost: 0.9 }
    },
    {
      headers: { "xi-api-key": ELEVEN_KEY, "Content-Type": "application/json" },
      responseType: "arraybuffer"
    }
  );

  return `data:audio/mpeg;base64,${Buffer.from(response.data).toString("base64")}`;
}

// =========================
// 9. GENERATE MEDICAL REPORT
// =========================
export async function generateMedicalReport(answers, lang) {
  const prompt = `
You are a neurological expert AI.
Generate a "Patient Friendly Report" based on the screening answers below.

LANGUAGE: ${lang}

ANSWERS:
${JSON.stringify(answers, null, 2)}

INSTRUCTIONS:
1. **Summary**: Brief explanation of the patient's status.
2. **Risk Assessment**: High, Medium, or Low risk of potential neurological issues (Alzheimer's/Parkinson's context).
3. **Recommendations**: Simple advice (e.g., consult a neurologist, sleep better, manage stress).
4. **Tone**: Empathetic, professional, and clear. Avoid overly medical jargon.
5. **Output**: Return ONLY a valid JSON object.

JSON FORMAT:
{
  "summary": "...",
  "riskLevel": "Low" | "Medium" | "High",
  "reasoning": "...",
  "recommendations": ["...", "..."]
}
`;

  const response = await axios.post(
    WORKER_URL,
    { messages: [{ role: "user", content: prompt }] },
    { headers: { "x-api-key": WORKER_KEY } }
  );

  try {
      const text = extractLLMResponse(response.data);
      // Clean up potential markdown code blocks
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
  } catch (e) {
      console.error("Report Generation Failed:", e);
      return {
          summary: "Could not generate report at this time.",
          riskLevel: "Unknown",
          reasoning: "Analysis failed.",
          recommendations: ["Please consult a doctor directly."]
      };
  }
}