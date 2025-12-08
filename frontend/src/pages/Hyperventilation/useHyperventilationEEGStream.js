import { useEffect, useRef, useState } from 'react';

// Vite env for stream URL
const WS_URL = import.meta.env.VITE_HV_WS || 'ws://localhost:5000/tests/hyperventilation/stream';

const clampArray = (arr, maxLen) => (arr.length > maxLen ? arr.slice(arr.length - maxLen) : arr);

export default function useHyperventilationEEGStream(testId) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [eegData, setEegData] = useState([]);
  const [ecgData, setEcgData] = useState([]);
  const [hr, setHr] = useState(0);
  const [bands, setBands] = useState({ delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 });
  const [spikeDetected, setSpikeDetected] = useState(false);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const connect = () => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(WS_URL + (testId ? `?testId=${testId}` : ''));
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = (e) => console.error('HV WS error', e);
    ws.onmessage = (evt) => {
      try {
        const d = JSON.parse(evt.data);
        if (d.eeg_raw) {
          setEegData(prev => clampArray(prev.concat(d.eeg_raw), 1024));
        }
        if (d.ecg_raw) {
          setEcgData(prev => clampArray(prev.concat(d.ecg_raw), 1024));
        }
        if (d.bands) setBands(d.bands);
        if (typeof d.hr !== 'undefined') setHr(d.hr);
        if (d.spikeDetected) {
          setSpikeDetected(true);
          setTimeout(() => setSpikeDetected(false), 800);
        }
      } catch (e) { console.error('hv ws parse', e); }
    };
  };

  const disconnect = () => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) { }
      wsRef.current = null;
    }
    setConnected(false);
  };

  return { eegData, ecgData, hr, bands, spikeDetected, connected, connect, disconnect };
}
