import { useRef, useEffect } from "react";
import Lottie from "lottie-react";
import micAnim from "../animations/mic.json";

export default function MicLottie({ listening, onClick }) {
  const lottieRef = useRef(null);

  useEffect(() => {
    if (!listening && lottieRef.current) {
      lottieRef.current.stop();
    } else if (listening && lottieRef.current) {
      lottieRef.current.play();
    }
  }, [listening]);

  return (
    <div 
      onClick={onClick} 
      className="mic-button"
      title={listening ? "Tap to stop" : "Tap to speak"}
    >
      <Lottie 
        lottieRef={lottieRef} 
        animationData={micAnim} 
        loop={true} 
        autoplay={false}
      />
    </div>
  );
}
