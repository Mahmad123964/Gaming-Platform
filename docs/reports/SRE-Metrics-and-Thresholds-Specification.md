# NexusPlay — SRE Metrics & Thresholds Specification

**Document Version:** 2.0  
**Phase:** Phase 2 — Operations & Reliability  
**Sprint:** Sprint 07 Final Certification Baseline  
**Approved Baseline:** SRE Architecture Specification v2.0  

---

## 1. Service Level Indicators (SLIs) & Objectives (SLOs)

| Metric | Measurement Method | Target SLO | Warning Threshold | Alerting Breach Threshold | Recovery Auto-Resolve | Classification / Source |
|:---|:---|:---:|:---:|:---:|:---:|:---|
| **Availability SLI** | `(Total - 5xx) / Total * 100` | `>= 99.5%` | `< 99.5%` | `< 95.0%` | `>= 98.0%` | Core SRE SLI Baseline |
| **5xx Server Error Rate** | `(5xx Requests) / Total * 100` | `<= 1.0%` | `> 1.0%` | `>= 5.0%` (AC-42.1) | `< 2.0%` (AC-42.3) | Approved Provisional Staging Default |
| **4xx Client Error Rate** | `(4xx Requests) / Total * 100` | `<= 5.0%` | `> 5.0%` | `>= 15.0%` | `< 8.0%` | Monitored Separately (Does Not Erode SLI) |
| **API Response Latency (p95)** | Nearest-Rank 95th Percentile Duration | `< 500ms` | `>= 350ms` | `>= 500ms` | `< 300ms` | Core SRE Latency SLO |
| **API Response Latency (Avg)** | Mean Request Duration | `< 100ms` | `>= 150ms` | `>= 250ms` | `< 80ms` | Core SRE Latency SLO |
| **Process CPU Utilization** | `process.cpuUsage()` / cores / interval | `< 70%` | `>= 75%` | `>= 85%` | `< 60%` | Process-Level Scope (`cpuScope: "process"`) |
| **Process Memory (RSS)** | `process.memoryUsage().rss` in MB | `< 256 MB` | `>= 300 MB` | `>= 450 MB` | `< 200 MB` | Binary Mebibytes (`bytes / (1024 * 1024)`) |
| **Database Query Ping** | `SELECT 1 as healthy` Latency | `< 10ms` | `>= 25ms` | `>= 100ms` or error | `< 5ms` | SQLite DatabaseSync Ping |
| **WebSocket Connection Gateway**| Atomic Client Counter | `< 50ms` | `>= 100ms` | Disconnected / Timeout | Reconnected | Native WebSockets Active CCU |

> **Threshold Grounding Note (Task 4):**  
> The **5.0% error-rate breach trigger** and **2.0% recovery auto-resolve threshold** are explicitly classified as **Approved Provisional Staging Defaults** established during Sprint 07 architecture review. In staging, traffic bursts are simulated, and tighter enterprise production thresholds (e.g., 0.1% / 0.05%) would cause excessive staging noise. These values will be re-calibrated during production capacity planning prior to general availability.

---

## 2. Metric Measurement & Calculation Methodology

### 2.1 CPU Utilization: Process-Level vs. Host-Level
- **Measurement Scope:** `cpuScope: 'process'`.
- Node.js executes as a single-threaded process (with libuv threadpool workers). Metric calculations utilize `process.cpuUsage(previousUsage)`, comparing user and system CPU microseconds elapsed against real clock time multiplied by available CPU cores:
  $$\text{cpuPercent} = \frac{\Delta\text{user} + \Delta\text{system}}{\Delta t \times 1000 \times \text{cores}} \times 100$$
- This measures the actual CPU demand imposed by the NexusPlay Node.js server process rather than total host CPU utilization, ensuring background OS tasks or other developer processes do not distort platform SLIs.

