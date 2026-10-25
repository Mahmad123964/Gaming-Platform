# NexusPlay — SRE Metrics & Thresholds Specification

**Document Version:** 1.0  
**Phase:** Phase 2 — Operations & Reliability  
**Sprint:** Sprint 07  
**Approved Baseline:** SRE Architecture Specification v2.0  

---

## 1. Service Level Indicators (SLIs) & Objectives (SLOs)

| Metric | Measurement Method | Target SLO | Warning Threshold | Alerting Breach Threshold | Recovery Auto-Resolve |
|:---|:---|:---:|:---:|:---:|:---:|
| **Availability SLI** | `(Total - 5xx) / Total * 100` | `>= 99.5%` | `< 99.5%` | `< 95.0%` | `>= 98.0%` |
| **5xx Server Error Rate** | `(5xx Requests) / Total * 100` | `<= 1.0%` | `> 1.0%` | `>= 5.0%` (AC-42.1) | `< 2.0%` (AC-42.3) |
| **API Response Latency (p95)** | 95th Percentile Duration | `< 500ms` | `>= 350ms` | `>= 500ms` | `< 300ms` |
| **API Response Latency (Avg)** | Mean Request Duration | `< 100ms` | `>= 150ms` | `>= 250ms` | `< 80ms` |
| **Process CPU Utilization** | `process.cpuUsage()` / cores | `< 70%` | `>= 75%` | `>= 85%` | `< 60%` |
| **Process Memory (RSS)** | `process.memoryUsage().rss` | `< 256 MB` | `>= 300 MB` | `>= 450 MB` | `< 200 MB` |
| **Database Query Ping** | `SELECT 1 as healthy` Latency | `< 10ms` | `>= 25ms` | `>= 100ms` or error | `< 5ms` |
| **WebSocket Connection Gateway**| Ping / Pong Heartbeat Latency | `< 50ms` | `>= 100ms` | Disconnected / Timeout | Reconnected |

---

## 2. Sliding Window Calculation Policies

1. **Window Granularities:**
   - `5m` (300 seconds): Primary operational window for high-frequency alerting and active incident triage.
   - `15m` (900 seconds): Medium-term window for stability verification and recovery trends.
   - `1h` (3,600 seconds): Hourly operational health and trend monitoring.
   - `24h` (86,400 seconds): Daily availability summary and SLA reporting.

2. **Sample Minimum Requirement:**
   - To prevent division-by-zero or 100% error spikes on an isolated single request, percentage calculations require at least 10 request samples before evaluating breach criteria.
   - In periods of zero traffic, availability defaults to `100.00%` and error rate defaults to `0.00%`.

3. **Missing Data Policy (AC-41.3):**
   - If the in-stream metrics middleware or upstream collector is disabled or interrupted, `telemetryAvailable` must evaluate to `false`.
   - Indicators MUST be returned as `null` or displayed as `--`.
   - No mock or simulated values may be substituted for missing real metrics.
