// src/pages/ChatPanel.jsx
import React, { useEffect, useState, useCallback } from "react";
import ChatBox from "../components/ChatBox";
import MessageBubble from "../components/MessageBubble";
import MicLottie from "../components/MicLottie";
import useSpeechRecognition from "../hooks/useSpeechRecognition";

const API_BASE = "http://localhost:4000";

const ChatPanel = () => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]); // {id, from:'bot'|'user', text}
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);

  // 🎙 speech recognition hook (you already created this)
  const {
    transcript,
    listening,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // 🔊 helper: play base64 audio from backend
  const playAudio = useCallback((audioDataUrl) => {
    if (!audioDataUrl) return;
    try {
      const audio = new Audio(audioDataUrl);
      setIsBotSpeaking(true);
      audio.play();
      audio.onended = () => setIsBotSpeaking(false);
    } catch (e) {
      console.error("Audio play error:", e);
      setIsBotSpeaking(false);
    }
  }, []);

  // 🚀 start conversation on mount
  useEffect(() => {
    const startConversation = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        const data = await res.json();

        setSessionId(data.sessionId);
        setCurrentQuestion(data.question || null);

        // first bot message
        setMessages([
          {
            id: "bot-intro",
            from: "bot",
            text: data.botText,
          },
        ]);

        playAudio(data.audio);
      } catch (err) {
        console.error("Error starting session:", err);
      } finally {
        setLoading(false);
      }
    };

    startConversation();
  }, [playAudio]);

  // 🧠 core function: send answer (from text input OR speech)
  const sendAnswer = useCallback(
    async (answerText) => {
      if (!answerText || !sessionId || finished) return;
      setLoading(true);

      // add user message to chat
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, from: "user", text: answerText },
      ]);

      try {
        const res = await fetch(`${API_BASE}/api/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, answer: answerText }),
        });

        const data = await res.json();

        // add bot reply (which already includes next question in natural language)
        setMessages((prev) => [
          ...prev,
          { id: `bot-${Date.now()}`, from: "bot", text: data.botText },
        ]);

        playAudio(data.audio);

        setFinished(Boolean(data.finished));
        setCurrentQuestion(data.nextQuestion || null);
      } catch (err) {
        console.error("Error sending answer:", err);
      } finally {
        setLoading(false);
      }
    },
    [sessionId, finished, playAudio]
  );

  // ✉️ text input submit
  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    sendAnswer(trimmed);
    setInput("");
  };

  // 🎙 when speech recognition finishes, use transcript as answer
  useEffect(() => {
    if (!listening && transcript.trim()) {
      const text = transcript.trim();
      sendAnswer(text);
      resetTranscript();
    }
  }, [listening, transcript, sendAnswer, resetTranscript]);

  // 📄 generate final report
  const handleGenerateReport = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();
      if (data.report) {
        setMessages((prev) => [
          ...prev,
          {
            id: `report-${Date.now()}`,
            from: "bot",
            text: `🩺 Summary report:\n\n${data.report}`,
          },
        ]);
      }
    } catch (err) {
      console.error("Report error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-panel">
      {/* Left: Lottie voice animation */}
      <div className="chat-panel-left">
        {/* This should be your big voice-wave Lottie */}
        <ChatBox isSpeaking={isBotSpeaking} />
      </div>

      {/* Right: text conversation + input */}
      <div className="chat-panel-right">
        <div className="chat-messages">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              from={msg.from}
              text={msg.text}
            />
          ))}
        </div>

        {/* Current question hint (optional UI) */}
        {currentQuestion && (
          <div className="current-question">
            <span>Current question:&nbsp;</span>
            <strong>{currentQuestion.text}</strong>
          </div>
        )}

        {/* Input + mic row */}
        <form className="chat-input-row" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={
              loading
                ? "Please wait..."
                : finished
                ? "Conversation finished. You can still ask something..."
                : "Type your answer here..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />

          {/* Mic Lottie button */}
          <button
            type="button"
            className="mic-button"
            onClick={listening ? stopListening : startListening}
          >
            <MicLottie active={listening} />
          </button>

          <button type="submit" className="send-button" disabled={loading}>
            Send
          </button>
        </form>

        {/* Generate report button */}
        {finished && (
          <div className="report-row">
            <button
              className="report-button"
              onClick={handleGenerateReport}
              disabled={loading}
            >
              Generate Screening Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
