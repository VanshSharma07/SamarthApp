import React from 'react';
import { IconButton, SvgIcon, Tooltip } from '@mui/material';

// Small reusable ReadAloud button. Uses Web Speech API (speechSynthesis).
const ReadAloudButton = ({ text, lang = 'en', fontSize = '1rem' }) => {
  const speak = () => {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    try {
      // cancel any ongoing speech
      if (synth.speaking) synth.cancel();
      const utter = new SpeechSynthesisUtterance(text || '');
      // Choose language locale
      utter.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
      utter.rate = 0.95;
      // Slightly adjust pitch for Hindi sometimes
      utter.pitch = 1;
      synth.speak(utter);
    } catch (err) {
      // ignore errors silently
      console.warn('Speech synthesis failed', err);
    }
  };

  return (
    <Tooltip title={lang === 'hi' ? 'सुनें' : 'Read aloud'}>
      <IconButton
        aria-label={lang === 'hi' ? 'सुनें' : 'Read aloud'}
        onClick={speak}
        size="small"
        sx={{
          ml: 1,
          p: 1.2, // large touch target while keeping icon small
          borderRadius: 1,
          // ensure it doesn't visually overpower the label
          '& svg': { fontSize: `calc(${fontSize} + 0.1rem)` }
        }}
      >
        <SvgIcon fontSize="small" viewBox="0 0 24 24">
          <path d="M3 10v4h4l5 4V6L7 10H3zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03zM14 3.23v2.06c3.39.49 6 3.39 6 6.71s-2.61 6.22-6 6.71v2.06c4.45-.52 8-4.31 8-8.77s-3.55-8.25-8-8.77z" />
        </SvgIcon>
      </IconButton>
    </Tooltip>
  );
};

export default ReadAloudButton;
