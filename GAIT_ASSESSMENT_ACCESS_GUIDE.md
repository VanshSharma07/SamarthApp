# Accessing Multi-Sensor Gait Analysis Assessment

## 🚀 Quick Access Guide

The Multi-Sensor Gait Analysis assessment is now fully integrated into the Samarth Web application. Here's how to access and use it:

### Navigation Path

1. **Go to Assessment Page**
   - Navigate to: `http://localhost:3000/assessment` (or your deployed URL)
   - Or click "Select Disorder" from the main dashboard

2. **Find the Assessment Card**
   - Look for **"Multi-Sensor Gait Analysis"** card
   - It has a **purple color** (#9c27b0)
   - Features a **"NEW" badge** with pulse animation (pink background)
   - Icon: Walking person icon
   - Description: "🚀 Advanced gait analysis with FSR insoles + IMU + CV fusion"

3. **Start the Assessment**
   - Click on the card to navigate to `/assessment/gait-stream`
   - The GaitStreamPanel component will load

### Using the Assessment

#### Step 1: Start Session
- Click **"Start Session"** button (blue, with play icon)
- This creates a new gait analysis session
- WebSocket connection establishes for CV data stream
- Session ID is generated and displayed

#### Step 2: Connect Mock Insoles (Testing Mode)
- Click **"Start Mock Insoles"** button (green, with sensors icon)
- This simulates two ESP32 devices:
  - Left foot insole with FSR + IMU
  - Right foot insole with FSR + IMU
- Simulator sends realistic sensor data at 100Hz
- Button turns red with "Stop Mock Insoles" text when active

#### Step 3: View Real-Time Data
The interface automatically displays:

**Device Connection Status:**
- ✅ Computer Vision - Connected
- ✅ Left Insole ESP32 - Connected (with "FSR + IMU Streaming" label)
- ✅ Right Insole ESP32 - Connected (with "FSR + IMU Streaming" label)

**Live Sensor Visualization:**
- **FSR Pressure Heatmap** (Left & Right Foot)
  - 6 sensors per foot in anatomical layout
  - Color-coded intensity: Green (low) → Yellow (medium) → Red (high)
  - Radial gradient glow effects
  
- **Accelerometer 3D Graph** (Left & Right)
  - X, Y, Z axes plotted in real-time
  - 100 data points rolling buffer
  - Units: m/s²
  
- **Gyroscope 3D Graph** (Left & Right)
  - X, Y, Z axes plotted in real-time
  - 100 data points rolling buffer
  - Units: °/s

**Session Statistics:**
- Session ID (truncated)
- Status chip
- Total packets received
- Steps detected count

**Recent Steps List:**
- Step number and foot (left/right)
- Step length (meters)
- Cadence (steps per minute)
- Color-coded chips

#### Step 4: View Fusion Status (Optional)
- Click **"Show Fusion Status"** button (outlined)
- Modal opens showing detailed multi-stream connection info
- Displays packet counts per stream
- Shows fusion quality metrics

#### Step 5: Complete Assessment
- Click **"Complete Assessment"** button (green, in Clinical Analysis Results section)
- Aggregates all data from CV + FSR + IMU streams
- Calculates clinical metrics:
  - **PD Likelihood Score** (percentage)
  - **Severity Estimate** (percentage)
  - **Clinical Flags** (e.g., "FoG episodes detected", "Asymmetric gait")
- Results are saved to session

### Component Architecture

```
Assessment.jsx (Selection Page)
    ↓ (User clicks card)
GaitStreamPanel.jsx (Main Component)
    ├── AssessmentLayout (Title, Description, Controls)
    ├── Control Panel (Start/Stop buttons)
    ├── Device Connection Status Cards
    ├── InsoleDataVisualizer.jsx (FSR + IMU visualization)
    ├── Session Statistics Display
    ├── Recent Steps List
    ├── Clinical Metrics Display
    └── FusionStatusModal.jsx (Detailed stream info)
```

### Material UI Styling

The GaitStreamPanel now uses professional Material UI components:
- `Paper` - Elevated cards for sections
- `Button` - Action buttons with icons
- `Card` - Device status and step cards
- `Grid` - Responsive layout system
- `Chip` - Status indicators and badges
- `Alert` - Important notifications
- `Typography` - Consistent text styling
- `Box` - Layout containers

### Features

✅ **Multi-Sensor Fusion**
- Computer Vision (webcam)
- FSR Pressure Sensors (6 per foot)
- IMU Accelerometer (3-axis)
- IMU Gyroscope (3-axis)

✅ **Real-Time Visualization**
- 100Hz data streaming
- Futuristic gradient backgrounds
- Glass morphism styling
- Animated pulse effects

✅ **Clinical Analysis**
- Gait cycle detection
- Step segmentation
- Freezing of Gait (FoG) detection
- Gait asymmetry calculation
- Parkinson's likelihood scoring
- Severity estimation

✅ **Professional UI**
- Consistent Material Design
- Responsive grid layout
- Color-coded status indicators
- Accessible components
- Smooth animations

### Testing Checklist

Before deploying, verify:
- [ ] Assessment card visible on `/assessment` page
- [ ] NEW badge displays with pulse animation
- [ ] Card click navigates to `/assessment/gait-stream`
- [ ] "Start Session" creates session and connects CV WebSocket
- [ ] "Start Mock Insoles" button starts simulator
- [ ] Left/Right insole connection status updates
- [ ] FSR heatmaps show pressure changes
- [ ] IMU graphs plot accelerometer data
- [ ] IMU graphs plot gyroscope data
- [ ] Session statistics update every 2 seconds
- [ ] Recent steps list populates
- [ ] "Show Fusion Status" opens modal
- [ ] "Complete Assessment" calculates clinical metrics
- [ ] Page is responsive on mobile/tablet

### Development Notes

**Backend Services:**
- MockInsoleSimulator: `backend/src/simulators/MockInsoleSimulator.js`
- Simulator API: `backend/src/routes/gaitStreamRoutes.js`
- WebSocket Server: `backend/src/websocket/GaitStreamServer.js`

**Frontend Components:**
- Assessment Selection: `frontend/src/pages/Assessment.jsx`
- Main Panel: `frontend/src/components/assessments/GaitStreamPanel.jsx`
- Visualizer: `frontend/src/components/assessments/InsoleDataVisualizer.jsx`
- Status Modal: `frontend/src/components/assessments/FusionStatusModal.jsx`

**API Endpoints:**
- `POST /api/gait/stream/start` - Create session
- `POST /api/gait/stream/complete` - Finish session
- `GET /api/gait/stream/:sessionId` - Get session data
- `POST /api/gait/simulator/start` - Start mock insoles
- `POST /api/gait/simulator/stop` - Stop mock insoles
- `GET /api/gait/simulator/status/:sessionId` - Check simulator

**WebSocket Connection:**
- URL: `ws://localhost:5000/gait-stream?sessionId=<id>&clientType=cv`
- Client types: `cv`, `insole`
- Message types: `data`, `insole-data`, `connection-update`

### Future Enhancements

- [ ] Connect real ESP32 hardware (replace simulator)
- [ ] Add video recording of gait session
- [ ] Export reports as PDF
- [ ] Add historical comparison charts
- [ ] Implement machine learning severity prediction
- [ ] Add voice instructions for patients
- [ ] Multi-language support
- [ ] Offline mode with data sync

---

**Last Updated:** January 2025  
**Status:** ✅ Fully Integrated and Styled with Material UI
