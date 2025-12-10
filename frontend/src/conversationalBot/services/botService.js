import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/neurobot';

/**
 * Starts a new conversational session.
 * @returns {Promise<Object>} The initial session data (sessionId, audio, botText).
 */
export const startBotSession = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}/start`);
    return response.data;
  } catch (error) {
    console.error("Error starting bot session:", error);
    throw error;
  }
};

/**
 * Sends a user answer to the bot.
 * @param {string} sessionId - The current session ID.
 * @param {string} answer - The user's text answer.
 * @returns {Promise<Object>} The bot's response data (nextQuestion, audio, botText, finished).
 */
export const sendBotAnswer = async (sessionId, answer) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/answer`, {
      sessionId,
      answer
    });
    return response.data;
  } catch (error) {
    console.error("Error sending bot answer:", error);
    throw error;
  }
};
/**
 * Sends audio blob to backend for Speech-to-Text.
 * @param {Blob} audioBlob - The recorded audio blob.
 * @returns {Promise<string>} The transcribed text.
 */
export const uploadAudio = async (audioBlob) => {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm'); // 'audio.webm' or .mp3 depending on recorder

    const response = await axios.post(`${API_BASE_URL}/stt`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.text;
  } catch (error) {
    console.error("Error uploading audio for STT:", error);
    throw error;
  }
};

/**
 * Retrieves the session report.
 * @param {string} sessionId 
 * @returns {Promise<Object>} Report data
 */
export const getBotReport = async (sessionId) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/report`, { sessionId });
        return response.data;
    } catch (error) {
        console.error("Error fetching report:", error);
        throw error;
    }
};
