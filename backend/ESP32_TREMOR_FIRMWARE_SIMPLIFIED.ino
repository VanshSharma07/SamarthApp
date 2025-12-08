#include <Wire.h>
#include <MPU6050_light.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <EEPROM.h>
#include <vector>

// ======================================================
//  OBJECTS
// ======================================================
MPU6050 mpu(Wire);
WebSocketsClient webSocket;

// ------------------------------------------------------
//  WiFi
// ------------------------------------------------------
const char* ssid = "Airpro_2.4GHz";
const char* password = "66666666";

// ------------------------------------------------------
//  WebSocket Server
// ------------------------------------------------------
const char* ws_host = "172.16.14.55";
const uint16_t ws_port = 5000;
const char* ws_path = "/api/tremor/device";

// ------------------------------------------------------
//  Sampling
// ------------------------------------------------------
const int SAMPLE_RATE = 200;            // 200 Hz
const float BATCH_DURATION_S = 0.1f;    // send every 100ms
const int BATCH_SIZE = (int)(SAMPLE_RATE * BATCH_DURATION_S);
const unsigned long microsPerSample = 1000000UL / SAMPLE_RATE;

unsigned long lastSampleMicros = 0;

// ======================================================
//  DATA STRUCT - SEND FULL GYRO/ACCEL FOR FFT
// ======================================================
struct Sample {
  uint32_t t_us;
  float gx, gy, gz;
  float ax, ay, az;
};

std::vector<Sample> batch;

// ======================================================
//  Calibration Data
// ======================================================
struct CalibData {
  uint32_t magic;
  float gx, gy, gz;
  float ax, ay, az;
};

CalibData calib;
bool calibLoaded = false;
const uint32_t CALIB_MAGIC = 0xC0FFEE01;

// ======================================================
//  WebSocket & Streaming State
// ======================================================
bool wsConnected = false;
unsigned long totalSamplesSent = 0;
unsigned long totalBatchesSent = 0;

// ======================================================
//  SAVE / LOAD CALIBRATION
// ======================================================
void saveCalibration() {
  EEPROM.begin(64);
  calib.magic = CALIB_MAGIC;
  EEPROM.put(0, calib);
  EEPROM.commit();
  EEPROM.end();
  Serial.println("[CALIB] Saved.");
}

bool loadCalibration() {
  EEPROM.begin(64);
  EEPROM.get(0, calib);
  EEPROM.end();

  if (calib.magic != CALIB_MAGIC) {
    Serial.println("[CALIB] No saved calibration.");
    return false;
  }

  Serial.println("[CALIB] Loaded:");
  Serial.printf("  Gyro: %.6f %.6f %.6f\n", calib.gx, calib.gy, calib.gz);
  Serial.printf("  Acc : %.6f %.6f %.6f\n", calib.ax, calib.ay, calib.az);

  return true;
}

// ======================================================
//  CALIBRATE GYRO (5 seconds still)
// ======================================================
void calibrateGyro() {
  Serial.println("[CALIB] Gyro calibration (keep still 5s)");

  float gx = 0, gy = 0, gz = 0;

  for (int i = 0; i < 5000; i++) {
    mpu.update();
    gx += mpu.getGyroX();
    gy += mpu.getGyroY();
    gz += mpu.getGyroZ();
    delay(1);
  }

  calib.gx = gx / 5000.0f;
  calib.gy = gy / 5000.0f;
  calib.gz = gz / 5000.0f;
}

// ======================================================
//  ACCEL CALIBRATION
// ======================================================
void calibrateAccel() {
  Serial.println("[CALIB] Accel calibration (keep flat & still 5s)");

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

  calib.ax = meanAx;
  calib.ay = meanAy;
  calib.az = meanAz - 1.0f; // remove gravity
}

// ======================================================
//  APPLY CALIBRATION
// ======================================================
void applyCalibration(Sample &s) {
  s.gx -= calib.gx;
  s.gy -= calib.gy;
  s.gz -= calib.gz;

  s.ax -= calib.ax;
  s.ay -= calib.ay;
  s.az -= calib.az;
}

