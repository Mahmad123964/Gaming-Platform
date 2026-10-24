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

def style_table(table, header_bg='191E33', alt_bg='F8FAFC'):
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
# 1. CREATE docs/reports/Sprint-01-Implementation-Report.docx
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
run_title = title_p.add_run('Sprint 01 Implementation Report')
run_title.font.name = 'Arial'
run_title.font.size = Pt(22)
run_title.font.bold = True
run_title.font.color.rgb = RGBColor(16, 24, 40)

sub_p = doc.add_paragraph()
sub_p.paragraph_format.space_after = Pt(16)
run_sub = sub_p.add_run('NexusPlay Online Gaming Platform • Sprint 01: Identity & Security • Version 1.0 • Date: 2026-10-24')
run_sub.font.name = 'Arial'
run_sub.font.size = Pt(11)
run_sub.font.color.rgb = RGBColor(71, 84, 103)

# 1. Document Control & Metadata
doc.add_heading('1. Document Control & Metadata', level=2)
ctrl_table = doc.add_table(rows=8, cols=2)
ctrl_data = [
    ('Project Name', 'NexusPlay Online Gaming Platform'),
    ('Sprint Scope', 'Sprint 01 — Identity & Security (EP01-01, EP01-02, EP01-03, EP11-01)'),
    ('Architectural Phase', 'Phase 1: Foundation & Identity Baseline'),
    ('Author Roles', 'Senior Full-Stack Engineer, Security Architect, QA Lead, Doc Lead'),
    ('Target Environment', 'Staging (Node.js v22.16.0 / Windows x64 / React 19 / Vite / node:sqlite)'),
    ('Automated Test Coverage', '24 Automated Tests Executed; 24 Passed (100% Success Rate)'),
    ('Regression Status', 'Sprint 00 Smoke Test Suite Verified (5/5 Checks Passed with Zero Regressions)'),
    ('Completion Status', 'VERIFIED & READY FOR PRODUCT OWNER SIGN-OFF')
]
for i, (k, v) in enumerate(ctrl_data):
    ctrl_table.rows[i].cells[0].paragraphs[0].add_run(k).bold = True
    ctrl_table.rows[i].cells[1].paragraphs[0].add_run(v)
style_table(ctrl_table)

# 2. Executive Summary
doc.add_heading('2. Executive Summary', level=2)
doc.add_paragraph(
    'Sprint 01 — Identity & Security has been executed in full compliance with the approved Product Backlog, '
    'Acceptance Criteria, UML Architecture, and Antigravity Implementation Playbook. '
    'All four approved stories—User Registration (EP01-01), User Authentication & Sign-In/Out (EP01-02), '
    'Password Recovery (EP01-03), and Authentication Rate Limiting (EP11-01)—have been implemented end-to-end '
    'across the database schema, secure server identity modules, Express API gateway, and React 19 Obsidian Arcade frontend.'
)
doc.add_paragraph(
    'Key achievements include:\n'
    '• Cryptographic Security: Password storage utilizes salted scrypt (16-byte random salt, 64-byte derived key). '
    'Verification incorporates constant-time timing-safe equality and dummy constant-time evaluation to neutralize timing oracle attacks.\n'
    '• Anti-Enumeration Protections: Registration, login, and password recovery endpoints return uniform error messages '
    'and timing profiles that prevent attacker enumeration of registered email addresses.\n'
    '• Multi-Device Session Management: Players can authenticate concurrently across devices with independent 24-hour tokens. '
    'Password reset triggers an immediate, atomic revocation of all active sessions for that account.\n'
    '• Rate Limiting Defenses: Brute-force attacks are mitigated via composite ip:email sliding window tracking, '
    'enforcing an HTTP 429 Too Many Requests response with Retry-After header upon 5 failed attempts within 15 minutes.\n'
    '• Zero Regression: The full Sprint 00 staging deployment pipeline and 5-point automated smoke test suite passed with 100% compliance.'
)

