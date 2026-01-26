# Security & Privacy Protocol

### Data Privacy
* **Encryption:** All data in transit (ESP32 to Cloud) must use HTTPS/TLS 1.2+.
* **Anonymization:** Worker names should be stored separately from health metrics where possible to comply with labor privacy standards.

### Access Control
* **Role-Based Access (RBAC):** Only authenticated 'Supervisors' can view individual worker health cards or issue break flags.
* **Device Auth:** ESP32 modules must use unique API keys or JWT tokens to prevent unauthorized data injection into the database.