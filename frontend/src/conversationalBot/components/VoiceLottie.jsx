import Lottie from "lottie-react";
import voiceAnim from "../animations/voice wave.json";

export default function VoiceLottie({ isSpeaking }) {
  return (
    <div style={{ width: "300px" }}>
      <Lottie
        animationData={voiceAnim}
        loop={isSpeaking}
        autoplay={isSpeaking}
      />
    </div>
  );
}
