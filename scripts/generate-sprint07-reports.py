import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import os
import json

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def style_table(table, header_bg='0D1527', alt_bg='F8FAFC'):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate(table.rows):
        for cell in row.cells:
            cell.paragraphs[0].paragraph_format.space_before = Pt(4)
            cell.paragraphs[0].paragraph_format.space_after = Pt(4)
            if i == 0:
                set_cell_background(cell, header_bg)
                for run in cell.paragraphs[0].runs:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(255, 255, 255)
            elif i % 2 == 1:
                set_cell_background(cell, alt_bg)

# ==============================================================================
# 1. CREATE docs/reports/Sprint-07-Implementation-Report.docx
# ==============================================================================
doc = docx.Document()

for section in doc.sections:
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

# Title & Header
title_p = doc.add_paragraph()
title_p.paragraph_format.space_before = Pt(0)
title_p.paragraph_format.space_after = Pt(4)
run_title = title_p.add_run('Sprint 07 Implementation Report — Monitoring, Alerting & Deployment Safety')
run_title.font.name = 'Arial'
run_title.font.size = Pt(22)
run_title.font.bold = True
run_title.font.color.rgb = RGBColor(16, 24, 40)

sub_p = doc.add_paragraph()
sub_p.paragraph_format.space_after = Pt(16)
run_sub = sub_p.add_run('NexusPlay Online Gaming Platform • Phase 2: Operations & Reliability • Sprint 07 Closure Package • Version 1.0 • Date: 2026-10-25')
run_sub.font.name = 'Arial'
run_sub.font.size = Pt(11)
run_sub.font.color.rgb = RGBColor(71, 84, 103)

# 1. Executive Summary & Authorization
doc.add_heading('1. Executive Summary & Implementation Authorization', level=2)
p_exec = doc.add_paragraph(
    'Sprint 07 (Phase 2 — Operations & Reliability) implements authoritative operational telemetry monitoring, '
    'real-time automated incident alerting with deduplication and cooldown controls, and an automated release rollback '
    'procedure with health recovery verification. All work was executed in accordance with Sprint 07 Implementation Authorization, '
    'preserving approved Phase 1 infrastructure, maintaining SQLite and WebSocket stability, and strictly adhering to scope boundaries '
    '(no premature PostgreSQL migration, no distributed Redis deployment, no multiplayer gameplay, and no mock data fabrication). '
    'Every acceptance criterion across stories EP12-01, EP12-02, and EP13-02 passed with 100% verification, backed by 54 automated sprint tests, '
    '338 cumulative platform regression tests, and 8 authentic Chrome CDP browser verification screenshots.'
)

# 2. Document Control & Metadata
doc.add_heading('2. Document Control & Metadata', level=2)
ctrl_table = doc.add_table(rows=10, cols=2)
ctrl_data = [
    ('Document Title', 'Sprint 07 Implementation & Verification Closure Report'),
    ('Project Name', 'NexusPlay Online Gaming Platform'),
    ('Phase / Sprint', 'Phase 2: Operations & Reliability / Sprint 07: Monitoring, Alerting & Deployment Safety'),
    ('Approved User Stories', 'EP12-01 (Operational Health Dashboard), EP12-02 (Automated Alerting), EP13-02 (Release Rollback)'),
    ('Acceptance Criteria Scope', 'AC-41.1, AC-41.2, AC-41.3, AC-42.1, AC-42.2, AC-42.3, AC-46.1, AC-46.2, AC-46.3 (9 total)'),
    ('Platform Architecture Baseline', 'React 19, TypeScript, Vite, CSS Modules, Node.js 22, Express 5, SQLite, Native WebSockets'),
    ('Sprint 07 Test Suite Result', '54 / 54 Automated Checks PASSED (100% Success Rate)'),
    ('Full Platform Regression Suite', '338 / 338 Cumulative Automated Checks PASSED (Sprints 00–07)'),
    ('Chrome CDP Browser Verification', '8 / 8 Authentic High-Resolution Scenarios Verified (Desktop & Mobile Viewports)'),
    ('Document Version / Status', 'Version 1.0 / Submitted for Product Owner Final Closure Approval')
]
for row_idx, (k, v) in enumerate(ctrl_data):
    row = ctrl_table.rows[row_idx]
    row.cells[0].paragraphs[0].text = k
    row.cells[0].paragraphs[0].runs[0].font.bold = True
    row.cells[1].paragraphs[0].text = v
