import React from 'react';
import { Box, Paper, Typography, useTheme, Avatar } from '@mui/material';
import { SmartToy, Person } from '@mui/icons-material';

export default function MessageBubble({ from, text }) {
  const theme = useTheme();
  const isBot = from === 'bot';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isBot ? 'flex-start' : 'flex-end',
        mb: 2,
        alignItems: 'end',
      }}
    >
      {/* Bot Avatar */}
      {isBot && (
        <Avatar
          sx={{
            bgcolor: 'primary.main',
            mr: 1,
            width: 32,
            height: 32,
            boxShadow: 2
          }}
        >
          <SmartToy sx={{ fontSize: 20 }} />
        </Avatar>
      )}

      <Paper
        elevation={isBot ? 1 : 2}
        sx={{
          p: 2,
          maxWidth: '75%',
          borderRadius: 3,
          borderBottomLeftRadius: isBot ? 0 : 3,
          borderBottomRightRadius: isBot ? 3 : 0,
          backgroundColor: isBot 
            ? theme.palette.background.paper 
            : theme.palette.primary.main,
          color: isBot 
            ? theme.palette.text.primary 
            : theme.palette.primary.contrastText,
        }}
      >
        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
          {text}
        </Typography>
      </Paper>

      {/* User Avatar */}
      {!isBot && (
        <Avatar
          sx={{
            bgcolor: 'secondary.main',
            ml: 1,
            width: 32,
            height: 32,
            boxShadow: 2
          }}
        >
          <Person sx={{ fontSize: 20 }} />
        </Avatar>
      )}
    </Box>
  );
}