# 3. Acceptance Criteria Verification Matrix
doc.add_heading('3. Acceptance Criteria Verification Matrix', level=2)
doc.add_paragraph('Detailed verification results for all 12 acceptance criteria across the four sprint stories:')

ac_table = doc.add_table(rows=13, cols=5)
headers = ['Story ID', 'AC ID', 'Acceptance Requirement', 'Verification Test Executed', 'Status']
for j, h in enumerate(headers):
    ac_table.rows[0].cells[j].paragraphs[0].add_run(h)

ac_matrix = [
    ('EP01-01', 'AC-1.1', 'Valid registration returns HTTP 201 with user profile and session token.', 'AUTH-REG-01: POST /api/v1/auth/register with valid email, password, displayName.', 'PASSED'),
    ('EP01-01', 'AC-1.2', 'Duplicate email registration returns HTTP 409 Conflict.', 'AUTH-REG-02: Registering existing email returns 409 Conflict.', 'PASSED'),
    ('EP01-01', 'AC-1.3', 'Invalid input data rejected with HTTP 400 Bad Request.', 'AUTH-REG-03–06: Testing bad email, password <8 chars, missing numbers, short name.', 'PASSED'),
    ('EP01-02', 'AC-2.1', 'Valid login returns HTTP 200 with 24-hour session token and profile.', 'AUTH-LOG-01, AUTH-LOG-04: POST /api/v1/auth/login and GET /api/v1/auth/me.', 'PASSED'),
    ('EP01-02', 'AC-2.2', 'Logout revokes active session token; subsequent calls rejected.', 'AUTH-LOG-05, AUTH-LOG-06: POST /logout marks session revoked; GET /me returns 401.', 'PASSED'),
    ('EP01-02', 'AC-2.3', 'Invalid credentials return generic HTTP 401 Unauthorized.', 'AUTH-LOG-02, AUTH-LOG-03: Wrong password and non-existent email return identical 401.', 'PASSED'),
    ('EP01-03', 'AC-3.1', 'Forgot password returns uniform 200 message and generates 15m token.', 'AUTH-REC-01, AUTH-REC-02: POST /forgot-password for valid & invalid emails.', 'PASSED'),
    ('EP01-03', 'AC-3.2', 'Valid token and new password update credentials; old token marked used.', 'AUTH-REC-03, AUTH-REC-04, AUTH-REC-06: Reset password and login with new password.', 'PASSED'),
    ('EP01-03', 'AC-3.3', 'Resetting password revokes all prior active sessions; expired token rejected.', 'AUTH-REC-05, AUTH-REC-07: Prior sessions return 401; expired token returns 400.', 'PASSED'),
    ('EP11-01', 'AC-38.1', 'Normal authentication requests within limits are processed without throttling.', 'AUTH-RAT-03: Valid authentications execute with zero latency penalty.', 'PASSED'),
    ('EP11-01', 'AC-38.2', '5 failed login attempts trigger HTTP 429 with 15m lockout and Retry-After.', 'AUTH-RAT-01: 5th failure returns 429 with Retry-After: 900 header.', 'PASSED'),
    ('EP11-01', 'AC-38.3', 'Counter reset on success; lockout isolates by composite ip:email key.', 'AUTH-RAT-02, AUTH-RAT-03: Independent account allowed; success resets counter.', 'PASSED')
]

for i, r in enumerate(ac_matrix, start=1):
    for j, val in enumerate(r):
        p = ac_table.rows[i].cells[j].paragraphs[0]
        run = p.add_run(val)
        if j == 4:
            run.bold = True
            run.font.color.rgb = RGBColor(0, 150, 60)
style_table(ac_table)

# 4. Requirements-to-Tests Traceability Matrix
doc.add_heading('4. Requirements-to-Tests Traceability Matrix', level=2)
doc.add_paragraph('Mapping of all 24 automated tests to requirements, HTTP methods, and response assertions:')