// ======================================================
//  WEBSOCKET EVENT HANDLER
// ======================================================
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("[WS] CONNECTED");
      wsConnected = true;
      break;

    case WStype_DISCONNECTED:
      Serial.println("[WS] DISCONNECTED");
      wsConnected = false;
      break;

    case WStype_TEXT:
      {
        String msg = String((char*)payload).substring(0, length);
        if (msg.indexOf("ack") >= 0) {
          Serial.print("[WS] RX: ");
          Serial.println(msg);
        }
      }
      break;

    default:
      break;
  }
}

// ======================================================
//  INITIALIZE WEBSOCKET
// ======================================================
void initWebSocket() {
  webSocket.begin(ws_host, ws_port, ws_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(2000);
}

// ======================================================
//  SEND JSON BATCH WITH FULL GYRO/ACCEL (CONTINUOUS)
// ======================================================
void sendBatchIfReady(bool force = false) {
  if (batch.size() < BATCH_SIZE && !force) return;

  if (!wsConnected) {
    // Don't spam logs; keep buffering until connection restored
    if (batch.size() > BATCH_SIZE * 3) {
      Serial.printf("[SEND] WS disconnected, buffered: %u samples\n", (unsigned)batch.size());
    }
    return; // Keep samples; don't clear
  }

  // Build JSON payload
  String payload = "{";
  payload += "\"deviceId\":\"glove\",";
  payload += "\"sampleRate\":200,";
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

  // Check payload size
  if (payload.length() > 3000) {
    Serial.printf("[SEND] Payload large (%u bytes), will split next batch\n", payload.length());
    return;
  }

  // Send the batch
  webSocket.sendTXT(payload);
  totalSamplesSent += batch.size();
  totalBatchesSent++;
  
  Serial.printf("[SEND] Batch #%lu: %u samples (%u bytes)\n", totalBatchesSent, (unsigned)batch.size(), payload.length());

  batch.clear();
}

// ======================================================
//  DEVICE ID CLEANING
// ======================================================
String sanitizeDeviceId(String raw) {
  raw.replace(":", "");
  raw.replace("-", "");
  raw.toLowerCase();
  return raw;
}

// ======================================================
//  SETUP
// ======================================================
void setup() {
  Serial.begin(115200);
  delay(200);

  Wire.begin(21, 22);
  Wire.setClock(400000);

  Serial.println("\n=== TREMOR GLOVE START ===");
  Serial.println("MPU6050 init...");
  if (mpu.begin() != 0) {
    Serial.println("MPU FAIL");
    while (1);
  }
  Serial.println("MPU OK");

  // Load or calibrate
  if (!loadCalibration()) {
    delay(1000);
    calibrateGyro();
    calibrateAccel();
    saveCalibration();
  }

  // WiFi
  Serial.print("WiFi...");
  WiFi.begin(ssid, password);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    Serial.print(".");
    delay(300);
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" connected");
    Serial.println(String("IP: ") + WiFi.localIP());
  } else {
    Serial.println(" failed (will retry)");
  }

  Serial.println("WebSocket init...");
  initWebSocket();

  batch.reserve(BATCH_SIZE + 10);
  lastSampleMicros = micros();
  
  Serial.println("=== READY ===\n");
}

// ======================================================
//  MAIN LOOP
// ======================================================
void loop() {
  webSocket.loop();

  unsigned long nowMicros = micros();

  while (nowMicros - lastSampleMicros >= microsPerSample) {
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

    applyCalibration(s);

    batch.push_back(s);

    if (batch.size() >= BATCH_SIZE)
      sendBatchIfReady();

    nowMicros = micros();
  }

  // Aggressive flush every 150ms for continuous streaming
  static unsigned long lastFlush = 0;
  if (millis() - lastFlush > 150) {
    lastFlush = millis();
    if (batch.size() > 0) sendBatchIfReady(true);
  }

  // Status line every 5s with streaming metrics
  static unsigned long lastStatus = 0;
  if (millis() - lastStatus > 5000) {
    lastStatus = millis();
    unsigned long uptime = millis();
    float throughput = (uptime > 0) ? (totalSamplesSent / (uptime / 1000.0f)) : 0;
    Serial.printf("[STATUS] WiFi=%s WS=%s Queue=%u Sent=%lu batches (%.1f Hz throughput)\n",
      WiFi.status() == WL_CONNECTED ? "OK" : "NO",
      wsConnected ? "LIVE" : "DOWN",
      (unsigned)batch.size(),
      totalBatchesSent,
      throughput);
  }
}