### 2.2 Memory Units & Allocation
- **Units:** Explicitly labeled in binary Megabytes (`unit: 'MB'`, where $1\text{ MB} = 1,048,576\text{ bytes}$).
- **RSS (Resident Set Size):** Total memory allocated to the Node.js process in RAM.
- **Heap Used:** Memory actively occupied by JavaScript application objects.
- **Heap Total:** Total allocated V8 heap size.

### 2.3 Availability SLI & Error Rate Denominators
- **Denominator:** Strictly the total number of HTTP requests recorded within the active evaluation window ($N_{\text{total}} = N_{\text{successful}} + N_{5xx} + N_{4xx}$).
- **Availability SLI Formula:**
  $$\text{SLI}_{\text{avail}} = \frac{N_{\text{total}} - N_{5xx}}{N_{\text{total}}} \times 100\%$$
- **Distinction Between 5xx and 4xx:**
  - **Server Errors (5xx):** Represent internal platform faults (500, 502, 503). These directly erode the Availability SLI and drive the `errorRatePercent`.
  - **Client Errors (4xx):** Represent client-side rejections (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests). These are tracked as `clientErrors` and `clientErrorRatePercent` for threat and client health visibility, but do NOT erode the platform Availability SLI.

### 2.4 Latency Percentiles: Mathematical Nearest-Rank
- Latency samples are collected in-stream with nanosecond timers (`performance.now()`).
- Percentiles ($p50, p95, p99$) are computed using the mathematically standard **Nearest-Rank Method** on the sorted array of durations:
  $$k = \min\left(N - 1, \max\left(0, \left\lceil \frac{p}{100} \times N \right\rceil - 1\right)\right)$$
- This ensures exact rank-order percentiles without linear interpolation artifacts, especially critical for high-percentile SLA guarantees ($p95, p99$).

---

## 3. Sliding Window & Buffer Retention Policies

### 3.1 10,000-Sample Circular Buffer Retention Limits
- The in-memory telemetry buffer is capped at a maximum of **10,000 samples** (`BUFFER_CAPACITY = 10000`).
- When request volume exceeds 10,000 samples, the buffer operates as a FIFO circular queue: the oldest sample is evicted, and `this.evictionCount` is incremented.
- Under nominal staging traffic (e.g., 2–5 requests/sec), 10,000 samples covers over 30 to 60 minutes of uninterrupted high-resolution telemetry.

### 3.2 24-Hour Window Truncation Detection
- A requested time window (e.g., `24h` = 86,400 seconds) must **never falsely claim complete coverage** when older samples have been evicted or when the server process has been running for less than 24 hours.
- Metrics responses include authoritative window metadata:
  ```json
  "windowMetadata": {
    "windowRequested": "24h",
    "isWindowTruncated": true,
    "windowCoveragePercent": 1.2,
    "effectiveWindowDurationSeconds": 1037,
    "evictedSamplesCount": 0,
    "bufferCapacity": 10000
  }
  ```
- **UI Indication:** The Operations Dashboard visibly renders a `TRUNCATED (1.2% COVERAGE)` warning tag whenever `isWindowTruncated` evaluates to `true`.

### 3.3 Process Restarts & Telemetry Gaps
- **Process Restarts:** Node.js process reboots reset the in-memory circular buffer. Uptime is calculated accurately from `startTime` (`Date.now() - startTime`). Window calculations immediately adapt to the available history without reporting stale pre-restart samples.
- **Telemetry Gaps / Outages:** If the telemetry collector is toggled offline or disabled, `telemetryAvailable` returns `false`, indicator objects evaluate to `null`, and the UI renders `--` placeholders without fabricated or cached metrics (AC-41.3).

### 3.4 Empty Window States
- In periods of zero traffic within the requested time window:
  - `isEmptyWindow` evaluates to `true`.
  - `totalRequests`: `0`.
  - `sliPercent`: `100.00%` (nominal zero-traffic state).
  - `errorRatePercent`: `0.00%`.
  - `latency`: `null` (averages and percentiles are undefined when $N=0$).
  - Prevents division-by-zero crashes and spurious 0% availability false alarms.
