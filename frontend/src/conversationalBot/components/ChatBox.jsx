import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import MessageBubble from './MessageBubble';

export default function ChatBox({ messages }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Box
      sx={{
        flexGrow: 1,
        overflowY: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {messages.map((msg, i) => (
        <MessageBubble key={i} from={msg.from} text={msg.text} />
      ))}
      <div ref={endRef} />
    </Box>
  );
}
