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
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Send, Mic, MicOff, CheckCircle } from '@mui/icons-material';
import ChatBox from '../components/ChatBox';
import VoiceLottie from '../components/VoiceLottie';
import MicLottie from '../components/MicLottie';
import useMic from '../hooks/useSpeechRecognition';

import { startBotSession, sendBotAnswer, getBotReport } from '../services/botService';

export default function BotScreen({ onComplete, userId }) {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reportData, setReportData] = useState(null); // Report State
  // ... other states
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [language, setLanguage] = useState('en'); // 'en' | 'hi'
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [voiceGender, setVoiceGender] = useState('female');
  
  const theme = useTheme();

  // Helper to add messages
  function addBot(text) {
    setMessages((prev) => [...prev, { from: 'bot', text }]);
  }
  function addUser(text) {
    setMessages((prev) => [...prev, { from: 'user', text }]);
  }

  // Cleanup speech on unmount
  useEffect(() => {
    // ensure voices are loaded 
    window.speechSynthesis.getVoices();
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Stop Audio Helper
  const stopAudio = () => {
    window.speechSynthesis.cancel();
    setIsBotSpeaking(false);
  };

  // Audio Playback (Web Speech API)
  const speakText = (text) => {
    stopAudio(); // Stop any previous

    if (!text) return;

    setIsBotSpeaking(true);
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    
    const voices = window.speechSynthesis.getVoices();
    const langVoices = voices.filter(v => v.lang.startsWith(language));
    
    if (langVoices.length > 0) {
        let selectedVoice;
        if (voiceGender === 'female') {
           selectedVoice = langVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('victoria') || v.name.toLowerCase().includes('aditi'));
           if (!selectedVoice) selectedVoice = langVoices[0];
        } else {
           selectedVoice = langVoices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('mark') || v.name.toLowerCase().includes('ravi'));
           if (!selectedVoice) selectedVoice = langVoices.find(v => !v.name.toLowerCase().includes('female') && !v.name.toLowerCase().includes('zira') && !v.name.toLowerCase().includes('samantha') && !v.name.toLowerCase().includes('victoria'));
           if (!selectedVoice) selectedVoice = langVoices[0];
        }
        if (selectedVoice) {
           msg.voice = selectedVoice;
        }
    }

    msg.onend = () => {
        setIsBotSpeaking(false);
    };
    
    msg.onerror = (e) => {
        console.error("Speech playback failed", e);
        setIsBotSpeaking(false);
    };

    window.speechSynthesis.speak(msg);
  };

  // Handle Response Logic
  async function handleUserResponse(text) {
    if (!text || !text.trim()) return;
    
    stopAudio(); // Ensure bot stops if user interrupts
    addUser(text);
    setInputText(''); 

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
        speakText(data.botText);
        addBot(data.botText);
      } else {
        speakText(data.botText);
        addBot(data.botText);
      }
    } catch (err) {
      console.error('Failed to get response:', err);
      addBot("Sorry, I'm having trouble connecting to the server.");
    } finally {
      setIsProcessing(false);
    }
  }

  // Speech Hook
  const speechLang = language === 'hi' ? 'hi-IN' : 'en-IN';
  const { listening, startListening, stopListening } = useMic(async (spokenText) => {
    await handleUserResponse(spokenText);
  }, speechLang);

  const [visualListening, setVisualListening] = useState(false);

  // Sync visual state 
  useEffect(() => {
    setVisualListening(listening);
  }, [listening]);

  // Auto-mic control
  useEffect(() => {
    if (!hasStarted) return;
    
    let timer;

    if (isBotSpeaking || isFinished) {
      stopListening();
      setVisualListening(false);
    } else {
      // Auto-start listening if appropriate
      if (!isFinished && messages.length > 0 && !isProcessing) {
        // Add delay to prevent echo
        timer = setTimeout(() => {
            startListening();
            setVisualListening(true);
        }, 300); // 300ms delay for safety
      }
    }

    return () => {
        if(timer) clearTimeout(timer);
    };
  }, [isBotSpeaking, hasStarted, isFinished, startListening, stopListening, messages.length, isProcessing]);

  const toggleMic = () => {
    if (listening) {
      setVisualListening(false);
      stopListening();
    } else {
      stopAudio(); // Ensure bot is silenced when mic starts manually
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
      const data = await startBotSession(userId);
      setSessionId(data.sessionId);
      
      // Delay speech slightly to ensure rendering catches up for the initial prompt
      setTimeout(() => speakText(data.botText), 100); 

      addBot(data.botText);
    } catch (error) {
      console.error('Failed to start session:', error);
      addBot("Hello! I am NeuroBot. The server seems to be offline, but you can still chat with me.");
    }
  }

  const handleStart = () => {
    console.log("[BotScreen] Starting session for user:", userId);
    setHasStarted(true);
    startSession();
  };

  const handleFinish = () => {
    if(onComplete) {
        // Pass back metrics and report for persistence in Assessment collection
        onComplete({ 
            completed: true, 
            sessionId,
            riskLevel: reportData?.report?.riskLevel || 'Unknown',
            summary: reportData?.report?.summary || '',
            recommendations: reportData?.report?.recommendations || []
        });
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
        
        {/* Voice Gender Switcher */}
        <Box sx={{ width: '100%', px: 2, mb: 1 }}>
            <FormControl fullWidth size="small" variant="outlined">
                <InputLabel sx={{ fontSize: '14px' }}>AI Voice Gender</InputLabel>
                <Select
                    value={voiceGender}
                    label="AI Voice Gender"
                    onChange={(e) => setVoiceGender(e.target.value)}
                    sx={{ fontSize: '14px', borderRadius: 3 }}
                >
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="male">Male</MenuItem>
                </Select>
            </FormControl>
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
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Type your answer or tap the mic..."
                type="text"
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