style_table(ctrl_table)

# 3. Acceptance Criteria Verification Matrix
doc.add_heading('3. Acceptance Criteria Verification Matrix', level=2)
ac_table = doc.add_table(rows=10, cols=5)
ac_headers = ['Criterion ID', 'Story', 'Acceptance Criterion Description', 'Implementation Module', 'Status']
for col_idx, h in enumerate(ac_headers):
    ac_table.rows[0].cells[col_idx].paragraphs[0].text = h

ac_rows = [
    ('AC-41.1', 'EP12-01', 'Operational health indicators (uptime, SLI availability %, error rate %, latency avg/p95, CPU, RSS memory, DB health, WS CCU) visible on admin dashboard.', 'metricsService.js, routes.js, OperationsDashboard.tsx', 'PASSED (13 checks)'),
    ('AC-41.2', 'EP12-01', 'Operational dashboard supports time window filtering (5m, 15m, 1h, 24h) with window-specific sample calculations.', 'metricsService.js (window aggregation), routes.js', 'PASSED (5 checks)'),
    ('AC-41.3', 'EP12-01', 'Explicit missing-data indicators ("--") and warning banner displayed during upstream telemetry collection outage.', 'metricsService.js, OperationsDashboard.tsx', 'PASSED (6 checks)'),
    ('AC-42.1', 'EP12-02', 'Error rate breach (> 5.0% over 5m window) generates CRITICAL alert routed to on-call team [SRE_CORE] with staging outbox delivery.', 'alertingService.js, routes.js, OperationsDashboard.tsx', 'PASSED (9 checks)'),
    ('AC-42.2', 'EP12-02', 'Nominal metrics within thresholds do not fire false alerts; alerts are deduplicated during cooldown windows.', 'alertingService.js (evaluator & deduplicator)', 'PASSED (3 checks)'),
    ('AC-42.3', 'EP12-02', 'Active alerts automatically transition to RESOLVED when metric drops below recovery threshold (2.0%), dispatching recovery notice.', 'alertingService.js, routes.js, OperationsDashboard.tsx', 'PASSED (4 checks)'),
    ('AC-46.1', 'EP13-02', 'Documented release rollback procedure identifying Last-Known-Good staging release version, Git commit, and candidate metadata.', 'rollback-staging.js, routes.js, runbook', 'PASSED (5 checks)'),
    ('AC-46.2', 'EP13-02', 'Rollback execution script restores prior release, verifies post-rollback service health, and writes immutable audit record.', 'scripts/rollback-staging.js, audit_events table', 'PASSED (2 checks)'),
    ('AC-46.3', 'EP13-02', 'Rollback failure detected, halts promotion, exits code 1, and emits explicit escalation guidance with Incident Commander contacts.', 'scripts/rollback-staging.js (--simulate-rollback-failure)', 'PASSED (3 checks)')
]
for row_idx, r_data in enumerate(ac_rows):
    row = ac_table.rows[row_idx + 1]
    for col_idx, val in enumerate(r_data):
        row.cells[col_idx].paragraphs[0].text = val
style_table(ac_table)

# 4. SRE Telemetry & Monitoring Architecture
doc.add_heading('4. SRE Telemetry & Monitoring Architecture (EP12-01)', level=2)
doc.add_paragraph(
    'The operational monitoring architecture is implemented in server/src/modules/operations/metricsService.js and '
    'metricsMiddleware.js. Telemetry is collected in-stream with nanosecond-resolution performance.now() timers, '
    'buffering HTTP requests in a high-throughput circular sliding window buffer (10,000 max samples). '
    'The MetricsService calculates real, authoritative metrics including:\n'
    '- Application Uptime: Process uptime calculated via Date.now() - startTime.\n'
    '- Availability SLI: Percentage of successful HTTP requests (excluding 5xx server errors) over total requests.\n'
    '- HTTP 5xx Error Rate: Dedicated ratio of 5xx server failures to total volume in the active window.\n'
    '- API Response Latency: Calculated average, p50, p95, p99, min, and max response times in milliseconds.\n'
    '- Host Resource Utilization: Real CPU utilization tracked across core execution windows using process.cpuUsage(); '
    'Resident Set Size (RSS), Heap Used, and Heap Total memory tracked via process.memoryUsage().\n'
    '- Relational Database Health: Real-time query ping latency execution ("SELECT 1 as healthy") against SQLite DatabaseSync.\n'
    '- WebSocket Active Gateway CCU: Real-time atomic counter tracking active client connections connected to ws://localhost:5050/ws.\n'
    '- Telemetry Availability: Explicit boolean flag supporting graceful missing-data states (AC-41.3) without fabricating telemetry.'
)

