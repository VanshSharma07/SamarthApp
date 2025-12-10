import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  TextField, 
  IconButton, 
  Button, 
  Typography, 
  useTheme, 
  CircularProgress,
  Stack
} from '@mui/material';
import { Send, Mic, MicOff, CheckCircle } from '@mui/icons-material';
import ChatBox from '../components/ChatBox';
import VoiceLottie from '../components/VoiceLottie';
import MicLottie from '../components/MicLottie';
import useMic from '../hooks/useBackendMic';

import { startBotSession, sendBotAnswer, getBotReport } from '../services/botService';

export default function BotScreen({ onComplete, userId }) {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reportData, setReportData] = useState(null); // Report State
  // ... other states
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [currentQuestionType, setCurrentQuestionType] = useState('text'); // text | number | yesno
  const [isFinished, setIsFinished] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [language, setLanguage] = useState('en'); // 'en' | 'hi'
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  
  const theme = useTheme();

  // Helper to add messages
  function addBot(text) {
    setMessages((prev) => [...prev, { from: 'bot', text }]);
  }
  function addUser(text) {
    setMessages((prev) => [...prev, { from: 'user', text }]);
  }

  // Audio Ref for cleanup
  const audioRef = React.useRef(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // Audio Playback
  async function playAudio(base64) {
    // Stop previous audio if any
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setIsBotSpeaking(true);
    const audio = new Audio(base64);
    audioRef.current = audio; // Store ref
    
    audio.onended = () => {
        setIsBotSpeaking(false);
        audioRef.current = null;
    };
    
    try {
        await audio.play();
    } catch (e) {
        console.error("Audio playback failed", e);
        setIsBotSpeaking(false);
    }
  }

  // Handle Response Logic
  async function handleUserResponse(text) {
    if (!text || !text.trim()) return;
    
    addUser(text);
    setInputText(''); // Clear input

    // Basic Lang Detect
    if (text.toLowerCase().includes('hindi')) setLanguage('hi');
    else if (text.toLowerCase().includes('english')) setLanguage('en');

    if (!sessionId) {
      console.warn('No session ID, backend might be down.');
      return;
    }

    setIsProcessing(true);

    try {
      const data = await sendBotAnswer(sessionId, text);

      if (data.finished) {
        setIsFinished(true);
        playAudio(data.audio);
        addBot(data.botText);
        setCurrentQuestionType(null);
      } else {
        playAudio(data.audio);
        addBot(data.botText);
        if (data.nextQuestion) {
          setCurrentQuestionType(data.nextQuestion.type);
        }
      }
    } catch (err) {
      console.error('Failed to get response:', err);
      addBot("Sorry, I'm having trouble connecting to the server.");
    } finally {
      setIsProcessing(false);
    }
  }

  // Speech Hook
  const { listening, startListening, stopListening } = useMic(async (spokenText) => {
    await handleUserResponse(spokenText);
  });

  const [visualListening, setVisualListening] = useState(false);

  // Sync visual state 
  useEffect(() => {
    setVisualListening(listening);
  }, [listening]);

  // Auto-mic control
  useEffect(() => {
    if (!hasStarted) return;
    if (isBotSpeaking) {
      stopListening();
      setVisualListening(false);
    } else {
      // Auto-start listening if appropriate
      if (!isFinished && messages.length > 0 && !isProcessing) {
        startListening();
        setVisualListening(true);
      }
    }
  }, [isBotSpeaking, hasStarted, isFinished, startListening, stopListening, messages.length, isProcessing]);

  const toggleMic = () => {
    if (listening) {
      setVisualListening(false);
      stopListening();
    } else {
      setVisualListening(true);
      startListening();
    }
  };

  // Fetch Report on Finish
  useEffect(() => {
      if (isFinished && sessionId) {
          getBotReport(sessionId)
            .then(data => setReportData(data))
            .catch(err => console.error("Failed to load report", err));
      }
  }, [isFinished, sessionId]);

  // Start Session
  async function startSession() {
    try {
      const data = await startBotSession();
      setSessionId(data.sessionId);
      playAudio(data.audio);
      addBot(data.botText);
      if (data.question) {
         setCurrentQuestionType(data.question.type);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      addBot("Hello! I am NeuroBot. The server seems to be offline, but you can still chat with me.");
    }
  }

  const handleStart = () => {
    setHasStarted(true);
    startSession();
  };

  const handleFinish = () => {
    if(onComplete) {
        // Pass back some metrics or just success
        onComplete({ completed: true, sessionId });
    }
  };


  // --- RENDER ---

  if (!hasStarted) {
    return (
      <Box sx={{ 
        height: '400px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center',
        p: 2
      }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          NeuroBot Screening
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>
          I am your virtual assistant. I will ask you a few simple questions.
        </Typography>
        <Button 
          variant="contained" 
          size="medium" 
          onClick={handleStart}
          sx={{ borderRadius: 8, px: 4, py: 1 }}
        >
          Start Session
        </Button>
      </Box>
    );
  }

  return (
    <Grid container sx={{ height: '500px', overflow: 'hidden' }}>
      
      {/* LEFT PANEL: AVATAR & MIC */}
      <Grid item xs={12} md={4} sx={{ 
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'grey.50',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between', 
        borderRight: `1px solid ${theme.palette.divider}`,
        p: 2,
        pb: 1 // Minimal padding to sit low
      }}>
        {/* Voice Animation */}
        <Box sx={{ 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            flexGrow: 1
        }}>
          <VoiceLottie isSpeaking={isBotSpeaking} />
        </Box>
        
        {/* Mic Button Area */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 0 }}>
            <Box 
                onClick={toggleMic} 
                sx={{ 
                    cursor: 'pointer', 
                    width: '120px', 
                    height: '120px', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    
                    // Transparent - Only Lottie visible
                    background: 'transparent',
                    boxShadow: 'none',
                    border: 'none',
                    
                    transition: 'transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    '&:hover': { 
                        transform: 'scale(1.05)', 
                    },
                    overflow: 'visible', // Allow lottie to breathe if needed
                    position: 'relative'
                }}
            >
                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}> 
                    {/* Scale up to fill */}
                    <Box sx={{ width: '150%', transform: 'translateY(5px)' }}> 
                         <MicLottie listening={visualListening} />
                    </Box>
                </Box>
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontWeight: 500, opacity: 0.8 }}>
                {visualListening ? "Listening..." : "Tap to speak"}
            </Typography>
        </Box>
      </Grid>

      {/* RIGHT PANEL: CHAT */}
      <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <ChatBox messages={messages} />
        
        {/* INPUT AREA */}
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: `1px solid ${theme.palette.divider}` }}>
          {isFinished ? (
             <Box sx={{ textAlign: 'center', p: 2, overflowY: 'auto', maxHeight: '400px' }}>
               {!reportData ? (
                   <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                       <CircularProgress />
                       <Typography>Generating your health report...</Typography>
                   </Box>
               ) : (
                   <Box sx={{ textAlign: 'left' }}>
                       <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', textAlign: 'center' }}>
                         {language === 'hi' ? 'मूल्यांकन रिपोर्ट' : 'Assessment Report'}
                       </Typography>

                       {/* Risk Level */}
                       <Paper elevation={0} sx={{ p: 2, bgcolor: reportData.report?.riskLevel === 'High' ? 'error.light' : reportData.report?.riskLevel === 'Medium' ? 'warning.light' : 'success.light', mb: 2, borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                                Risk Level: {reportData.report?.riskLevel || "N/A"}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                {reportData.report?.reasoning}
                            </Typography>
                       </Paper>

                       {/* Summary */}
                       <Typography variant="h6" gutterBottom>Summary</Typography>
                       <Typography variant="body2" color="text.secondary" paragraph>
                           {reportData.report?.summary}
                       </Typography>

                       {/* Recommendations */}
                       <Typography variant="h6" gutterBottom>Recommendations</Typography>
                       <ul style={{ paddingLeft: '20px', marginTop: 0 }}>
                           {reportData.report?.recommendations?.map((rec, i) => (
                               <li key={i}><Typography variant="body2">{rec}</Typography></li>
                           ))}
                       </ul>

                       <Box sx={{ mt: 3, textAlign: 'center' }}>
                           <Button 
                            variant="contained" 
                            color="primary" 
                            startIcon={<CheckCircle />}
                            onClick={handleFinish}
                            sx={{ borderRadius: 8 }}
                           >
                             Done
                           </Button>
                       </Box>
                   </Box>
               )}
             </Box>
          ) : currentQuestionType === 'yesno' ? (
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button 
                variant="outlined" 
                size="large" 
                onClick={() => handleUserResponse(language === 'hi' ? 'हाँ' : 'Yes')}
                sx={{ minWidth: 120, borderRadius: 3 }}
              >
                {language === 'hi' ? 'हाँ (Yes)' : 'Yes'}
              </Button>
              <Button 
                variant="outlined" 
                size="large" 
                color="error" // Red-ish for No
                onClick={() => handleUserResponse(language === 'hi' ? 'नहीं' : 'No')}
                sx={{ minWidth: 120, borderRadius: 3 }}
              >
                {language === 'hi' ? 'नहीं (No)' : 'No'}
              </Button>
            </Stack>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder={currentQuestionType === 'number' ? "Enter number..." : "Type your answer..."}
                type={currentQuestionType === 'number' ? "number" : "text"}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUserResponse(inputText)}
                disabled={isProcessing}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
              <IconButton 
                color="primary" 
                size="large" 
                onClick={() => handleUserResponse(inputText)}
                disabled={!inputText.trim() || isProcessing}
                sx={{ 
                    bgcolor: 'primary.soft', 
                    '&:hover': { bgcolor: 'primary.main', color: 'white' } 
                }}
              >
                {isProcessing ? <CircularProgress size={24} /> : <Send />}
              </IconButton>
            </Box>
          )}
        </Box>
      </Grid>
    </Grid>
  );
}
