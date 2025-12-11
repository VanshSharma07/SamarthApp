# Multi-Sensor Gait Analysis System

## Overview
This system performs advanced Parkinson's Disease gait analysis using **three data sources**:
1. **Computer Vision (CV)** - Browser webcam analyzing body keypoints
2. **Left Insole** - ESP32 with 6 FSR sensors + MPU6050 IMU
3. **Right Insole** - ESP32 with 6 FSR sensors + MPU6050 IMU

## Understanding the System Architecture

### What the Browser Can Do
✅ Provide **Computer Vision data** from your webcam  
✅ Display fusion status and clinical metrics  
✅ Control mock insole simulator for testing  

### What the Browser CANNOT Do
❌ Generate FSR (Force Sensitive Resistor) pressure data  
❌ Generate IMU (Inertial Measurement Unit) data  
❌ Replace physical ESP32 insole hardware  

### Data Sources Explained

#### 1. Computer Vision (CV Client)
- **Source**: Your browser's webcam
- **Data**: Body keypoints (ankle, knee, hip positions)
- **Detection**: Heel strikes and toe-offs from ankle trajectory
- **Automatically connected** when you start a session

#### 2. Left & Right Insoles (ESP32 Hardware)
- **Source**: Physical ESP32 microcontroller boards
- **FSR Data**: Pressure readings from 6 sensors per foot
  - Heel, midfoot (medial/lateral), forefoot (medial/central/lateral)
- **IMU Data**: Acceleration and gyroscope from MPU6050
- **Connection**: ESP32 devices connect via WiFi to WebSocket server
- **Status**: ⚠️ **Not yet created** - need firmware + physical hardware

## Current Implementation Status

### ✅ Completed Backend
- WebSocket server at `ws://localhost:5000/gait-stream`
- Accepts connections from CV client + 2 insole clients
- Event detection from FSR, IMU, and CV sources
- Multi-sensor fusion engine
- Clinical metrics (FoG detection, gait parameters)
- REST API for session management

### ✅ Completed Frontend
- GaitStreamPanel component for session control
- FusionStatusModal showing connection status per device
- Mock insole simulator for testing without hardware

### ⚠️ Hardware Not Yet Built
- ESP32 firmware to read sensors and stream data
- Physical insole construction with FSR sensors
- MPU6050 IMU calibration

## Testing Without Physical Hardware

### Using the Mock Insole Simulator

1. **Start a Gait Session**
   - Click "Start Session" button in GaitStreamPanel
   - Browser automatically connects as CV client

2. **Start Mock Insoles**
   - Click "▶️ Start Mock Insoles" button
   - Simulator creates two WebSocket clients:
     - `MOCK_LEFT_ESP32` (left foot)
     - `MOCK_RIGHT_ESP32` (right foot)
   - Generates realistic FSR pressure patterns
   - Generates realistic IMU acceleration/gyroscope data
   - Streams at 100Hz (10ms intervals)

3. **View Fusion Status**
   - Click "Show Fusion Status" button
   - See connection state for each device:
     - ✅ **Computer Vision**: Connected (green)
     - ✅ **Left Insole**: Connected (green) when simulator running
     - ✅ **Right Insole**: Connected (green) when simulator running
   - View packet counts per source
   - See detected steps with fusion confidence

4. **Complete Session**
   - Click "Complete & Aggregate" to finalize
   - View clinical metrics (PD likelihood, severity)

### Mock Data Characteristics
The simulator generates realistic gait patterns:
- **Gait cycle**: 1.2 seconds (~50 steps/min)
- **Phase offset**: Left and right feet 50% out of phase
- **FSR progression**: Heel strike → midfoot → toe-off
- **IMU patterns**: Low accel during stance, high during swing
- **Asymmetry**: Right foot slightly weaker (0.95x) to simulate PD
- **Tremor**: 5Hz oscillation for FoG detection testing

## Building Physical Hardware (Future)

### Required Components (Per Insole)
- 1× ESP32 Development Board (WiFi capable)
- 6× FSR (Force Sensitive Resistor) sensors
- 1× MPU6050 IMU (I2C)
- Resistors, wiring, breadboard/PCB
- Battery pack (3.7V LiPo recommended)
- Insole base (foam or gel)

### ESP32 Firmware Structure
The firmware file `backend/esp32_firmware/insole_client/main.cpp` needs to:
1. Connect to WiFi network
2. Read FSR analog values (6 pins)
3. Read MPU6050 via I2C (accel + gyro)
4. Connect to WebSocket server
5. Register as 'insole' client with foot side
6. Stream data packets at 100Hz

### Example Registration Packet
```json
{
  "type": "register",
  "clientType": "insole",
  "foot": "left",
  "deviceId": "ESP32_LEFT_001",
  "sessionId": "sess_abc123"
}
```