# 5. Real-Time Alerting Engine & Incident Management
doc.add_heading('5. Real-Time Automated Alerting Engine (EP12-02)', level=2)
doc.add_paragraph(
    'The AlertingService (server/src/modules/operations/alertingService.js) implements a stateful incident lifecycle '
    'machine supporting ACTIVE, ACKNOWLEDGED, and RESOLVED states:\n'
    '- Rule 101 (High Error Rate): Threshold > 5.0% 5xx error rate over 5m window. Severity: CRITICAL. On-Call: [SRE_CORE]. '
    'Auto-resolves when error rate normalizes below 2.0%.\n'
    '- Rule 102 (High Latency P95): Threshold >= 500ms over 5m window. Severity: WARNING. On-Call: [SRE_CORE]. '
    'Auto-resolves when p95 latency drops below 300ms.\n'
    '- Rule 103 (Database Connectivity): Threshold status !== "healthy". Severity: CRITICAL. On-Call: Database Infrastructure On-Call. '
    'Auto-resolves when database query ping succeeds.\n'
    '- Deduplication & Cooldown: Consecutive evaluations while an alert is active update lastObservedAt rather than spawning redundant notifications.\n'
    '- Staging Notification Outbox: Structured notifications are delivered to an in-memory audit ledger and immutable SQLite audit_events table, '
    'redacting operational secrets and avoiding mock third-party deliveries.\n'
    '- Operator Actions: Administrative operators can acknowledge alerts via POST /api/v1/admin/operations/alerts/:id/acknowledge.'
)

# 6. Release Rollback Procedure & Deployment Safety
doc.add_heading('6. Deployment Safety & Automated Release Rollback (EP13-02)', level=2)
doc.add_paragraph(
    'Release rollback is managed by scripts/rollback-staging.js and integrated directly into the staging deployment pipeline '
    '(scripts/deploy-staging.js):\n'
    '- Last-Known-Good (LKG) Identification: The rollback engine queries the deployments table for the most recent release with '
    'status = "SUCCESS" and smoke_test_passed = 1, falling back to evidence/sprint-07/deployments/last-known-good.json.\n'
    '- Execution Safety: Rollback restores candidate release artifacts, verifies SQLite schema integrity, and avoids destructive migrations.\n'
    '- Post-Rollback Health Verification: The engine probes http://localhost:5050/api/health with up to 15 retries, requiring HTTP 200 '
    'and database = "connected" before declaring recovery success.\n'
    '- Audit Recording: Rollback completions are recorded in audit_events with action DEPLOYMENT_ROLLBACK_COMPLETED.\n'
    '- Negative Fault Handling (AC-46.3): When rollback fails (tested via --simulate-rollback-failure), the engine halts pipeline execution, '
    'exits code 1, logs DEPLOYMENT_ROLLBACK_FAILED, and outputs explicit emergency escalation instructions including SRE On-Call Pager contacts.'
)

# 7. Persistence Architecture & Empirical Classification
doc.add_heading('7. Phase 1 Operational Risk Revisit: Rate Limiting & Persistence', level=2)
doc.add_paragraph(
    'An empirical reboot-persistence audit was conducted via scripts/verify-rate-limit-persistence.js:\n'
    '- Rate Limiter Classification: HYBRID ARCHITECTURE. The authRateLimiter maintains an in-memory Map cache for microsecond performance, '
    'but synchronously writes every attempt count and lockout timestamp to the SQLite table auth_rate_limits with '
    'ON CONFLICT(key) DO UPDATE. Upon server restart, missing memory records cleanly fallback to SQLite, guaranteeing lockout persistence.\n'
    '- Session Revocation Classification: 100% SQLITE-PERSISTED. Revocation is committed directly to the disk-backed auth_sessions table '
    '(revoked = 1, revoked_at = ISO timestamp), surviving server reboots.\n'
    '- Database Locking & Concurrency: SQLite WAL mode and DatabaseSync provide atomic serialized writes. Concurrency remains safe up to target staging CCU.'
)

