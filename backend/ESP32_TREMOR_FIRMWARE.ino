#include <Wire.h>
#include <MPU6050_light.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <EEPROM.h>
#include <vector>

// ========== SENSOR & NETWORK OBJECTS ==========
MPU6050 mpu(Wire);
WebSocketsClient webSocket;

// WiFi credentials
const char* ssid = "Airpro_2.4GHz";
const char* password = "66666666";

// WebSocket server
const char* ws_host = "172.16.14.55";
const uint16_t ws_port = 5000;
const char* ws_path = "/api/tremor/device";

// ====== SAMPLING CONFIG ======
const int SAMPLE_RATE = 200;            // 200 Hz for accurate tremor frequency
const float BATCH_DURATION_S = 0.1f;    // 100 ms batches for real-time UI
const int BATCH_SIZE = (int)(SAMPLE_RATE * BATCH_DURATION_S);

const unsigned long microsPerSample = 1000000UL / SAMPLE_RATE;

unsigned long lastSampleMicros = 0;
unsigned long lastConnectAttempt = 0;

// Device ID
String deviceId = "glove-unknown";

// ====== DATA STRUCT ======
struct Sample {
  uint32_t t_us;
  float gx, gy, gz;
  float ax, ay, az;
};

std::vector<Sample> batch;

// ====== CALIBRATION DATA ======
struct CalibData {
  uint32_t magic;
  float gx, gy, gz;   // gyro biases
  float ax, ay, az;   // accel offsets (including gravity adjustment)
};

CalibData calib;
bool calibLoaded = false;
const uint32_t CALIB_MAGIC = 0xC0FFEE01;

// ====== CONNECTION STATE ======
bool wsConnected = false;
unsigned long lastSuccessfulSend = 0;

// =======================
// CALIBRATION SAVE / LOAD
// =======================
void saveCalibration() {
  EEPROM.begin(64);
  calib.magic = CALIB_MAGIC;
  EEPROM.put(0, calib);
  EEPROM.commit();
  EEPROM.end();
  Serial.println("[CALIB] Calibration saved to flash");
}

bool loadCalibration() {
  EEPROM.begin(64);
  EEPROM.get(0, calib);
  EEPROM.end();

  if (calib.magic != CALIB_MAGIC) {
    Serial.println("[CALIB] No valid calibration found");
    return false;
  }

  Serial.println("[CALIB] Loaded calibration from flash:");
  Serial.printf("  Gyro offsets: gx=%.6f gy=%.6f gz=%.6f\n", calib.gx, calib.gy, calib.gz);
  Serial.printf("  Acc offsets:  ax=%.6f ay=%.6f az=%.6f\n", calib.ax, calib.ay, calib.az);
  return true;
}

// =======================
// GYRO BIAS CALIBRATION
// =======================
void calibrateGyro() {
  Serial.println("[CALIB] Gyro calibration: keep device absolutely still (5s)...");

  float gx = 0, gy = 0, gz = 0;

  for (int i = 0; i < 5000; i++) {  // ~5s at 1ms
    mpu.update();
    gx += mpu.getGyroX();
    gy += mpu.getGyroY();
    gz += mpu.getGyroZ();
    delay(1);
  }

  calib.gx = gx / 5000.0f;
  calib.gy = gy / 5000.0f;
  calib.gz = gz / 5000.0f;

  Serial.println("[CALIB] Gyro offsets computed:");
  Serial.printf("  gx=%.6f gy=%.6f gz=%.6f\n", calib.gx, calib.gy, calib.gz);
}

// =======================
// ACCEL (GRAVITY) CALIBRATION
// =======================
void calibrateAccel() {
  Serial.println("[CALIB] Accel calibration: hold device flat, Z+ up, still (5s)...");

  float ax = 0, ay = 0, az = 0;

  for (int i = 0; i < 5000; i++) {
    mpu.update();
    ax += mpu.getAccX();
    ay += mpu.getAccY();
    az += mpu.getAccZ();
    delay(1);
  }

  float meanAx = ax / 5000.0f;
  float meanAy = ay / 5000.0f;
  float meanAz = az / 5000.0f;

  // EXPECTED: (0, 0, +1g). We store offsets that will be subtracted.
  calib.ax = meanAx;          // will be subtracted to get ~0
  calib.ay = meanAy;          // will be subtracted to get ~0
  calib.az = meanAz - 1.0f;   // so that az - calib.az ~= 1g

  Serial.println("[CALIB] Accel offsets computed:");
  Serial.printf("  ax=%.6f ay=%.6f az=%.6f\n", calib.ax, calib.ay, calib.az);
}

