# Project Assumptions: AI-Powered Construction Safety & Maintenance

### Hardware & Connectivity
* **ESP32 Modules:** Three distinct ESP32 setups exist: Worker Wearable, Machine Monitor, and Environmental Station.
* **Connectivity:** All ESP32 modules have a stable Wi-Fi/LoRa connection to update a central database via a REST API or WebSockets.
* **Sampling Rate:** Sensor data is pushed to the database at 5-10 second intervals to balance real-time monitoring with battery/bandwidth constraints.

### Data & Logic
* **CIS Score (Construction Integrity Score):** A calculated metric derived from the weighted average of heart rate variability, jerk count, and machine stress.
* **Risk State:** A categorical value (0 = Green/Safe, 1 = Yellow/Warning, 2 = Red/Danger) based on threshold breaches in the database.
* **Break Flags:** The database includes a boolean or timestamped flag updated by the supervisor that triggers an alert on the worker's UI.

### Software Stack
* **Frontend:** React.js or Next.js for the web application (optimized for high-frequency data updates).
* **Backend/Database:** Firebase or PostgreSQL with a real-time layer (Supabase) to handle incoming ESP32 data.