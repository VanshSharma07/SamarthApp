import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  FormControlLabel,
  Checkbox,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { Warning as WarningIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';

const HyperventilationCautionModal = ({ open, onProceed, onCancel }) => {
  const [acknowledged, setAcknowledged] = useState(false);

  const contraindications = [
    'People with heart disease',
    'Severe asthma',
    'Recent stroke',
    'Pregnancy (relative caution)',
    'Patients with uncontrolled seizures (risk of inducing seizure)'
  ];

  const handleProceed = () => {
    if (acknowledged) {
      setAcknowledged(false); // Reset checkbox for next time
      onProceed(); // Proceed with test creation
    }
  };

  const handleCancel = () => {
    setAcknowledged(false); // Reset checkbox
    onCancel(); // Close modal without proceeding
  };

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      onClose={handleCancel}
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon sx={{ color: 'error.main', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Hyperventilation Test - Important Safety Information
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            ⚠️ Safety Warning
          </Typography>
          <Typography variant="body2">
            Stop immediately if you feel dizzy, faint, chest pain, or unwell during the test.
          </Typography>
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon sx={{ fontSize: 20, color: 'error.main' }} />
            Do NOT Perform This Test If You Have:
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'error.lighter', border: '1px solid', borderColor: 'error.light' }}>
            <List sx={{ p: 0 }}>
              {contraindications.map((contraindication, index) => (
                <ListItem key={index} sx={{ py: 1, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <WarningIcon sx={{ fontSize: 20, color: 'error.main' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={contraindication}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
            During the Test:
          </Typography>
          <List sx={{ p: 0 }}>
            <ListItem sx={{ py: 1, px: 0 }}>
              <ListItemText
                primary="Follow all instructions from the clinician or supervising staff"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem sx={{ py: 1, px: 0 }}>
              <ListItemText
                primary="Report any symptoms immediately (dizziness, chest pain, shortness of breath)"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem sx={{ py: 1, px: 0 }}>
              <ListItemText
                primary="You can stop the test at any time by clicking 'STOP IMMEDIATELY' button"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>
        </Box>

        <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 1, mb: 3 }}>
          <Typography variant="body2">
            <strong>Note:</strong> This test is designed to provoke EEG abnormalities under controlled conditions. It should only be performed under medical supervision.
          </Typography>
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              color="error"
            />
          }
          label={
            <Typography variant="body2">
              I acknowledge these risks and agree to proceed with the hyperventilation test
            </Typography>
          }
          sx={{ display: 'flex', alignItems: 'flex-start' }}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleCancel} variant="outlined" color="inherit">
          Cancel Test
        </Button>
        <Button
          onClick={handleProceed}
          variant="contained"
          color="error"
          disabled={!acknowledged}
          sx={{
            opacity: acknowledged ? 1 : 0.5,
            cursor: acknowledged ? 'pointer' : 'not-allowed'
          }}
        >
          Agree and Proceed
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HyperventilationCautionModal;