// =======================
// APPLY CALIBRATION
// =======================
void applyCalibration(Sample &s) {
  // Remove gyro bias
  s.gx -= calib.gx;
  s.gy -= calib.gy;
  s.gz -= calib.gz;

  // Remove accel offsets (including gravity alignment)
  s.ax -= calib.ax;
  s.ay -= calib.ay;
  s.az -= calib.az;
}

// =======================
// WEBSOCKET EVENT HANDLER
// =======================
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_CONNECTED:
      Serial.println("[WS] CONNECTED to server");
      wsConnected = true;
      lastSuccessfulSend = 0; // reset timer
      break;

    case WStype_DISCONNECTED:
      Serial.println("[WS] DISCONNECTED from server");
      wsConnected = false;
      break;

    case WStype_TEXT:
      {
        // Parse server acknowledgment
        String payload_str = String((char*)payload).substring(0, length);
        Serial.print("[WS] RX: ");
        Serial.println(payload_str);
        
        // Check if it's an acknowledgment
        if (payload_str.indexOf("ack") >= 0) {
          lastSuccessfulSend = millis();
        }
      }
      break;

    case WStype_ERROR:
      Serial.print("[WS] ERROR: ");
      Serial.println((char*)payload);
      wsConnected = false;
      break;

    default:
      break;
  }
}

// =======================
// WEBSOCKET CONNECT (INITIALIZE ONCE)
// =======================
void initWebSocket() {
  Serial.println("[WS] Initializing WebSocket client...");
  webSocket.begin(ws_host, ws_port, ws_path);
  webSocket.onEvent(webSocketEvent);
  // Enable auto-reconnect with delays
  webSocket.setReconnectInterval(3000); // 3 seconds between reconnect attempts
}

// =======================
// SEND BATCH (100ms worth)
// =======================
void sendBatchIfReady(bool force = false) {
  if (batch.size() < (size_t)BATCH_SIZE && !force) return;

  if (!wsConnected) {
    Serial.println("[SEND] WS not connected; skipping");
    batch.clear();
    return;
  }

  // Build JSON payload
  String payload = "{";
  payload += "\"deviceId\":\"" + deviceId + "\",";
  payload += "\"sampleRate\":" + String(SAMPLE_RATE) + ",";
  payload += "\"samples\":[";

  for (size_t i = 0; i < batch.size(); i++) {
    const Sample &s = batch[i];
    payload += "{";
    payload += "\"timestamp_us\":" + String(s.t_us);
    payload += ",\"gx\":" + String(s.gx, 6);
    payload += ",\"gy\":" + String(s.gy, 6);
    payload += ",\"gz\":" + String(s.gz, 6);
    payload += ",\"ax\":" + String(s.ax, 6);
    payload += ",\"ay\":" + String(s.ay, 6);
    payload += ",\"az\":" + String(s.az, 6);
    payload += "}";
    if (i + 1 < batch.size()) payload += ",";
  }
  payload += "]}";

  // Send with size limit check (ESP32 memory)
  if (payload.length() > 4096) {
    Serial.printf("[SEND] Payload too large (%d bytes), skipping\n", payload.length());
    batch.clear();
    return;
  }

  webSocket.sendTXT(payload);
  Serial.printf("[SEND] batch %u samples (%u bytes)\n", (unsigned)batch.size(), payload.length());
  lastSuccessfulSend = millis();
  batch.clear();
}

