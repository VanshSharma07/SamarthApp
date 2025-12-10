import { useState, useRef } from "react";

export default function useRecorder() {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = async () => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecording(false);
        resolve(blob);
      };

      mediaRecorder.stop();
    });
  };

  return { recording, startRecording, stopRecording };
}