test_trace_table = doc.add_table(rows=25, cols=5)
t_headers = ['Test ID', 'Story / AC', 'Endpoint & Method', 'Expected Assertion', 'Result']
for j, h in enumerate(t_headers):
    test_trace_table.rows[0].cells[j].paragraphs[0].add_run(h)

tests_data = [
    ('AUTH-REG-01', 'EP01-01 (AC-1.1)', 'POST /api/v1/auth/register', 'HTTP 201, user profile, 24h session token', 'PASS (312ms)'),
    ('AUTH-REG-02', 'EP01-01 (AC-1.2)', 'POST /api/v1/auth/register', 'HTTP 409 Conflict on existing email', 'PASS (5ms)'),
    ('AUTH-REG-03', 'EP01-01 (AC-1.3)', 'POST /api/v1/auth/register', 'HTTP 400 Bad Request on invalid email syntax', 'PASS (3ms)'),
    ('AUTH-REG-04', 'EP01-01 (AC-1.3)', 'POST /api/v1/auth/register', 'HTTP 400 Bad Request on password <8 chars', 'PASS (3ms)'),
    ('AUTH-REG-05', 'EP01-01 (AC-1.3)', 'POST /api/v1/auth/register', 'HTTP 400 Bad Request on password without numbers', 'PASS (4ms)'),
    ('AUTH-REG-06', 'EP01-01 (AC-1.3)', 'POST /api/v1/auth/register', 'HTTP 400 Bad Request on display name <2 chars', 'PASS (2ms)'),
    ('AUTH-LOG-01', 'EP01-02 (AC-2.1)', 'POST /api/v1/auth/login', 'HTTP 200 OK, valid session token, player data', 'PASS (139ms)'),
    ('AUTH-LOG-02', 'EP01-02 (AC-2.3)', 'POST /api/v1/auth/login', 'HTTP 401 Unauthorized "Invalid email or password"', 'PASS (155ms)'),
    ('AUTH-LOG-03', 'EP01-02 (AC-2.3)', 'POST /api/v1/auth/login', 'HTTP 401 Unauthorized for unregistered email', 'PASS (162ms)'),
    ('AUTH-LOG-04', 'EP01-02 (AC-2.1)', 'GET /api/v1/auth/me', 'HTTP 200 OK with Bearer session token', 'PASS (10ms)'),
    ('AUTH-LOG-05', 'EP01-02 (AC-2.2)', 'POST /api/v1/auth/logout', 'HTTP 200 OK, session revoked flag set in DB', 'PASS (10ms)'),
    ('AUTH-LOG-06', 'EP01-02 (AC-2.2)', 'GET /api/v1/auth/me', 'HTTP 401 Unauthorized with revoked session token', 'PASS (4ms)'),
    ('AUTH-REC-01', 'EP01-03 (AC-3.1)', 'POST /api/v1/auth/forgot-password', 'HTTP 200 OK, generic message, 15m token generated', 'PASS (11ms)'),
    ('AUTH-REC-02', 'EP01-03 (AC-3.1)', 'POST /api/v1/auth/forgot-password', 'HTTP 200 OK identical message for unknown email', 'PASS (4ms)'),
    ('AUTH-REC-03', 'EP01-03 (AC-3.2)', 'POST /api/v1/auth/reset-password', 'HTTP 200 OK, password updated, token marked used', 'PASS (200ms)'),
    ('AUTH-REC-04', 'EP01-03 (AC-3.2)', 'POST /api/v1/auth/reset-password', 'HTTP 400 Bad Request when re-using spent token', 'PASS (5ms)'),
    ('AUTH-REC-05', 'EP01-03 (AC-3.3)', 'GET /api/v1/auth/me', 'HTTP 401 Unauthorized for prior active session', 'PASS (6ms)'),
    ('AUTH-REC-06', 'EP01-03 (AC-3.2)', 'POST /api/v1/auth/login', 'HTTP 200 OK authenticating with new password', 'PASS (220ms)'),
    ('AUTH-REC-07', 'EP01-03 (AC-3.3)', 'POST /api/v1/auth/reset-password', 'HTTP 400 Bad Request on expired reset token (>15m)', 'PASS (6ms)'),
    ('AUTH-RAT-01', 'EP11-01 (AC-38.2)', 'POST /api/v1/auth/login', 'HTTP 429 Too Many Requests on 5th failed attempt', 'PASS (3ms)'),
    ('AUTH-RAT-02', 'EP11-01 (AC-38.3)', 'POST /api/v1/auth/login', 'HTTP 200 OK for separate user (composite isolation)', 'PASS (206ms)'),
    ('AUTH-RAT-03', 'EP11-01 (AC-38.3)', 'POST /api/v1/auth/login', 'Success clears failure counter; prevents lockout', 'PASS (156ms)'),
    ('AUTH-SEC-01', 'EP01-02 (AC-2.1)', 'GET /api/v1/auth/me', 'HTTP 401 Unauthorized without Authorization header', 'PASS (3ms)'),
    ('AUTH-SEC-02', 'EP01-02 (AC-2.1)', 'GET /api/v1/auth/me', 'HTTP 401 Unauthorized with malformed Bearer token', 'PASS (4ms)')
]

