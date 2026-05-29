import axios from "axios";
import { v4 as uuidv4 } from "uuid";
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_API_URL = process.env.LLM_API_URL;

async function callLLM(prompt) {
  const response = await axios.post(
    LLM_API_URL,
    { messages: [{ role: "user", content: prompt }] },
    { headers: { "x-api-key": LLM_API_KEY } }
  );

  let text;
  if (response.data.output) {
    text = response.data.output;
  } else if (response.data.choices && response.data.choices[0]) {
    text = response.data.choices[0].message?.content || response.data.choices[0].text;
  } else if (response.data.content) {
    text = response.data.content;
  } else if (response.data.result) {
    text = response.data.result;
  } else if (typeof response.data === 'string') {
    text = response.data;
  }

  return text;
}

function extractJsonString(text) {
  if (!text) return "";
  let jsonStr = text;
  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
  }

  return jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
}

function sanitizeJsonString(jsonStr) {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonStr.length; i += 1) {
    const ch = jsonStr[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        result += ch;
        continue;
      }

      if (ch === "\\") {
        escaped = true;
        result += ch;
        continue;
      }

      if (ch === '"') {
        inString = false;
        result += ch;
        continue;
      }

      if (ch === "\n" || ch === "\r") {
        result += "\\n";
        continue;
      }

      if (ch === "\t") {
        result += "\\t";
        continue;
      }

      result += ch;
      continue;
    }

    if (ch === '"') {
      inString = true;
    }

    result += ch;
  }

  return result.replace(/,\s*([}\]])/g, "$1");
}

function parseLlmJson(text) {
  const raw = extractJsonString(text);
  if (!raw) {
    throw new Error("Empty JSON response");
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    const sanitized = sanitizeJsonString(raw);
    return JSON.parse(sanitized);
  }
}

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
// 2. PROCESS CONVERSATIONAL TURN
// =========================
export async function processConversationalTurn(history, currentData, lang) {
  const prompt = `
You are a neurological expert AI conducting an Alzheimer's disease screening.
Your goal is to ask STRICTLY 8 to 10 questions to gather information on these 10 criteria:
1. Patient's Age
2. Recent memory loss (forgetting recently learned information)
3. Difficulty performing familiar, daily tasks
4. Confusion with time or place (disorientation)
5. Trouble understanding visual and spatial relationships
6. Problems with words in speaking or writing
7. Misplacing things and losing the ability to retrace steps
8. Decreased or poor judgment
9. Withdrawal from work, hobbies, or social activities
10. Changes in mood and personality

Currently Extracted Data:
${JSON.stringify(currentData)}

Conversation History:
${history.map(h => `${h.from}: ${h.text}`).join("\n")}

INSTRUCTIONS:
1. **BE CONCISE**: Keep your response extremely short (maximum 1 or 2 sentences). Do not stretch your responses.
2. Speak naturally and empathetically, but get straight to the point.
3. If the user asks a question, answer it medically but very briefly.
4. Ask ONE follow-up question to gather the next missing piece of information.
5. Extract the user's answers into "extractedData" based on their replies. Update the existing data.
6. STRICTLY LIMIT your total questions to 8-10. Once you have asked at least 8 questions, or once all necessary criteria are gathered, or if the user refuses to continue, you MUST set "finished" to true and let the assessment end.
7. Language must be: ${lang === 'hi' ? 'Hindi (can be written in English characters or Devanagari based on what the user types)' : 'English'}. Respond in the language they are using.

OUTPUT EXCLUSIVELY AS A VALID RAW JSON OBJECT EXACTLY LIKE THIS:
{
  "botText": "Your conversational response goes here...",
  "extractedData": {
    "age": "25",
    "memory": "No issues",
    "daily_tasks": "pending..."
  },
  "finished": false
}
`;

  try {
    const text = await callLLM(prompt);
    
    if (typeof text === 'object' && text !== null) {
      return text;
    }

    return parseLlmJson(text);
  } catch (e) {
    console.error("LLM Parse Error:", e);
    return {
      botText: lang === 'hi' ? 'मुझे वह समझने में परेशानी हुई। कृपया फिर से बताएं?' : "I'm having trouble processing that right now. Could you repeat?",
      extractedData: currentData,
      finished: false
    };
  }
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

ENSURE the output starts with { and ends with }. No additional dialogue or formatting.
`;

  try {
      const text = await callLLM(prompt);

      if (typeof text === 'object' && text !== null) {
        return text;
      }

      return parseLlmJson(text);
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