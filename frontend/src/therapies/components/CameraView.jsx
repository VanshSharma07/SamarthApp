import React, { useEffect, useRef } from 'react';

/**
 * CameraView component for live video, frame processing, and overlay rendering.
 * Props:
 * - videoRef: ref to the video element (controlled by parent)
 * - canvasRef: ref to the canvas element (optional, for parent access)
 * - onFrame(video, ctx): called with each frame, for ML processing and overlay
 * - renderOverlay(ctx, width, height): called after frame for custom overlay
 * - cameraReady: boolean, if camera is ready
 * - setCameraReady: function, called when camera is ready
 * - width, height: video/canvas dimensions
 */
const CameraView = ({ videoRef, canvasRef, onFrame, renderOverlay, cameraReady, setCameraReady, width = 640, height = 480 }) => {
  const localCanvasRef = useRef(null);
  const animationRef = useRef(null);

  // Animation loop: process frame and draw overlay
  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef ? canvasRef.current : localCanvasRef.current;
      if (videoRef && videoRef.current && canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        ctx.restore();
        if (onFrame) onFrame(videoRef.current, ctx);
        if (renderOverlay) renderOverlay(ctx, width, height);
      }
      animationRef.current = requestAnimationFrame(draw);
    };
    if (cameraReady) {
      animationRef.current = requestAnimationFrame(draw);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [cameraReady, onFrame, renderOverlay, width, height, videoRef, canvasRef]);

  useEffect(() => {
    if (videoRef && videoRef.current) {
      videoRef.current.onloadedmetadata = () => {
        setCameraReady && setCameraReady(true);
      };
    }
  }, [videoRef, setCameraReady]);

  // Camera setup logic: getUserMedia and srcObject assignment
  useEffect(() => {
    let stream;
    const setupCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width, height, facingMode: 'user' } });
        if (videoRef && videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        setCameraReady && setCameraReady(false);
      }
    };
    setupCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoRef, width, height, setCameraReady]);

  return (
    <div style={{ position: 'relative', width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 20, boxShadow: '0 4px 24px #0091a122', overflow: 'hidden' }}>
      {/* Show video as background for debugging and clarity */}
      <video ref={videoRef} width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, opacity: 0.7 }} playsInline muted autoPlay />
      <canvas ref={canvasRef ? canvasRef : localCanvasRef} width={width} height={height} style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%', borderRadius: 20, boxShadow: '0 2px 16px #0002', background: 'transparent' }} />
      {!cameraReady && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#0008', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <span>Camera not ready...</span>
        </div>
      )}
    </div>
  );
};

export default CameraView;
