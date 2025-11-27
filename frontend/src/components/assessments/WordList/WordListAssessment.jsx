import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Paper, Grid, Chip, LinearProgress, IconButton } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SendIcon from '@mui/icons-material/Send';
import api from '../../../services/api';
import WordListResults from './WordListResults';

const defaultWords = [
  'apple','chair','table','penny','dog','window','river','book','shoe','garden'
];

export default function WordListAssessment({ userId, onComplete }) {
  const [testId, setTestId] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle, study, recall, completed, scheduled, delayed
  const [words, setWords] = useState(defaultWords);
  const [trialCount, setTrialCount] = useState(3);
  const [currentTrial, setCurrentTrial] = useState(0);
  const [typedResponse, setTypedResponse] = useState('');
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recognitionTranscript, setRecognitionTranscript] = useState('');
  const [responses, setResponses] = useState({});
  const [studyWord, setStudyWord] = useState('');
  const [scheduledUntil, setScheduledUntil] = useState(null);
  const delayedTimerRef = useRef(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (delayedTimerRef.current) clearTimeout(delayedTimerRef.current);
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
        setPhase('recall');
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
            setRecognitionTranscript((prev) => (finalTranscript || interim || prev));
          };
          rec.onerror = (e) => {
            console.warn('SpeechRecognition error', e);
          };
          rec.onend = () => {
            // do nothing; final transcript is already set
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
          recognitionRef.current = null;
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
      if (responseText != null) form.append('response_text', JSON.stringify(responseText));
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
    if (typedResponse && typedResponse.trim().length > 0) {
      await uploadArtifact({ file: null, artifactType: 'typed', trialNumber, responseText: typedResponse });
    }
    if (audioBlob) {
      const file = new File([audioBlob], `trial-${trialNumber}.webm`, { type: audioBlob.type });
      const transcript = typedResponse?.trim() || recognitionTranscript || '';
      await uploadArtifact({ file, artifactType: 'audio', trialNumber, responseText: transcript });
    }

    setResponses(prev => ({ ...prev, [trialNumber]: { typed: typedResponse, hasAudio: !!audioBlob } }));
    setTypedResponse('');
    setAudioBlob(null);

    if (currentTrial < trialCount) {
      setCurrentTrial(currentTrial + 1);
    } else {
      try {
        await api.post(`/tests/${testId}/complete`);
        // show results viewer and let it poll for backend scores
        setShowResults(true);
      } catch (err) {
        console.error('complete call failed', err);
      }
      setPhase('completed');
    }
  };

  const scheduleDelayedRecall = (minutes = 30) => {
    const when = Date.now() + minutes * 60000;
    // Ask backend to schedule delayed recall (reliable even if user closes page)
    api.post(`/tests/${testId}/schedule-delayed`, { delay_minutes: minutes })
      .then((r) => {
        localStorage.setItem(`delayed_recall_${testId}`, String(when));
        setScheduledUntil(when);
        setPhase('scheduled');
      })
      .catch((err) => {
        console.warn('Server scheduling failed, falling back to client-side timer', err);
        localStorage.setItem(`delayed_recall_${testId}`, String(when));
        setScheduledUntil(when);
        setPhase('scheduled');
      });
    // schedule in-page timer as UX fallback
    const delay = when - Date.now();
    if (delay > 0) {
      delayedTimerRef.current = setTimeout(() => {
        setPhase('delayed');
      }, delay);
    } else {
      setPhase('delayed');
    }
  };

  const doDelayedRecallNow = async () => {
    if (typedResponse && typedResponse.trim().length > 0) {
      await uploadArtifact({ file: null, artifactType: 'typed', trialNumber: undefined, responseText: typedResponse });
    }
    if (audioBlob) {
      const file = new File([audioBlob], `delayed-${Date.now()}.webm`, { type: audioBlob.type });
      const transcript = typedResponse?.trim() || recognitionTranscript || '';
      await uploadArtifact({ file, artifactType: 'audio', trialNumber: undefined, responseText: transcript });
    }
    localStorage.removeItem(`delayed_recall_${testId}`);
    setScheduledUntil(null);
    setPhase('done');
    try {
      const r = await api.get(`/tests/${testId}/results`);
      onComplete && onComplete({ testId, results: r.data.data });
    } catch (err) {
      console.error('failed to fetch results', err);
      onComplete && onComplete({ testId });
    }
  };

  const renderIdle = () => (
    <Paper sx={{ p: 3 }} elevation={2}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={8}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Word List Memory Test</Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>You will see a short list of words and then be asked to recall them across {trialCount} trials. Use the microphone or type your answers.</Typography>
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

      <TextField
        multiline
        minRows={4}
        placeholder="Type the words you recall here, separated by commas or spaces"
        fullWidth
        sx={{ mt: 2 }}
        value={typedResponse}
        onChange={(e) => setTypedResponse(e.target.value)}
      />

      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        {!recording ? (
          <Button startIcon={<MicIcon />} variant="outlined" onClick={startRecording} aria-label="Start recording">Record</Button>
        ) : (
          <Button color="error" startIcon={<StopIcon />} variant="contained" onClick={stopRecording} aria-label="Stop recording">Stop</Button>
        )}

        {audioUrl && (
          <IconButton color="primary" onClick={playAudio} aria-label="Play recording"><PlayArrowIcon /></IconButton>
        )}

        <Button variant="contained" endIcon={<SendIcon />} onClick={submitTrial} aria-label="Submit trial">Submit</Button>

        {/* Transcript is intentionally not displayed to avoid cueing the participant */}
      </Box>
    </Paper>
  );

  const renderCompleted = () => (
    <Paper sx={{ p:3 }} elevation={1}>
      <Typography variant="h6">Immediate trials completed</Typography>
      <Typography sx={{ mt: 1, color: 'text.secondary' }}>Would you like to schedule a delayed recall?</Typography>
      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={() => scheduleDelayedRecall(20)}>Schedule 20 min</Button>
        <Button variant="outlined" onClick={() => scheduleDelayedRecall(30)}>Schedule 30 min</Button>
        <Button variant="contained" onClick={() => { setPhase('delayed'); }}>Do delayed recall now</Button>
      </Box>
    </Paper>
  );

  const renderScheduled = () => (
    <Box>
      <Typography variant="h6">Delayed recall scheduled</Typography>
      <Typography sx={{ mt: 1 }}>We will remind you when it's time to do the delayed recall.</Typography>
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={() => { setPhase('delayed'); }}>Do it now</Button>
      </Box>
    </Box>
  );

  const renderDelayed = () => (
    <Box>
      <Typography variant="h6">Delayed Recall</Typography>
      <Typography sx={{ mt: 1 }}>Please recall the words from earlier. Type or record your responses.</Typography>
      <TextareaAutosize
        minRows={4}
        placeholder="Type your recalled words here"
        style={{ width: '100%', marginTop: 12, padding: 8 }}
        value={typedResponse}
        onChange={(e) => setTypedResponse(e.target.value)}
      />
      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        {!recording ? (
          <Button startIcon={<MicIcon />} variant="outlined" onClick={startRecording} aria-label="Start delayed recording">Record Audio</Button>
        ) : (
          <Button color="error" startIcon={<StopIcon />} variant="contained" onClick={stopRecording} aria-label="Stop delayed recording">Stop</Button>
        )}
        {audioUrl && (
          <Button onClick={playAudio} aria-label="Play delayed recording">Play</Button>
        )}
        <Button variant="contained" onClick={doDelayedRecallNow} aria-label="Submit delayed recall">Submit Delayed Recall</Button>
      </Box>
    </Box>
  );

  return (
    <Box>
      {showResults && (
        <Box sx={{ mb: 2 }}>
          <WordListResults testId={testId} onClose={() => setShowResults(false)} />
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
              <Typography variant="caption">Keep speaking or typing your responses when prompted. The words and transcripts are hidden here to reduce test cueing.</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