// =======================
// CLEAN DEVICE ID
// =======================
String sanitizeDeviceId(const String &raw) {
  String s = raw;
  s.replace(":", "");
  s.replace("-", "");
  s.replace(" ", "");

  String out = "";
  for (size_t i = 0; i < s.length(); i++) {
    char c = s.charAt(i);
    if ((c >= '0' && c <= '9') ||
        (c >= 'A' && c <= 'Z') ||
        (c >= 'a' && c <= 'z') ||
        c == '_') {
      out += c;
    } else {
      out += '_';
    }
  }

  if (out.length() > 32) out = out.substring(0, 32);
  return out;
}

// =======================
// SETUP
// =======================
void setup() {
  Serial.begin(115200);
  delay(200);

  Wire.begin(21, 22);
  Wire.setClock(400000); // 400 kHz I2C for fast reads

  Serial.println("\n\n=== TREMOR GLOVE STARTUP ===");
  Serial.println("MPU6050 init...");
  if (mpu.begin() != 0) {
    Serial.println("MPU6050 init FAILED");
    while (1) {
      delay(1000);
    }
  }
  Serial.println("MPU6050 OK");

  // ----- CALIBRATION -----
  Serial.println("Loading saved calibration...");
  if (loadCalibration()) {
    calibLoaded = true;
  } else {
    calibLoaded = false;
  }

  if (!calibLoaded) {
    Serial.println("[CALIB] Starting new gyro + accel calibration...");
    delay(1000);  // time for user to keep still

    calibrateGyro();
    calibrateAccel();

    saveCalibration();
    calibLoaded = true;
  }

  Serial.println("[CALIB] Calibration ready.");

  // Device ID
  deviceId = "glove-" + sanitizeDeviceId(WiFi.macAddress());
  deviceId.toLowerCase();
  Serial.print("Device ID: "); Serial.println(deviceId);

  // WiFi
  Serial.print("WiFi connecting to "); Serial.println(ssid);
  WiFi.begin(ssid, password);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    Serial.print(".");
    delay(250);
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(String("IP: ") + WiFi.localIP());
  } else {
    Serial.println("[WiFi] Failed to connect within 15s");
    // Continue anyway, will try to connect later
  }

  // Init WebSocket
  Serial.println("Initializing WebSocket...");
  initWebSocket();

  lastSampleMicros = micros();
  batch.reserve(BATCH_SIZE + 10);
  
  Serial.println("=== SETUP COMPLETE ===\n");
}

// =======================
// MAIN LOOP
// =======================
void loop() {
  // Process WebSocket events (handles reconnection internally)
  webSocket.loop();

  // ===== precise 200 Hz sampling =====
  unsigned long nowMicros = micros();
  while ((nowMicros - lastSampleMicros) >= microsPerSample) {
    lastSampleMicros += microsPerSample;
    uint32_t ts = lastSampleMicros;

    mpu.update();

    Sample s;
    s.t_us = ts;
    s.gx = mpu.getGyroX();
    s.gy = mpu.getGyroY();
    s.gz = mpu.getGyroZ();
    s.ax = mpu.getAccX();
    s.ay = mpu.getAccY();
    s.az = mpu.getAccZ();

    if (calibLoaded) {
      applyCalibration(s);
    }

    batch.push_back(s);

    if (batch.size() >= (size_t)BATCH_SIZE) {
      sendBatchIfReady();
    }

    nowMicros = micros();
  }

  // Safety flush every 300ms to avoid stuck data
  static unsigned long lastForce = 0;
  if (millis() - lastForce > 300) {
    lastForce = millis();
    if (batch.size() > 0) {
      sendBatchIfReady(true);
    }
  }

  // Periodic status log (every 5 seconds)
  static unsigned long lastStatus = 0;
  if (millis() - lastStatus > 5000) {
    lastStatus = millis();
    unsigned long timeSinceLastSend = millis() - lastSuccessfulSend;
    Serial.printf("[STATUS] WiFi=%s WS=%s LastSend=%lums Batch=%u\n",
      WiFi.status() == WL_CONNECTED ? "OK" : "NO",
      wsConnected ? "CONNECTED" : "DISCONNECTED",
      lastSuccessfulSend > 0 ? timeSinceLastSend : 0,
      (unsigned)batch.size());
  }
}
