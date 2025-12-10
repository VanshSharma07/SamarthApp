import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, Select, MenuItem, FormControl, InputLabel, Paper, Grid, Chip, LinearProgress, IconButton } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SendIcon from '@mui/icons-material/Send';
import api from '../../../services/api';
import WordListResults from './WordListResults';

const defaultWords = [
  'apple','chair','table','dog','book','shoe'
];

export default function WordListAssessment({ userId, onComplete }) {
  const [testId, setTestId] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle, study, recall, completed, scheduled, delayed
  const [words, setWords] = useState(defaultWords);
  const [trialCount, setTrialCount] = useState(3);
  const [currentTrial, setCurrentTrial] = useState(0);
  // manual typing removed — voice-only input
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recognitionTranscript, setRecognitionTranscript] = useState('');
  const [responses, setResponses] = useState({});
  const [studyWord, setStudyWord] = useState('');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startTest = async () => {
    try {
      const payload = { user_id: userId, words, trial_count: trialCount };
      const resp = await api.post('/tests/start', payload);
      const tid = resp.data.test_id || resp.data.testId;
      setTestId(tid);
      setPhase('study');
      playStudySequence();
    } catch (err) {
      console.error('Failed to start test', err);
      alert('Failed to start test');
    }
  };

  const playStudySequence = async () => {
    let i = 0;
    setPhase('study');
    const interval = setInterval(() => {
      if (i >= words.length) {
        clearInterval(interval);
        setStudyWord('');
        setCurrentTrial(1);
        // Small delay to ensure state is updated before phase change
        setTimeout(() => {
          setPhase('recall');
        }, 500);
        return;
      }
      setStudyWord(words[i]);
      i += 1;
    }, 1000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        try {
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        } catch (e) {
          setAudioUrl(null);
        }
      };
      recorderRef.current = mr;
      mr.start();
      // Try to start Web Speech API recognition in parallel to capture a transcript
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const rec = new SpeechRecognition();
            rec.lang = 'en-US';
            rec.interimResults = true;
            rec.maxAlternatives = 1;
            let interim = '';
            finalTranscriptRef.current = '';
            rec.onresult = (ev) => {
              let finalTranscript = '';
              interim = '';
              for (let i = 0; i < ev.results.length; i++) {
                const res = ev.results[i];
                if (res.isFinal) {
                  finalTranscript += res[0].transcript;
                } else {
                  interim += res[0].transcript;
                }
              }
              if (finalTranscript) {
                // accumulate final results
                finalTranscriptRef.current = (finalTranscriptRef.current ? finalTranscriptRef.current + ' ' : '') + finalTranscript;
                setRecognitionTranscript(finalTranscriptRef.current);
              } else {
                // show interim while waiting for final
                setRecognitionTranscript((prev) => (interim || prev));
              }
            };
            rec.onerror = (e) => {
              console.warn('SpeechRecognition error', e);
            };
            rec.onend = () => {
              // ensure final transcript is reflected in state when recognition stops
              if (finalTranscriptRef.current) setRecognitionTranscript(finalTranscriptRef.current);
            };
            recognitionRef.current = rec;
            try { rec.start(); } catch (e) { /* ignore start errors */ }
          }
      } catch (e) {
        console.warn('SpeechRecognition unavailable', e);
      }
      setRecording(true);
    } catch (err) {
      console.error('microphone error', err);
      alert('Microphone access denied or unavailable');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      setRecording(false);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      // Stop SpeechRecognition if running
      try {
        const rec = recognitionRef.current;
          if (rec) {
            try { rec.stop(); } catch (e) { /* ignore */ }
            // give recognition a brief moment to finalize
            setTimeout(() => {
              if (finalTranscriptRef.current) setRecognitionTranscript(finalTranscriptRef.current);
              recognitionRef.current = null;
            }, 150);
          }
      } catch (e) {
        console.warn('Error stopping SpeechRecognition', e);
      }
    }
  };

  const playAudio = () => {
    if (!audioUrl) return;
    const a = new Audio(audioUrl);
    a.play().catch(e => console.error('playback failed', e));
  };

  const uploadArtifact = async ({ file, artifactType = 'audio', trialNumber, responseText }) => {
    if (!testId) return;
    try {
      const form = new FormData();
      if (file) form.append('file', file, file.name || `${Date.now()}.webm`);
      form.append('artifactType', artifactType);
      if (trialNumber != null) form.append('trial_number', String(trialNumber));
        if (responseText != null) {
          // send raw string when possible (backend will accept JSON or plain string)
          if (typeof responseText === 'string') {
            form.append('response_text', responseText);
          } else {
            form.append('response_text', JSON.stringify(responseText));
          }
        }
      // Also include a plain transcript field for compatibility with ML endpoint
      if (typeof responseText === 'string' && responseText.trim().length > 0) {
        form.append('transcript', responseText);
      }

      await api.post(`/tests/${testId}/artifact`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (err) {
      console.error('upload failed', err);
    }
  };

  const submitTrial = async () => {
    const trialNumber = currentTrial;
    // Voice-only input: prefer recognition transcript; if audio recorded upload the file too
    const transcript = recognitionTranscript || '';
    if (audioBlob) {
      const file = new File([audioBlob], `trial-${trialNumber}.webm`, { type: audioBlob.type });
      await uploadArtifact({ file, artifactType: 'audio', trialNumber, responseText: transcript });
    } else if (transcript) {
      // No audio file but have a transcript from the recognizer
      await uploadArtifact({ file: null, artifactType: 'audio', trialNumber, responseText: transcript });
    }

    setResponses(prev => ({ ...prev, [trialNumber]: { hasAudio: !!audioBlob } }));
    setAudioBlob(null);

    if (currentTrial < trialCount) {
      setCurrentTrial(currentTrial + 1);
    } else {
      // finished immediate trials — ask backend to compute and persist results
      setPhase('completed');
      try {
        await api.post(`/tests/${testId}/complete`);
        // show results viewer which will poll for backend scores
        setShowResults(true);
      } catch (err) {
        console.error('complete call failed', err);
        setShowResults(true);
      }
    }
  };

  const renderIdle = () => (
    <Paper sx={{ p: 3 }} elevation={2}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={8}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Word List Memory Test</Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>You will see a short list of words and then be asked to recall them across {trialCount} trials. Use the microphone to speak your answers.</Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel id="trial-count-label">Trials</InputLabel>
            <Select
              labelId="trial-count-label"
              value={trialCount}
              label="Trials"
              onChange={(e) => setTrialCount(e.target.value)}
            >
              <MenuItem value={2}>2</MenuItem>
              <MenuItem value={3}>3</MenuItem>
              <MenuItem value={4}>4</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" size="large" onClick={startTest} startIcon={<PlayArrowIcon />}>Start Test</Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );

  const renderStudy = () => (
    <Paper sx={{ p: 3 }} elevation={1}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Study Phase</Typography>
        <Chip label="Study" color="primary" />
      </Box>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 140 }}>
        <Typography sx={{ fontSize: 40, fontWeight: 700, transition: 'opacity 300ms ease-in-out' }} aria-live="polite">{studyWord}</Typography>
      </Box>
      <Typography sx={{ mt: 2, color: 'text.secondary' }}>Words are shown briefly. Get ready to recall.</Typography>
      <LinearProgress sx={{ mt: 2 }} />
    </Paper>
  );

  const renderRecall = () => (
    <Paper sx={{ p:3 }} elevation={1}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Recall — Trial {currentTrial} of {trialCount}</Typography>
        <Chip label={`Trial ${currentTrial}/${trialCount}`} color="secondary" />
      </Box>

      {/* Manual typing removed — voice input only. */}

      <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {!recording ? (
            <Button startIcon={<MicIcon />} variant="outlined" onClick={startRecording} aria-label="Start recording" size="large">Record</Button>
          ) : (
            <Button color="error" startIcon={<StopIcon />} variant="contained" onClick={stopRecording} aria-label="Stop recording" size="large">Stop</Button>
          )}

          {audioUrl && (
            <IconButton color="primary" onClick={playAudio} aria-label="Play recording" size="large"><PlayArrowIcon /></IconButton>
          )}
        </Box>

        <Button 
          variant="contained" 
          color="success"
          endIcon={<SendIcon />} 
          onClick={submitTrial} 
          aria-label="Submit trial"
          fullWidth
          sx={{ py: 1.5, fontSize: '1rem', fontWeight: 'bold' }}
        >
          Submit Trial {currentTrial}
        </Button>

        {/* Transcript is intentionally not displayed to avoid cueing the participant */}
      </Box>
    </Paper>
  );

  const renderCompleted = () => (
    <Paper sx={{ p:3 }} elevation={1}>
      <Typography variant="h6">Immediate trials completed</Typography>
      <Typography sx={{ mt: 1, color: 'text.secondary' }}>Immediate trials are complete — view your results.</Typography>
      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={() => setShowResults(true)}>View Results</Button>
      </Box>
    </Paper>
  );

  const renderScheduled = () => (
    null
  );

  const renderDelayed = () => (
    null
  );

  return (
    <Box>
      {showResults && (
        <Box sx={{ mb: 2 }}>
          <WordListResults testId={testId} onClose={() => { setShowResults(false); }} />
        </Box>
      )}
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          {phase === 'idle' && renderIdle()}
          {phase === 'study' && renderStudy()}
          {phase === 'recall' && renderRecall()}
          {phase === 'completed' && renderCompleted()}
          {phase === 'scheduled' && renderScheduled()}
          {phase === 'delayed' && renderDelayed()}
          {phase === 'done' && (
            <Paper sx={{ p:3 }} elevation={1}>
              <Typography variant="h6">Thank you — responses submitted</Typography>
            </Paper>
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p:2 }} elevation={1}>
            <Typography variant="subtitle1">Test Progress</Typography>
            <Box sx={{ mt:1 }}>
              <LinearProgress variant="determinate" value={(currentTrial / Math.max(1, trialCount)) * 100} />
              <Typography sx={{ mt:1 }}>{currentTrial > 0 ? `Trial ${currentTrial} of ${trialCount}` : 'Not started'}</Typography>
            </Box>
            <Box sx={{ mt:2 }}>
              <Typography variant="caption">Keep speaking your responses when prompted. The words and transcripts are hidden here to reduce test cueing.</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
