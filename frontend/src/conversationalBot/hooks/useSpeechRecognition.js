import { useEffect, useCallback } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

export default function useMic(onComplete, language = 'en-IN') {
  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    if (!listening && transcript.trim().length > 0) {
      onComplete(transcript.trim());
      resetTranscript();
    }
  }, [listening, transcript, onComplete, resetTranscript]);

  const startListening = useCallback(() => {
    console.log(`HOOK: startListening called for ${language}`);
    SpeechRecognition.startListening({ continuous: false, language });
  }, [language]);

  const stopListening = useCallback(() => {
    SpeechRecognition.stopListening();
  }, []);

  return { transcript, listening, startListening, stopListening };
}