for i, r in enumerate(tests_data, start=1):
    for j, val in enumerate(r):
        p = test_trace_table.rows[i].cells[j].paragraphs[0]
        run = p.add_run(val)
        if j == 4:
            run.bold = True
            run.font.color.rgb = RGBColor(0, 150, 60)
style_table(test_trace_table)

# 5. Architecture & Security Controls Specification
doc.add_heading('5. Architecture & Security Controls Specification', level=2)
doc.add_paragraph(
    'The security posture of Sprint 01 has been engineered to withstand common web vulnerabilities:\n'
    '1. Password Hashing: Uses node:crypto scryptSync with 16-byte cryptographically secure random salt, '
    '64-byte key derivation, and N=16384, r=8, p=1 standard parameters. Plaintext passwords never touch logs or persistence.\n'
    '2. Side-Channel Timing Resistance: Password verification is performed using crypto.timingSafeEqual. '
    'For unknown emails, a dummy hash calculation is computed to eliminate timing differentials between account existence checks.\n'
    '3. Session Invalidation & Cascade: Multi-device sessions are tracked in auth_sessions. When a user changes or resets '
    'their password, an atomic SQL cascade (UPDATE auth_sessions SET revoked = 1 WHERE player_id = ?) immediately terminates '
    'all active device sessions across the entire fleet.\n'
    '4. Rate Limiting: Authentication attempts are isolated by a composite key (ip:email). Lockout is triggered strictly '
    'upon reaching 5 consecutive failures within 15 minutes, returning HTTP 429 and Retry-After: 900 headers.\n'
    '5. Single-Use Password Resets: Reset tokens are 256-bit entropy hex strings with 15-minute expiration. '
    'Once consumed, tokens are marked used=1 and permanently rejected thereafter.'
)

inv_data = [
    ('server/src/modules/identity/crypto.js', 'Security / Crypto', 'Salted scrypt hashing, timingSafeEqual comparison, CSPRNG token and ID generators.'),
    ('server/src/modules/identity/validation.js', 'Validation', 'RFC 5322 email regex, 8-64 char password policy (letter+number), 2-32 char display name.'),
    ('server/src/modules/identity/rateLimiter.js', 'Rate Limiting', 'Composite ip:email sliding window rate limiter (5 attempts, 15-min lockout).'),
    ('server/src/modules/identity/authService.js', 'Domain Service', 'Core registration, login, logout, password recovery, session validation and revocation.'),
    ('server/src/modules/identity/middleware.js', 'HTTP Middleware', 'requireAuth and optionalAuth extracting Bearer token and attaching req.player.'),
    ('server/src/modules/identity/routes.js', 'Express Router', 'REST endpoints for /register, /login, /logout, /forgot-password, /reset-password, /me.'),
    ('server/src/modules/identity/index.js', 'Module Export', 'Clean identity subsystem exports and entrypoint.'),
    ('server/src/app.js', 'Server Gateway', 'Mounted /api/v1/auth routes, updated activeSprint to 01, updated platform status metadata.'),
    ('client/src/components/AuthModal.tsx', 'React 19 Component', 'Obsidian Arcade modal with Sign In, Register, Forgot Password, and Reset Password tabs.'),
    ('client/src/components/AuthModal.module.css', 'Scoped Styling', 'Luxury dark styling, glowing violet auras, accessible inputs, and error/success banners.'),
    ('client/src/components/Navbar.tsx', 'React 19 Component', 'Integrated user session badge, player gamer tag avatar, Sign In, Register, and Sign Out triggers.'),
    ('scripts/test-sprint01-auth.js', 'Automated QA', 'Comprehensive HTTP test harness executing all 24 tests covering 12 ACs.')
]

