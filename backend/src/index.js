import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import expressWs from 'express-ws';
import userRoutes from './routes/user.js';
import { registerNeuroWs, registerDeviceWs } from './routes/neuroAssessment.js';
import neuroRouter from './routes/neuroAssessment.js';
import tremorRouter, { registerTremorWs } from './routes/tremor.js';
import * as hvWs from './controllers/hyperventilationWebSocket.js';
import neuroService from './services/neuroService.js';
import assessmentRoutes from './routes/assessmentRoutes.js';
import specializedAssessmentRoutes from './routes/specialized-assessments.js';
import authRoutes from './routes/auth.js';
import diagnosticRoutes from './routes/diagnosticRoutes.js';
import apiRoutes from './routes/api.js';
import { requestLogger } from './middleware/requestLogger.js';
import { startSimulator } from './services/neuroSimulator.js';
// Wordlist processing now runs in-process via `services/wordlistWorker.js`

// Initialize environment variables
dotenv.config();

const app = express();

// attach express-ws so routers can define websocket endpoints (keeps integration minimal)
expressWs(app);

// Register neuro WS route now that express-ws has been attached
registerNeuroWs(app);
// Register device WS route so ESP32 devices can stream directly
registerDeviceWs(app);
// Register tremor WS route (smart glove devices + viewers)
registerTremorWs(app);

// Register hyperventilation WS route so HV frontend clients can connect
if (typeof app.ws === 'function') {
  app.ws('/tests/hyperventilation/stream', function(ws, req) {
    console.log('[index.js] HV WebSocket connection attempt, URL:', req.url);
    try { 
      let testId = req.query?.testId;
      if (!testId && req.url) {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        testId = urlParams.get('testId');
          console.log('[index.js] Fallback URL parsing, extracted testId:', testId);
      }
      console.log('[HV WS] Client connecting with testId:', testId, 'from URL:', req.url);
      // Hard reject connections without a testId to avoid null saves
      if (!testId) {
        console.error('[HV WS] ERROR: No testId provided; closing connection to prevent data loss');
        try { ws.send(JSON.stringify({ error: 'testId parameter required' })); } catch (e) {}
        try { ws.close(); } catch (e) {}
        return;
      }
      hvWs.addClient(ws, testId); 
    } catch (e) { 
      console.error('[HV WS] Failed to add HV WS client:', e); 
    }
  });
} else {
  console.warn('express-ws not initialized, cannot register hyperventilation WS route');
}

// Bridge neuroService broadcasts to hyperventilation WS clients as well
try {
  const _origBroadcast = neuroService.broadcast.bind(neuroService);
  neuroService.broadcast = (payload) => {
    try { _origBroadcast(payload); } catch (e) { console.error('neuroService broadcast error', e); }
    try { 
      hvWs.broadcast(payload); 
    } catch (e) { 
      console.error('[index.js] hvWs.broadcast error:', e);
    }
  };
} catch (e) {
  console.warn('Failed to bridge neuroService broadcasts to hyperventilation WS', e);
}

// Mount neuro REST routes (provides /api/assessment/start, /api/assessment/stop, etc.)
app.use('/api/assessment', neuroRouter);
// Mount tremor REST routes
app.use('/api/tremor', tremorRouter);

// Middleware
app.use(cors({
  origin: ['https://samarth-app.vercel.app', 'http://localhost:5173'], // Fix CORS issue
  credentials: true
}));

// Request logger middleware
app.use(requestLogger);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Root route - moved above 404 middleware to prevent "GET /" 404 errors
app.get("/", (req, res) => {
  res.send("Server is running.");
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/specialized-assessments', specializedAssessmentRoutes);
// Mount the central API routes (tests, specialized endpoints)
app.use('/api', apiRoutes);
// Diagnostic routes (keep after main API routes)
app.use('/api', diagnosticRoutes);

// 404 Middleware (Handles unknown routes)
app.use((req, res, next) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.url}`
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/samarth") // Added fallback for local dev
  .then(async () => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for ESP32 connections
    
    // Get network interfaces before starting server
    const os = await import('os');
    const nets = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push(`${name}: ${net.address}`);
        }
      }
    }
    
    app.listen(PORT, HOST, () => {
      console.log(`Server is running on ${HOST}:${PORT}`);
      console.log('\n📡 Available network interfaces for ESP32:');
      addresses.forEach(addr => console.log(`  ✓ ${addr}`));
      console.log('\n⚠️  Update ESP32 firmware ws_host to one of the above IPs\n');
      
      // Optionally start the neuro data simulator for demos
      if (process.env.NEURO_SIMULATOR === 'true') {
        startSimulator();
      }
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false,
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

export default app;
