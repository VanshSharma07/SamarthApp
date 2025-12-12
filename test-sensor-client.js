const WebSocket = require('ws');

// Connect to the backend WebSocket server
// For local testing: ws://localhost:5000/ws/sensors
// For remote device: ws://YOUR_IP:5000/ws/sensors (e.g., ws://192.168.1.100:5000/ws/sensors)
const SERVER_URL = process.env.WS_SERVER || 'ws://localhost:5000/ws/sensors';
const ws = new WebSocket(SERVER_URL);

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('📡 Starting to send sensor data...\n');
  
  // Send sample data every 100ms (simulating 10 Hz)
  let counter = 0;
  const interval = setInterval(() => {
    const sampleData = {
      deviceId: counter % 2 === 0 ? "left-insole" : "right-insole",
      timestamp: Date.now(),
      leftFoot: {
        fsr: {
          sensor1: Math.floor(Math.random() * 500 + 200),  // 200-700 range
          sensor2: Math.floor(Math.random() * 400 + 150),  // 150-550 range
          sensor3: Math.floor(Math.random() * 600 + 300),  // 300-900 range
          sensor4: Math.floor(Math.random() * 300 + 100),  // 100-400 range
          sensor5: Math.floor(Math.random() * 450 + 200),  // 200-650 range
          sensor6: Math.floor(Math.random() * 350 + 150)   // 150-500 range
        }
      },
      rightFoot: {
        fsr: {
          sensor1: Math.floor(Math.random() * 500 + 200),
          sensor2: Math.floor(Math.random() * 400 + 150),
          sensor3: Math.floor(Math.random() * 600 + 300),
          sensor4: Math.floor(Math.random() * 300 + 100),
          sensor5: Math.floor(Math.random() * 450 + 200),
          sensor6: Math.floor(Math.random() * 350 + 150)
        }
      },
      imu: {
        accel: {
          x: parseFloat((Math.random() * 0.5 - 0.25).toFixed(2)),      // -0.25 to 0.25
          y: parseFloat((Math.random() * 0.6 - 0.3).toFixed(2)),       // -0.3 to 0.3
          z: parseFloat((9.81 + Math.random() * 0.2 - 0.1).toFixed(2)) // ~9.81 (gravity)
        },
        gyro: {
          x: parseFloat((Math.random() * 3 - 1.5).toFixed(2)),  // -1.5 to 1.5
          y: parseFloat((Math.random() * 0.5 - 0.25).toFixed(2)), // -0.25 to 0.25
          z: parseFloat((Math.random() * 0.3 - 0.15).toFixed(2))  // -0.15 to 0.15
        }
      }
    };
    
    // Send the data as JSON string
    ws.send(JSON.stringify(sampleData));
    
    counter++;
    if (counter % 10 === 0) {
      console.log(`📊 Sent ${counter} packets - Last packet:`, {
        deviceId: sampleData.deviceId,
        leftFootSensor1: sampleData.leftFoot.fsr.sensor1,
        rightFootSensor1: sampleData.rightFoot.fsr.sensor1,
        accelZ: sampleData.imu.accel.z
      });
    }
    
    // Stop after 300 packets (30 seconds at 10Hz)
    if (counter >= 300) {
      console.log('\n✅ Test completed - sent 300 packets');
      clearInterval(interval);
      ws.close();
      process.exit(0);
    }
  }, 100); // Send every 100ms (10 Hz)
});

ws.on('message', (data) => {
  // Echo back from server
  const msg = JSON.parse(data);
  if (msg.deviceId) {
    console.log('📥 Received echo:', msg.deviceId);
  }
});

ws.on('close', () => {
  console.log('❌ Disconnected from WebSocket server');
});

ws.on('error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

console.log(`🔌 Connecting to ${SERVER_URL}...`);
console.log('Press Ctrl+C to stop\n');