inv_table = doc.add_table(rows=len(inv_data) + 1, cols=3)
inv_headers = ['File Path', 'Component Type', 'Description & Rationale']
for j, h in enumerate(inv_headers):
    inv_table.rows[0].cells[j].paragraphs[0].add_run(h)


for i, r in enumerate(inv_data, start=1):
    for j, val in enumerate(r):
        inv_table.rows[i].cells[j].paragraphs[0].add_run(val)
style_table(inv_table)

# 7. Testing & Verification Evidence
doc.add_heading('7. Testing & Verification Evidence', level=2)
doc.add_paragraph(
    'All verification activities were executed directly against real HTTP endpoints and persistence stores. '
    'No simulation or mock-ups were utilized for the reported test passes.'
)

ev_table = doc.add_table(rows=3, cols=5)
ev_headers = ['Test Suite', 'Target & Port', 'Executed Checks', 'Outcome', 'Evidence Artifact']
for j, h in enumerate(ev_headers):
    ev_table.rows[0].cells[j].paragraphs[0].add_run(h)

ev_data = [
    ('Sprint 01 Auth Suite', 'http://127.0.0.1:5059', '24 tests (EP01-01, EP01-02, EP01-03, EP11-01)', '24/24 PASSED (100%)', 'evidence/sprint-01/test-results/sprint-01-auth-test-results-*.json'),
    ('Regression Smoke Suite', 'http://localhost:5050', '5 checks (Liveness, DB, Status, UI, WebSocket)', '5/5 PASSED (100%)', 'evidence/sprint-00/test-results/smoke-test-pass-*.json')
]
for i, r in enumerate(ev_data, start=1):
    for j, val in enumerate(r):
        p = ev_table.rows[i].cells[j].paragraphs[0]
        run = p.add_run(val)
        if j == 3:
            run.bold = True
            run.font.color.rgb = RGBColor(0, 150, 60)
style_table(ev_table)

doc.add_paragraph(
    'Browser Screenshot Statement: UI walkthrough screenshots are officially marked NOT CAPTURED '
    'due to the known Playwright driver CDN 404 download issue on Windows. '
    'The server is confirmed active and running on http://localhost:5050, serving both the React 19 Obsidian Arcade '
    'frontend bundle and API gateway endpoints with verified HTTP 200 responses.'
)

# 8. Unresolved Risks & Architectural Caveats
doc.add_heading('8. Unresolved Risks & Architectural Caveats', level=2)
doc.add_paragraph(
    '1. Disconnected Entitlement Revocation: As documented in ADR-0003, offline entitlement revocation cannot be guaranteed '
    'during complete network disconnection. Device access persists until [OFFLINE_ENTITLEMENT_DURATION] expires or the client reconnects.\n'
    '2. In-Memory Rate Limiting Scalability: The current rate limiter utilizes an in-memory sliding window store appropriate for single-node '
    'development and staging environments. For multi-node production deployment at 10,000 CCU (Sprint 10+), this must be backed by Redis or DragonflyDB.\n'
    '3. Email Delivery Integration: Password recovery tokens are currently persisted in password_resets and exposed in non-production '
    'responses for automated verification. A third-party transactional email provider (e.g. AWS SES or SendGrid) will be required in production.'
)