### Example Data Packet
```json
{
  "type": "data",
  "timestamp": 1702310425123,
  "sequenceNum": 4567,
  "fsr": {
    "heel": 850,
    "midfoot_medial": 320,
    "midfoot_lateral": 310,
    "forefoot_medial": 150,
    "forefoot_central": 160,
    "forefoot_lateral": 140
  },
  "imu": {
    "accel": { "x": 0.5, "y": -9.2, "z": 0.3 },
    "gyro": { "x": 12, "y": 5, "z": 3 }
  }
}
```

## How Multi-Sensor Fusion Works

### Event Detection
1. **FSREventDetector**: Heel strike when heel FSR > threshold, toe-off when forefoot < threshold
2. **IMUEventDetector**: Detect peaks in vertical acceleration
3. **CVEventDetector**: Track ankle Y-velocity for heel strikes

### Event Fusion
- Events from all sources clustered within 80ms window
- Weighted average of timestamps based on confidence
- Creates unified "fused event" with contributions from each source

### Step Construction
- Heel strike (fused) → Toe-off (fused) → Next heel strike (fused)
- Extracts 40+ features per step:
  - Spatiotemporal: step length, cadence, velocity
  - Temporal: stance time, swing time, double support
  - Kinematic: joint angles, peak velocities
  - Pressure: FSR progression, center of pressure
  - Stability: IMU variability, balance metrics

### Clinical Analysis
- **FoG Detection**: FFT on IMU window, detect 3-8Hz tremor
- **Festination**: Decreasing step length + increasing cadence
- **Asymmetry**: Left vs right step comparison
- **Severity Scoring**: Aggregate metrics to estimate PD stage

## Viewing Multi-Sensor Data

### In FusionStatusModal
- **Device Icons**: Camera (CV), Sensor icons (Insoles)
- **Connection Status**: Green checkmark = connected, Yellow hourglass = waiting
- **Packet Counts**: Shows data received per source
- **Step Details**: Fusion confidence indicates which sensors contributed

### What Each Sensor Contributes
- **CV Only**: Basic step detection, less accurate timing
- **CV + Insoles**: 
  - Precise heel strike/toe-off timing from FSR
  - Step length from CV keypoints
  - FoG tremor detection from IMU
  - Ground reaction forces from FSR
  - High fusion confidence (0.8-0.95)

## Troubleshooting

### "Only showing browser based CV data"
**Cause**: No insole devices connected (expected until hardware is built)

**Solution**:
1. Use mock simulator: Click "▶️ Start Mock Insoles"
2. Check FusionStatusModal to confirm all 3 devices connected
3. Verify step details show `fusionConfidence > 0.7` (indicates multi-sensor)

### Simulator Not Starting
- Check backend console for WebSocket errors
- Ensure backend server is running on port 5000
- Verify session exists before starting simulator

### No Steps Detected
- CV client needs clear view of walking person
- Mock insoles generate steps automatically (1 every 1.2 sec)
- Check packet counts are increasing in session stats

## Next Steps

### For Testing (No Hardware)
✅ Use mock simulator to see full system working  
✅ Verify fusion status shows all devices connected  
✅ Check clinical metrics are computed correctly  

### For Production (With Hardware)
1. Create ESP32 firmware (`backend/esp32_firmware/`)
2. Build physical insoles with FSR + IMU sensors
3. Flash firmware to ESP32 boards
4. Configure WiFi credentials and server IP
5. Power on insoles, connect to session
6. Conduct real gait assessments

## Key Differences: CV-Only vs Multi-Sensor

| Feature | CV Only | Multi-Sensor Fusion |
|---------|---------|---------------------|
| Heel Strike Detection | Ankle trajectory (~100ms error) | FSR pressure spike (~10ms error) |
| Step Length | Moderate accuracy | High accuracy with FSR + CV |
| FoG Detection | Not possible | FFT on IMU (3-8Hz tremor) |
| Ground Forces | Not available | FSR pressure readings |
| Fusion Confidence | N/A | 0.0-1.0 (quality indicator) |
| Clinical Accuracy | Good | Excellent |

## Summary

**Current State**: Backend fully implemented, frontend ready, but **only CV client can connect from browser**.

**To See Multi-Sensor Fusion**: Click "▶️ Start Mock Insoles" to simulate ESP32 hardware sending FSR + IMU data.

**To Use Real Hardware**: Build ESP32 insoles (firmware not yet created) with FSR sensors and IMU modules.

**Why Browser Alone Shows Only CV**: Browser APIs cannot access FSR sensors or IMU data - those require physical ESP32 microcontrollers with sensor connections.
