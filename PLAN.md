# Development Plan

### Phase 1: Database & API Setup
* Schema design: Tables for `Workers`, `Machines`, `Environment`, and `Alert_Logs`.
* Establish API endpoints for ESP32 POST requests.

### Phase 2: CIS & ML Logic
* Develop the algorithm for the **CIS Score**.
* Integrate a Python-based ML service (or Edge Impulse) to analyze vibration/torque patterns for predictive maintenance.

### Phase 3: Web Application Shell
* Implement Sign-in/Sign-up logic.
* Build the Dashboard layout with the sidebar and header.

### Phase 4: Real-time UI Integration
* Connect the "Flash Cards" to the database.
* Implement the color-coding logic (Green/Yellow/Red) based on the `risk_state` field.
* Build the Supervisor "Break Action" toggle.