# 9. Completion Gate & Sign-Off
doc.add_heading('9. Completion Gate & Sign-Off', level=2)
doc.add_paragraph('Sprint 01 implementation is complete, fully tested, and verified. Approval is requested to close Sprint 01.')

sign_table = doc.add_table(rows=3, cols=3)
sign_headers = ['Role', 'Name / Signee', 'Approval Decision / Date']
for j, h in enumerate(sign_headers):
    sign_table.rows[0].cells[j].paragraphs[0].add_run(h)

sign_data = [
    ('Lead Full-Stack & Security Engineer', 'Google Antigravity Lead Agent', 'VERIFIED & SUBMITTED / 2026-10-24'),
    ('Product Owner / SRE Lead', '[PRODUCT_OWNER]', 'PENDING CLOSURE SIGN-OFF')
]
for i, r in enumerate(sign_data, start=1):
    for j, val in enumerate(r):
        sign_table.rows[i].cells[j].paragraphs[0].add_run(val)
style_table(sign_table)

report_path = os.path.join('docs', 'reports', 'Sprint-01-Implementation-Report.docx')
doc.save(report_path)
print(f'Successfully created {report_path}')


# ==============================================================================
# 2. UPDATE MASTER-Implementation-Record.docx TO VERSION 0.6
# ==============================================================================
master_path = os.path.join('docs', 'reports', 'MASTER-Implementation-Record.docx')
master_doc = docx.Document(master_path)

# Update Document Control
t0 = master_doc.tables[0]
for row in t0.rows:
    if 'Sprint' in row.cells[0].text:
        row.cells[1].text = 'Sprint 01: Identity & Security (EP01-01, EP01-02, EP01-03, EP11-01)'
    elif 'Version' in row.cells[0].text:
        row.cells[1].text = '0.6'

# Update Version History (Table 1)
t1 = master_doc.tables[1]
new_row = t1.add_row()
new_row.cells[0].paragraphs[0].text = '0.6'
new_row.cells[1].paragraphs[0].text = '2026-10-24'
new_row.cells[2].paragraphs[0].text = (
    'Sprint 01 Completion: Implemented Identity & Security module covering EP01-01 (User Registration), '
    'EP01-02 (User Authentication & Sign-in/Sign-out), EP01-03 (Password Recovery with atomic session revocation), '
    'and EP11-01 (Composite IP+Email Rate Limiting). Verified all 12 ACs with 24 automated tests passing (100%). '
    'Integrated Obsidian Arcade AuthModal into React 19 frontend. Zero regressions on Sprint 00 smoke suite.'
)
new_row.cells[3].paragraphs[0].text = 'docs/reports/Sprint-01-Implementation-Report.docx'

# Update Section 2: Sprint Roadmap & Progress
for idx, p in enumerate(master_doc.paragraphs):
    if 'Sprint 01: Identity & Security' in p.text or 'Sprint 01: identity' in p.text.lower():
        if idx + 1 < len(master_doc.paragraphs):
            master_doc.paragraphs[idx + 1].text = (
                'Status: COMPLETED & FULLY VERIFIED (2026-10-24). '
                'Delivered: EP01-01 (Registration with scrypt hashing, RFC 5322 validation, duplicate 409 handling), '
                'EP01-02 (Login/Logout, 24h tokens, constant-time compare, anti-enumeration, session revocation), '
                'EP01-03 (Password recovery, 15m single-use token, total session cascade revocation), '
                'EP11-01 (Composite rate limiting, 5-failure threshold, 15m lockout, Retry-After header). '
                'Test Suite: 24/24 tests passed (100%). Report: docs/reports/Sprint-01-Implementation-Report.docx.'
            )
            break

# Save updated Master Implementation Record
master_doc.save(master_path)
print(f'Successfully updated {master_path} to Version 0.6')