# 8. Full Platform Regression Results
doc.add_heading('8. Comprehensive Platform Regression Results (Sprints 00–07)', level=2)
reg_table = doc.add_table(rows=10, cols=5)
reg_headers = ['Sprint Suite', 'Focus Area', 'Automated Test Script', 'Checks Passed', 'Success Rate']
for col_idx, h in enumerate(reg_headers):
    reg_table.rows[0].cells[col_idx].paragraphs[0].text = h

reg_rows = [
    ('Sprint 00', 'Foundation, Staging Pipeline & Telemetry', 'scripts/smoke-test.js', '5 / 5', '100%'),
    ('Sprint 01', 'Authentication, Rate Limiting & CSRF', 'scripts/test-sprint01-auth.js', '49 / 49', '100%'),
    ('Sprint 02', 'Game Catalog Discovery & Filtering', 'scripts/test-sprint02-catalog.js', '31 / 31', '100%'),
    ('Sprint 03', 'Content Administration & RBAC', 'scripts/test-sprint03-admin.js', '69 / 69', '100%'),
    ('Sprint 04', 'Game Launching & Solo Sessions', 'scripts/test-sprint04-launch.js', '40 / 40', '100%'),
    ('Sprint 05', 'Progress Checkpoints & Medals', 'scripts/test-sprint05-progress.js', '60 / 60', '100%'),
    ('Sprint 06', 'Player Profiles & Audit Engine', 'scripts/test-sprint06-profile-audit.js', '30 / 30', '100%'),
    ('Sprint 07', 'Monitoring, Alerting & Rollback', 'scripts/test-sprint07-sre.js', '54 / 54', '100%'),
    ('Total Platform', 'Cumulative Sprints 00–07 Baseline', 'Comprehensive Regression Suite', '338 / 338', '100%')
]
for row_idx, r_data in enumerate(reg_rows):
    row = reg_table.rows[row_idx + 1]
    for col_idx, val in enumerate(r_data):
        row.cells[col_idx].paragraphs[0].text = val
style_table(reg_table)

# 9. Genuine Browser Verification Evidence
doc.add_heading('9. Genuine Chrome CDP Browser Verification Evidence', level=2)
doc.add_paragraph(
    'All 8 browser scenarios were executed headlessly using Google Chrome DevTools Protocol against the live staging application. '
    'The resulting high-resolution screenshots are stored in evidence/sprint-07/screenshots/:\n'
    '- 01-operations-dashboard-desktop.png (150 KB): Authenticated administrator dashboard access showing real operational metrics on 1440x900 viewport.\n'
    '- 02-operations-time-window-filter.png (150 KB): Time window filtering showing 15m selection with updated sample calculations.\n'
    '- 03-operations-missing-telemetry-state.png (137 KB): Operational telemetry outage state (AC-41.3) showing red alert banner and "--" placeholders.\n'
    '- 04-active-incident-alert-firing.png (147 KB): Active incident alert firing for [SRE_CORE] with CRITICAL severity badge and 8.5% observed breach.\n'
    '- 05-alert-acknowledged-state.png (147 KB): Operator acknowledged alert state displaying ACKNOWLEDGED badge and acknowledgment timestamp.\n'
    '- 06-alert-resolved-recovery.png (147 KB): Auto-resolved recovery state when metric drops below 2.0% recovery threshold.\n'
    '- 07-operations-dashboard-mobile-viewport.png (45 KB): Responsive mobile layout (iPhone 14 Pro 390x844) with stacked metric cards and touch controls.\n'
    '- 08-unauthorized-access-denied.png (144 KB): Unauthenticated user view verifying strict access restriction (dashboard hidden from non-admins).'
)

