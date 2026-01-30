# Harmony AuraOS: AI-Driven Site Safety & Predictive Maintenance

Harmony AuraOS is a next-generation industrial safety platform that fuses **Worker Health Vitals** and **Machine Telemetry** using deep learning to prevent accidents and predict equipment failure before it happens.

---

## 🚀 Key Features

### 1. **Neural Analytics (Predictive Maintenance)**
- **1D CNN Engine**: Uses a custom-trained 1D Convolutional Neural Network (PyTorch) to analyze vibration patterns.
- **RUL Prediction**: Predicts Remaining Useful Life and Failure Probability in real-time.
- **Explainable AI Findings**: Instead of a "black box," the system highlights specific findings like "High Frequency Vibration in 700Hz band."

### 2. **Site Safety Fusion (CIS Engine)**
- **Combined Impact Score (CIS)**: A proprietary risk engine that calculates safety by merging human and machine data.
- **Worker Vitals**: Real-time monitoring of Heart Rate, HRV, Body Temperature, and Fatigue.
- **Machine Stress**: Real-time monitoring of Vibration, Stress Index, and Temperature.
- **Automatic SOS**: Integrated with Twilio for automated emergency voice calls to supervisors when a "Critical" CIS state is detected.

### 3. **Hardware-in-the-Loop (HIL)**
- **ESP32 Integration**: Direct real-time data polling from physical ESP32 sensors.
- **Smart Discovery**: Automatically switches between Simulation and Live Hardware modes.

### 4. **Computer Vision & Monitoring**
- **MJPEG/RTSP Proxy**: Live high-speed camera stream integration with smart fallback for low-bandwidth scenarios.
- **Multi-Zone Monitor**: Segmented view for Machine zones and Worker-only zones.

---

## 🛠️ Technical Architecture

### **Frontend (Next.js 14)**
- **Modern Dashboard**: Built with Radix UI, Tailwind CSS, and Framer Motion for smooth, premium animations.
- **Explanatory UI**: Designed for clarity during pitches/jury reviews. Features "Data Fusion" animations showing sensor data flowing into the Neural Core.
- **Real-time Updates**: Live charting using Recharts and custom SVG gauges.

### **Backend (FastAPI / Python)**
- **High Performance**: Asynchronous API endpoints leveraging `uvicorn`.
- **Inference Engine**: PyTorch-based inference buffer that holds the last 50 sensor readings for CNN pattern matching.
- **Database**: SQLite with SQLAlchemy for worker/machine telemetry persistence.

### **AI Model (1D Convolutional Neural Network)**
- **Architecture**: `Conv1D` -> `MaxPool` -> `Dropout` -> `Flatten` -> `Dense`.
- **Input Tensor**: 50 time-steps x 4 sensor features (Vibration, Temperature, RPM, Stress).
- **Output**: Multi-head output for Probability and RUL.

---

## 📊 Visual Explanation (How IT Works)

### **The CIS Fusion Concept**
The system treats the site as a single living organism. 
- **Cold Stream (Machine)** + **Warm Stream (Human)** = **Risk Score**.
- If a machine is vibrating heavily (Hazard) and a worker nearby has a high heart rate (Fatigue), the CIS score spikes to **Critical**, triggering an alert.

### **Deep Learning Pipeline**
Our 1D CNN doesn't just look at values; it looks at *waves*. It detects high-frequency micro-patterns in vibration that signify bearing wear long before a human can hear it.

---

## 📦 Setup & Installation

### **1. Backend Setup**
```bash
cd backend
pip install -r requirements.txt
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
*Note: Ensure `.env` contains your `TWILIO_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`.*

### **2. Frontend Setup**
```bash
cd smartsite
pnpm install
pnpm dev
```

### **3. ESP32 Setup**
- Flash the ESP32 with the provided firmware.
- Ensure the ESP32 and Backend are on the same network.
- The system will auto-detect the hardware data via the `/api/workers/hardware-poll` endpoint.

---

## 🏆 Pitch Summary
Harmony AuraOS transforms raw industrial data into **actionable safety intelligence**. By combining the biological state of the worker with the mechanical state of the environment, we bridge the gap between "Reactive Safety" and **"Predictive Protection."**
