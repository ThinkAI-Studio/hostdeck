# Hardware Telemetry & Sensor Mapping: Technical Analysis

> **Goal:** Integrate deep motherboard hardware telemetry (Voltages, Temperatures, Fans) into HomeLab Dashboard, inspired by the "Node Telemetry" Proxmox design.

## 1. UX/UI Analysis & The "Mapping" Concept
Standard Linux hardware monitoring (`lm-sensors`) exposes raw, uncontextualized data (e.g., `in0`, `temp1`). The genius of the proposed design is embracing this raw data rather than hiding it.
- **Mapped vs. Unmapped:** Sensors are explicitly categorized. `in0` starts as "Chưa map" (Unmapped). The user can assign it a label (e.g., "Vcore") and nominal bounds. Once mapped, it moves to the "Đã map" section.
- **Heatmap Sorting:** Thermal sensors are sorted dynamically from hottest to coldest. This is critical for incident response (e.g., instantly seeing that the PCH/SYSTIN is at 118°C).
- **Segmented Gauges:** Using circular, segmented SVG gauges for voltage channels provides extremely high data density while remaining readable.

## 2. Backend Implementation (The Go Agent)
To maintain our "zero external dependency" philosophy, the host agent will **not** rely on the `sensors` binary. Instead, it will parse the sysfs hardware monitoring interface directly.
- **Path:** `/sys/class/hwmon/hwmon*/`
- **Data Types:**
  - `in*_input`: Voltage in millivolts (divide by 1000 for V).
  - `temp*_input`: Temperature in millidegrees Celsius (divide by 1000 for °C).
  - `fan*_input`: Fan speed in RPM.
- **Challenge:** Sysfs enumeration can change across reboots (e.g., `hwmon0` becomes `hwmon1`). The agent must resolve the underlying chip name (via `/sys/class/hwmon/hwmon*/name`) to ensure consistent reporting.

## 3. Data Payload & WebSocket Transport
The telemetry data must be appended to the existing agent heartbeat payload.
```json
"hwmon": {
  "nct6798": {
    "voltages": { "in0": 1.160, "in1": 1.040, "in2": 3.296 },
    "temps": { "temp1": 43.0, "temp2": 118.0, "temp3": 48.0 },
    "fans": { "fan1": 1200, "fan2": 0 }
  },
  "coretemp": {
    "temps": { "temp1": 41.0, "temp2": 39.0 }
  }
}
```
*Optimization:* To save bandwidth, nominal bounds and human-readable names are NOT sent by the agent. The agent only sends raw values. The Dashboard applies the mappings.

## 4. Configuration & Database Persistence
User-defined mappings must survive agent restarts and Dashboard upgrades.
- Mappings will be stored in the central SQLite database (e.g., table `sensor_mappings`).
- Schema concept: `node_id`, `chip_name`, `sensor_key` (e.g., `in0`), `custom_label` (e.g., `Vcore`), `min_val`, `max_val`.
- When the UI renders the payload, it merges the raw agent data with the SQLite mapping configuration to produce the final "Mapped" vs "Unmapped" view.

## 5. Implementation Phasing
This is an advanced feature that should be implemented after core functionalities (Wake-on-LAN, Alerting) are stabilized.
- **Phase 1:** Update Go agent to parse `/sys/class/hwmon/` and append to the WebSocket payload.
- **Phase 2:** Build the database schema and backend API for saving sensor mappings.
- **Phase 3:** Implement the frontend UI (Gauges, Heatmap list, Mapping modal).