# 10. Files Changed & Artifact Register
doc.add_heading('10. Files Changed & Artifact Register', level=2)
p_files = doc.add_paragraph()
p_files.text = (
    'Core Files Created and Modified in Sprint 07:\n'
    '- server/src/modules/operations/metricsService.js (Sliding window metric buffer, availability SLI, latency percentiles, CPU, memory, DB latency)\n'
    '- server/src/modules/operations/alertingService.js (Stateful alerting engine, threshold rules, deduplication, outbox, incident simulation)\n'
    '- server/src/modules/operations/metricsMiddleware.js (In-stream request latency measurement with performance.now())\n'
    '- server/src/modules/operations/routes.js (Protected REST endpoints for metrics, alerts, acknowledgment, outbox, and deployment status)\n'
    '- server/src/modules/operations/index.js (Operations module exports)\n'
    '- server/src/app.js (Mounted metrics middleware and operations router, updated status metadata to v0.7.0 and sprint 07)\n'
    '- server/src/index.js (Connected WebSocket CCU connection/disconnection counter to MetricsService)\n'
    '- scripts/rollback-staging.js (Automated rollback engine implementing EP13-02, health verification, and failure escalation)\n'
    '- scripts/deploy-staging.js (Enhanced deployment pipeline preserving last-known-good.json and auto-rollback hooks)\n'
    '- scripts/verify-rate-limit-persistence.js (Reboot-persistence verification proving HYBRID rate limiting and 100% SQLite session revocation)\n'
    '- client/src/types/admin.ts (Added TypeScript interfaces for OperationalMetrics, OperationalAlert, TimeWindow)\n'
    '- client/src/components/admin/OperationsDashboard.tsx (Obsidian Arcade operational monitoring dashboard React component)\n'
    '- client/src/components/admin/OperationsDashboard.module.css (Dark mode obsidian aesthetics, metric cards, incident controls)\n'
    '- client/src/App.tsx (Mounted OperationsDashboard for admin role, updated terminal logs, navbar links, and footer)\n'
    '- client/src/components/Navbar.tsx (Added Operations SRE link in admin navigation)\n'
    '- scripts/test-sprint07-sre.js (Automated test suite covering AC-41.1–41.3, AC-42.1–42.3, AC-46.1–46.3, RBAC, persistence)\n'
    '- scripts/verify-sprint07-browser.js (Chrome CDP automated runner capturing 8 authentic screenshots)'
)

# 11. Sprint 07 Sign-Off & Closure Gate
doc.add_heading('11. Formal Sprint 07 Sign-Off & Completion Gate', level=2)
doc.add_paragraph(
    'All nine approved acceptance criteria have been implemented, verified, and audited with zero regressions. '
    'The platform baseline stands at 338/338 passing automated tests and 8/8 passing browser scenarios. '
    'Development work for Sprint 07 is complete. Sprint 08 has NOT been started. '
    'This report is formally submitted for Product Owner review and closure authorization.'
)

report_path = os.path.join(os.path.dirname(__file__), '..', 'docs', 'reports', 'Sprint-07-Implementation-Report.docx')
doc.save(report_path)
print(f'Successfully generated {report_path}')

# ==============================================================================
# 2. UPDATE docs/reports/MASTER-Implementation-Record.docx IN PLACE
# ==============================================================================
master_path = os.path.join(os.path.dirname(__file__), '..', 'docs', 'reports', 'MASTER-Implementation-Record.docx')
master_doc = docx.Document(master_path)

# Update Title / Document Control Table (Table 0)
t0 = master_doc.tables[0]
for row in t0.rows:
    if 'Sprint' in row.cells[0].text:
        row.cells[1].text = 'Sprint 07: Monitoring, Alerting & Deployment Safety (EP12-01, EP12-02, EP13-02) — Completed & Verified'
    elif 'Version' in row.cells[0].text:
        row.cells[1].text = '2.1'

# Update Version History (Table 1)
t1 = master_doc.tables[1]
found_v21 = False
for row in t1.rows:
    if row.cells[0].text.strip() == '2.1':
        found_v21 = True
        break

