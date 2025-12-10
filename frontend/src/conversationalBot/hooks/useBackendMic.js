import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadAudio } from '../services/botService';

const SILENCE_THRESHOLD = 15; // Amplitude threshold (0-255)
const SILENCE_DURATION = 2000; // Time in ms to wait before stopping

export default function useBackendMic(onComplete) {
  const [listening, setListening] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const onCompleteRef = useRef(onComplete);
  
  // Audio Analysis Refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const rafIdRef = useRef(null);
  const silenceStartRef = useRef(null);
  const hasSpokenRef = useRef(false); // Ensure user spoke at least once before stopping

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      console.log("Backend Mic: Stopped recording");
    }
    
    // Cleanup Analysis
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (audioContextRef.current) {
        audioContextRef.current.close().catch(e => console.error(e));
        audioContextRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      hasSpokenRef.current = false;
      silenceStartRef.current = Date.now(); // Reset silence timer

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        // Only upload if user actually spoke something significant? 
        // For now, uploaded everything if manual stop or auto-stop
        try {
          const text = await uploadAudio(audioBlob);
          if (text && text.trim()) {
            if (onCompleteRef.current) {
                onCompleteRef.current(text.trim());
            }
          }
        } catch (error) {
          console.error("STT Failed:", error);
        }
        
        setListening(false);
        mediaRecorderRef.current = null;
      };

      mediaRecorder.start();
      setListening(true);
      console.log("Backend Mic: Started recording");

      // --- Silence Detection Setup ---
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkSilence = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for(let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Threshold Logic
        if (average > SILENCE_THRESHOLD) {
            // User is speaking
            silenceStartRef.current = Date.now();
            hasSpokenRef.current = true;
        } else {
            // Silence detected
            if (hasSpokenRef.current && (Date.now() - silenceStartRef.current > SILENCE_DURATION)) {
                // Silence Duration Exceeded -> Stop
                console.log("Backend Mic: Auto-stopping due to silence");
                stopListening();
                return; // loop ends
            }
        }
        
        rafIdRef.current = requestAnimationFrame(checkSilence);
      };

      checkSilence();

    } catch (err) {
      console.error("Error accessing microphone:", err);
      setListening(false);
    }
  }, [stopListening]);

  // Force cleanup on unmount
  useEffect(() => {
    return () => {
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  return { listening, startListening, stopListening };
}
