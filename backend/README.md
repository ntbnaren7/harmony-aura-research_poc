# Harmony Aura OS - FastAPI Backend

AI-Powered Construction Safety Monitoring API for ESP32 sensor integration.

## Quick Start

### 1. Create Supabase Database (FREE)
1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project" and create a project
3. Go to **Settings → Database**
4. Copy the **Connection string** (URI tab)
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   ```

### 2. Install Dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env and paste your Supabase connection string
```

### 4. Run the Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Access API Docs
Open http://localhost:8000/docs in your browser.

---

## API Endpoints

### ESP32 Endpoints (POST - sensors push data)

| Endpoint | Description |
|----------|-------------|
| `POST /api/workers/vitals` | Push worker vital signs |
| `POST /api/machines/telemetry` | Push machine sensor data |

### Dashboard Endpoints (GET - frontend fetches data)

| Endpoint | Description |
|----------|-------------|
| `GET /api/workers` | List all workers with latest vitals |
| `GET /api/workers/{id}` | Single worker details |
| `GET /api/workers/{id}/history` | Historical vitals for charts |
| `GET /api/machines` | List all machines with telemetry |
| `GET /api/machines/{id}` | Single machine details |
| `GET /api/machines/{id}/history` | Historical telemetry for charts |
| `GET /api/dashboard/stats` | Summary statistics |

---

## ESP32 Integration Example

```cpp
#include <HTTPClient.h>
#include <ArduinoJson.h>

void sendWorkerVitals() {
  HTTPClient http;
  http.begin("http://YOUR_SERVER:8000/api/workers/vitals");
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<256> doc;
  doc["worker_id"] = "WK-7822";
  doc["heart_rate"] = heartRate;
  doc["hrv"] = hrvValue;
  doc["temperature"] = bodyTemp;
  doc["jerk_count"] = jerkCount;
  doc["machine_stress_index"] = stressIndex;
  doc["vibration_rms"] = vibrationRms;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  http.end();
}
```

---

## Database Schema

### workers
- `worker_id` (VARCHAR) - Unique worker ID
- `name` (VARCHAR) - Worker name
- `department` (VARCHAR) - Department
- `is_active` (BOOLEAN) - Active status

### worker_vitals
- `worker_id` (FK) - Reference to worker
- `heart_rate` (INT) - BPM
- `hrv` (INT) - Heart rate variability
- `temperature` (FLOAT) - Body temperature
- `cis_score` (INT) - Composite Index Score
- `risk_state` (VARCHAR) - LOW/MEDIUM/HIGH
- `timestamp` (DATETIME) - Reading time

### machines
- `machine_id` (VARCHAR) - Unique machine ID
- `name` (VARCHAR) - Display name
- `type` (VARCHAR) - CRANE/EXCAVATOR/etc.

### machine_telemetry
- `machine_id` (FK) - Reference to machine
- `status` (VARCHAR) - OPERATIONAL/WARNING/MAINTENANCE
- `stress_index` (INT) - 0-100
- `temperature` (FLOAT) - Operating temp
- `health_score` (INT) - 0-100
- `failure_probability` (INT) - AI-predicted 0-100%
- `timestamp` (DATETIME) - Reading time
