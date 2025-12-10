// Simple WebSocket broadcaster for hyperventilation test streams
import SignalFrame from '../models/SignalFrame.js';
import mongoose from 'mongoose';

const wsClients = new Map(); // Map of ws -> {testId, ws}

export function addClient(ws, testId) {
  console.log('HV WS client connected with testId:', testId);
   console.log('[addClient] testId type:', typeof testId, 'length:', testId?.length, 'value:', JSON.stringify(testId));
   console.log('[addClient] Total clients after add:', wsClients.size + 1);
  wsClients.set(ws, { testId, ws });
  ws.on('close', () => {
    wsClients.delete(ws);
    console.log('HV WS client disconnected, remaining clients:', wsClients.size);
  });
  try { ws.send(JSON.stringify({ success: true, message: 'connected to hyperventilation stream' })); } catch (e) { }
}

export function broadcast(payload) {
  const str = JSON.stringify(payload);
    console.log('[hvWs.broadcast] Called with clients:', wsClients.size, 'has eeg_raw:', !!payload.eeg_raw, 'timestamp:', payload.timestamp);
  
  for (const [ws, { testId }] of wsClients) {
      console.log('[hvWs.broadcast] Processing client, testId:', testId);
    try {
      ws.send(str);
      
      // Also save EEG data to database if testId is set
      if (testId && payload.eeg_raw && Array.isArray(payload.eeg_raw)) {
          console.log('[hvWs.broadcast] Calling saveSignalFrame with testId:', testId);
        saveSignalFrame(testId, payload.eeg_raw, payload.timestamp).catch(err => {
          console.error('Error saving signal frame for HV test:', err);
        });
      }
    } catch (e) {
      try { ws.terminate(); } catch (e2) {}
      wsClients.delete(ws);
    }
  }
}

async function saveSignalFrame(testId, eegData, timestamp) {
    console.log('[saveSignalFrame] START - testId:', testId, 'eegData length:', eegData?.length, 'timestamp:', timestamp);
  try {
    if (!testId) {
      console.error('[saveSignalFrame] CRITICAL: testId is null/undefined, frame will NOT be saved!');
      console.error('[saveSignalFrame] This means frames cannot be retrieved later. Check WebSocket connection.');
      return;
    }
    
    if (typeof testId !== 'string' || testId.length !== 24) {
      console.error('[saveSignalFrame] Invalid testId format:', testId, 'type:', typeof testId);
      return;
    }
    
    const frame = new SignalFrame({
      testId: new mongoose.Types.ObjectId(testId),
      timestamp: timestamp || Date.now(),
      eeg: eegData
    });
    await frame.save();
    
      console.log('[saveSignalFrame] ✓✓✓ SUCCESS - Saved frame for testId:', testId, 'samples:', eegData.length, 'timestamp:', timestamp);
  } catch (err) {
    console.error('[saveSignalFrame] Failed to save signal frame:', err.message, 'testId:', testId);
  }
}

export function clientCount() { return wsClients.size; }