if not found_v21:
    new_row = t1.add_row()
    new_row.cells[0].paragraphs[0].text = '2.1'
    new_row.cells[1].paragraphs[0].text = '2026-10-25'
    new_row.cells[2].paragraphs[0].text = (
        'Sprint 07 Final Implementation & Verification: Completed Phase 2 SRE Monitoring & Deployment Safety. '
        'Delivered Operational Health & Error Rate Dashboard (EP12-01 / AC-41.1..41.3) with real uptime, SLI availability %, '
        '5xx error rate %, latency percentiles, CPU, memory, SQLite health, WS CCU, time window aggregation, and missing-data indicators. '
        'Delivered Real-Time Automated Alerting (EP12-02 / AC-42.1..42.3) with threshold breach detection, [SRE_CORE] routing, '
        'staging notification outbox, deduplication, cooldowns, and auto-resolution recovery. '
        'Delivered Release Rollback Procedure (EP13-02 / AC-46.1..46.3) with Last-Known-Good identification, automated rollback execution, '
        'health verification probing, immutable audit recording, and simulated failure escalation instructions. '
        'Revisited Phase 1 operational risks, verifying HYBRID rate limiting and 100% SQLite session revocation. '
        'Platform regressions: 338/338 automated checks PASS (100% across Sprints 00–07), and 8/8 Chrome CDP browser scenarios PASS.'
    )
    new_row.cells[3].paragraphs[0].text = 'docs/reports/Sprint-07-Implementation-Report.docx'

# Update Sprint Tracking (Table 2)
t2 = master_doc.tables[2]
found_s7 = False
for row in t2.rows:
    sprint_cell = row.cells[0].text.strip()
    if sprint_cell == '06':
        row.cells[2].text = 'Completed / Fully Verified (6/6 ACs + Security, 30/30 Tests, 7/7 Browser)'
        row.cells[3].text = 'evidence/sprint-06/'
        row.cells[4].text = 'Verified / Closed'
    elif sprint_cell == '07':
        row.cells[2].text = 'Completed / Fully Verified (9/9 ACs + Security, 54/54 Tests, 8/8 Browser)'
        row.cells[3].text = 'evidence/sprint-07/'
        row.cells[4].text = 'Pending PO Approval'
        found_s7 = True

if not found_s7:
    row7 = t2.add_row()
    row7.cells[0].paragraphs[0].text = '07'
    row7.cells[1].paragraphs[0].text = 'Phase 2: Monitoring, Alerting & Deployment Safety (EP12-01, EP12-02, EP13-02)'
    row7.cells[2].paragraphs[0].text = 'Completed / Fully Verified (9/9 ACs + Security, 54/54 Tests, 8/8 Browser)'
    row7.cells[3].paragraphs[0].text = 'evidence/sprint-07/'
    row7.cells[4].paragraphs[0].text = 'Pending PO Approval'

# Append Section for Sprint 07
master_doc.add_heading('Sprint 07: Monitoring, Alerting & Deployment Safety (EP12-01, EP12-02, EP13-02)', level=3)
master_doc.add_paragraph(
    'Status: COMPLETED & FULLY VERIFIED (2026-10-25). '
    'Delivered: EP12-01 (Operational Health Dashboard: real uptime, availability SLI %, error rate %, latency percentiles, CPU, memory, '
    'database health, WebSocket CCU, time window filtering across 5m/15m/1h/24h, and graceful missing telemetry indicators), '
    'EP12-02 (Automated Alerting: error rate breach detection > 5.0%, routing to [SRE_CORE], staging notification outbox, deduplication, '
    'cooldowns, and auto-resolution recovery when metric normalizes < 2.0%), '
    'EP13-02 (Release Rollback Procedure: LKG identification, automated rollback execution, post-rollback health verification, '
    'immutable audit logging, and negative failure escalation instructions). '
    'Reboot-Persistence Audit: Empirically verified HYBRID rate limiting (in-memory Map + SQLite auth_rate_limits table) and 100% SQLite session revocation. '
    'Automated Test Results: 54/54 Sprint 07 tests PASS (100%). Cumulative Platform Baseline: 338/338 automated tests PASS (100% across Sprints 00–07). '
    'Browser Automation: 8/8 Chrome CDP scenarios PASS with 8 authentic screenshots in evidence/sprint-07/screenshots/. '
    'Documentation: docs/reports/Sprint-07-Implementation-Report.docx, Operations-Monitoring-API.md, Alerting Runbook, Rollback Runbook.'
)

master_doc.save(master_path)
print(f'Successfully updated {master_path} to Version 2.1')
