import { useEffect, useCallback } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

export default function useMic(onComplete) {
  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    if (!listening && transcript.trim().length > 0) {
      onComplete(transcript.trim());
      resetTranscript();
    }
  }, [listening]);

  const startListening = useCallback(() => {
    console.log("HOOK: startListening called");
    SpeechRecognition.startListening({ continuous: false, language: "en-IN" });
  }, []);

  const stopListening = useCallback(() => {
    SpeechRecognition.stopListening();
  }, []);

  return { transcript, listening, startListening, stopListening };
}