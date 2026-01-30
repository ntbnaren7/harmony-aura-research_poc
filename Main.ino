#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

/**************** WIFI ****************/
const char* ssid = "Luminara";
const char* password = "3012priya";

/**************** SERVER ****************/
WebServer server(8000);

/**************** HUMAN DATA ****************/
float HR = -1;
float HRV = -1;
float HRRecovery = -1;

float Motion = -1;
float MotionCadence = -1;
int   Jerks = 0;
int   OverCorrections = 0;
float ReactionLatency = -1;

float SkinTemp = -1;
float TempDrift = -1;

float WorkMinutes = -1;
float BreakGap = -1;
float ShiftHours = -1;

/**************** MACHINE DATA ****************/
float Actuator = -1;
float Torque = -1;
float DutyCycle = -1;

float Vibration = -1;
float RPMInstability = -1;
bool  Shock = false;

float EngTemp = -1;
float OilTemp = -1;

float Hours = -1;
float ContinuousRun = -1;

float Health = -1;
String MaintenanceState = "";

/**************** CIS ****************/
int cis = 0;
String command = "NORMAL";

/**************** CONSTANTS ****************/
const float HR_MAX = 160;
const float HRV_BASE = 80;
const float MOTION_MAX = 3.0;

const float ENG_MIN = 60, ENG_MAX = 110;
const float OIL_MIN = 50, OIL_MAX = 120;
const float HOURS_MAX = 2000;

/************************************************************/
float clamp(float v) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/************************************************************/
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n=== ESP-2 CIS NODE BOOT ===");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n[WiFi] Connected");
  Serial.print("[ESP-2 IP] ");
  Serial.println(WiFi.localIP());

  server.on("/esp1/data", HTTP_POST, receiveHumanData);
  server.on("/machine/data", HTTP_POST, receiveMachineData);
  server.on("/esp1/cmd", HTTP_GET, sendCommand);

  // 🔥 CRITICAL DEBUG ROUTE
  server.onNotFound([]() {
    Serial.print("[404] Request to: ");
    Serial.println(server.uri());
    server.send(404, "text/plain", "NOT FOUND");
  });

  server.begin();
  Serial.println("[SERVER] Ready on port 8000");
}

/************************************************************/
void loop() {
  server.handleClient();
  computeCIS();
}

/************************************************************
 * RECEIVE HUMAN DATA
 ************************************************************/
void receiveHumanData() {

  String body = server.arg("plain");
  Serial.println("\n[RAW HUMAN PAYLOAD]");
  Serial.println(body);

  StaticJsonDocument<1024> doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    Serial.print("[HUMAN JSON ERROR] ");
    Serial.println(err.c_str());
    server.send(400, "text/plain", "JSON ERROR");
    return;
  }

  JsonObject h = doc["human"];

  HR  = h["cardiovascular"]["heart_rate_bpm"].as<float>();
  HRV = h["cardiovascular"]["heart_rate_variability_ms"].as<float>();
  HRRecovery = h["cardiovascular"]["hr_recovery_rate"].as<float>();

  Motion = h["motion_posture"]["motion_magnitude"].as<float>();
  MotionCadence = h["motion_posture"]["motion_cadence"].as<float>();
  Jerks = h["motion_posture"]["sudden_jerks_count"].as<int>();
  OverCorrections = h["motion_posture"]["over_corrections_count"].as<int>();
  ReactionLatency = h["motion_posture"]["reaction_latency_ms"].as<float>();

  SkinTemp = h["physiological_stress"]["skin_temperature_c"].as<float>();
  TempDrift = h["physiological_stress"]["temperature_drift_rate"].as<float>();

  WorkMinutes = h["behavioral"]["continuous_work_minutes"].as<float>();
  BreakGap = h["behavioral"]["break_gap_minutes"].as<float>();
  ShiftHours = h["behavioral"]["shift_hours_accumulated"].as<float>();

  Serial.println("[HUMAN DATA — OK]");
  server.send(200, "text/plain", "HUMAN OK");
}

/************************************************************
 * RECEIVE MACHINE DATA
 ************************************************************/
void receiveMachineData() {

  String body = server.arg("plain");
  Serial.println("\n[RAW MACHINE PAYLOAD]");
  Serial.println(body);

  StaticJsonDocument<1024> doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    Serial.print("[MACHINE JSON ERROR] ");
    Serial.println(err.c_str());
    server.send(400, "text/plain", "MACHINE JSON ERROR");
    return;
  }

  JsonObject m = doc["machine"];

  Actuator  = m["operational_intensity"]["actuator_speed_norm"].as<float>();
  Torque    = m["operational_intensity"]["torque_load_norm"].as<float>();
  DutyCycle = m["operational_intensity"]["duty_cycle"].as<float>();

  Vibration      = m["mechanical_stress"]["vibration_rms_norm"].as<float>();
  RPMInstability = m["mechanical_stress"]["rpm_instability"].as<float>();
  Shock          = m["mechanical_stress"]["shock_event"].as<bool>();

  EngTemp = m["thermal_stress"]["engine_temperature_c"].as<float>();
  OilTemp = m["thermal_stress"]["oil_temperature_c"].as<float>();

  Hours = m["usage_fatigue"]["operating_hours_total"].as<float>();
  ContinuousRun = m["usage_fatigue"]["continuous_run_minutes"].as<float>();

  Health = m["health_context"]["machine_health_score"].as<float>();
  MaintenanceState = m["health_context"]["maintenance_state"].as<String>();

  Serial.println("[MACHINE DATA — OK]");
  server.send(200, "text/plain", "MACHINE OK");
}

/************************************************************
 * CIS COMPUTATION
 ************************************************************/
void computeCIS() {

  if (HR < 0 || Actuator < 0) return;

  float HR_norm = clamp(HR / HR_MAX);
  float HRV_norm = clamp(1.0 - (HRV / HRV_BASE));
  float Motion_norm = clamp(Motion / MOTION_MAX);

  float HSS = 0.4*HR_norm + 0.4*HRV_norm + 0.2*Motion_norm;

  float MSS =
    (0.22*Actuator) +
    (0.22*Torque) +
    (0.18*Vibration) +
    (0.13*((EngTemp - ENG_MIN)/(ENG_MAX-ENG_MIN))) +
    (0.13*((OilTemp - OIL_MIN)/(OIL_MAX-OIL_MIN))) +
    (0.12*DutyCycle) +
    (0.10*RPMInstability);

  float FAF =
    (0.6*(Hours / HOURS_MAX)) +
    (0.4*(1.0 - Health/100.0));

  cis = (int)(100 * (0.45*HSS + 0.45*MSS + 0.10*FAF));
  cis = constrain(cis, 0, 100);

  if (Shock) cis = min(100, cis + 8);

  command = (cis >= 70) ? "NORMAL" : (cis >= 50) ? "ALERT" : "BREAK";

  Serial.printf("[CIS] %d | CMD=%s\n", cis, command.c_str());
}

/************************************************************
 * SEND CIS TO ESP-1
 ************************************************************/
void sendCommand() {
  StaticJsonDocument<128> doc;
  doc["cis"] = cis;
  doc["command"] = command;
  String payload;
  serializeJson(doc, payload);
  server.send(200, "application/json", payload);
}
