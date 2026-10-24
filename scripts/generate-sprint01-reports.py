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
run_title = title_p.add_run('Sprint 01 Implementation Report — Final Approval Conditions')
run_title.font.name = 'Arial'
run_title.font.size = Pt(22)
run_title.font.bold = True
run_title.font.color.rgb = RGBColor(16, 24, 40)

sub_p = doc.add_paragraph()
sub_p.paragraph_format.space_after = Pt(16)
run_sub = sub_p.add_run('NexusPlay Online Gaming Platform • Sprint 01: Identity & Security • Version 1.4 (Final Approval Baseline) • Date: 2026-10-24')
run_sub.font.name = 'Arial'
run_sub.font.size = Pt(11)
run_sub.font.color.rgb = RGBColor(71, 84, 103)

# 1. Document Control & Metadata
doc.add_heading('1. Document Control & Metadata', level=2)
ctrl_table = doc.add_table(rows=8, cols=2)
ctrl_data = [
    ('Project Name', 'NexusPlay Online Gaming Platform'),
    ('Sprint Scope', 'Sprint 01 — Identity & Security (EP01-01, EP01-02, EP01-03, EP11-01)'),
    ('Final Approval Focus', 'Task 1: QA Secret Security & Rotation | Task 2: Reverse Proxy & HTTPS Audit | Task 3: Browser Verification & Manual Checklist'),
    ('Author Roles', 'Principal Application Security Engineer, Senior QA Lead, Technical Documentation Lead'),
    ('Target Environment', 'Staging (Node.js v22 LTS / Windows x64 / React 19 / Vite / node:sqlite)'),
    ('Automated Test Coverage', '49 Automated Security & Functional Tests Executed; 49 Passed (100% Success Rate)'),
    ('Regression Status', 'Sprint 00 Smoke Test Suite Verified (5/5 Checks Passed with Zero Regressions)'),
    ('Completion Gate Status', 'FINAL APPROVAL CONDITIONS SATISFIED — RECOMMENDED FOR FORMAL CLOSURE')
]
for i, (k, v) in enumerate(ctrl_data):
    ctrl_table.rows[i].cells[0].paragraphs[0].add_run(k).bold = True
    ctrl_table.rows[i].cells[1].paragraphs[0].add_run(v)
style_table(ctrl_table)

# 2. Executive Outcome & Final Approval Conditions
doc.add_heading('2. Executive Outcome & Final Approval Conditions', level=2)
doc.add_paragraph(
    'Sprint 01 — Identity & Security has satisfied all functional, architectural, and security requirements established across '
    'the approved product backlog (EP01-01, EP01-02, EP01-03, EP11-01). Following conditional approval from the Product Owner, '
    'the Principal Application Security Engineer, Senior QA Lead, and Technical Documentation Lead have completed the three remaining '
    'verification tasks, achieving 100% automated test compliance across 49 security and functional checks.'
)
doc.add_paragraph(
    'Detailed Verification Outcomes Across Three Final Approval Conditions:\n\n'
    '1. TASK 1 — Internal QA Secret Security & Rotation:\n'
    '   • Elimination of Hardcoded Fallbacks: Removed all hardcoded static QA key fallbacks ("nexusplay-internal-qa-key") from routes and documentation.\n'
    '   • Secret Rotation: The previously exposed static key has been permanently retired. Outbox access now strictly requires dynamically injected environment secrets (INTERNAL_TEST_KEY), verified using crypto.timingSafeEqual to eliminate timing side-channel attacks.\n'
    '   • Unconfigured Environment Lockout: When INTERNAL_TEST_KEY is empty or unconfigured, outbox access is completely disabled (HTTP 403 Forbidden).\n'
    '   • Production Isolation: Confirmed that /api/v1/auth/test/outbox is permanently disabled in production (process.env.NODE_ENV === "production"), returning HTTP 404 Not Found unconditionally.\n'
    '   • Zero Public Leakage: Static Express routing serves exclusively client assets; direct requests for outbox log files return HTTP 404. Git tracking excludes .env and server/data/*.log.\n'
    '   • Automated Evidence: Verified via 6 automated tests (AUTH-OUT-01 through AUTH-OUT-06).\n\n'
    '2. TASK 2 — Reverse Proxy and HTTPS Security Audit:\n'
    '   • Reverse Proxy Header Validation: Header-forwarded security metadata (X-Forwarded-Proto, X-Forwarded-For) is accepted ONLY when the immediate TCP socket originates from an explicitly trusted reverse proxy (TRUSTED_PROXIES). Direct client header spoofing from untrusted remote IPs is discarded.\n'
    '   • Unconditional Production Cookie Flags: In production (process.env.NODE_ENV === "production"), session cookies ALWAYS enforce HttpOnly and Secure attributes, regardless of ingress headers.\n'
    '   • Local Development Flexibility: In development, Secure is omitted on direct loopback HTTP connections to prevent browser rejection on localhost.\n'
    '   • Unresolved Deployment Requirements Documented: Documented ingress TLS termination, trusted proxy private CIDR configuration, HSTS header injection, and managed secret pipeline requirements.\n'
    '   • Automated Evidence: Verified via 4 automated reverse proxy tests (AUTH-PRX-01 through AUTH-PRX-04).\n\n'
    '3. TASK 3 — Browser Verification Audit & Manual QA Checklist:\n'
    '   • Tooling Dependency Analysis: Confirmed that automated Playwright browser subagent execution is blocked by an upstream Microsoft Azure CDN driver repository outage (HTTP 404 on playwright-1.57.0-win32_x64.zip). In addition, direct headless browser processes in this Windows service session cannot allocate GUI display contexts.\n'
    '   • Integrity Commitment: In strict compliance with instructions, screenshots are never fabricated and unexecuted UI tests are never claimed as passed. Browser verification is marked NOT CAPTURED and formally retained as an open QA limitation item.\n'
    '   • Comprehensive Manual Verification Checklist: Formulated an exhaustive step-by-step manual test checklist covering registration, sign-in, sign-out, password recovery, validation, responsive UI, and keyboard accessibility for human QA validation.'
)

# 3. Acceptance Criteria Verification Matrix
doc.add_heading('3. Acceptance Criteria Verification Matrix', level=2)
doc.add_paragraph('Verification results for all 12 acceptance criteria across the four sprint stories:')

ac_table = doc.add_table(rows=13, cols=5)
headers = ['Story ID', 'AC ID', 'Acceptance Requirement', 'Verification Tests Executed', 'Status']
for j, h in enumerate(headers):
    ac_table.rows[0].cells[j].paragraphs[0].add_run(h)

ac_matrix = [
    ('EP01-01', 'AC-1.1', 'Valid registration returns HTTP 201 with user profile, token, and HttpOnly cookie.', 'AUTH-REG-01, AUTH-SES-01, AUTH-SES-03: Registration, Hashed DB token, Local cookies.', 'PASSED'),
    ('EP01-01', 'AC-1.2', 'Duplicate email registration returns HTTP 409 Conflict.', 'AUTH-REG-02: Registering existing email returns 409 Conflict.', 'PASSED'),
    ('EP01-01', 'AC-1.3', 'Invalid input data rejected with HTTP 400 Bad Request.', 'AUTH-REG-03–06: Testing bad email, password <8 chars, missing numbers, short name.', 'PASSED'),
    ('EP01-02', 'AC-2.1', 'Valid login returns HTTP 200 with 24h HttpOnly cookie, session token & profile.', 'AUTH-LOG-01, AUTH-LOG-04, AUTH-SES-01..04, AUTH-PRX-01..03: Login, cookies, reverse proxy security.', 'PASSED'),
    ('EP01-02', 'AC-2.2', 'Logout revokes active session, clears cookies; subsequent calls rejected.', 'AUTH-LOG-05..07, AUTH-CSRF-01..06: CSRF validation, Origin check, session revocation, cookie purge.', 'PASSED'),
    ('EP01-02', 'AC-2.3', 'Invalid credentials return generic HTTP 401 Unauthorized.', 'AUTH-LOG-02, AUTH-LOG-03: Wrong password and non-existent email return identical 401.', 'PASSED'),
    ('EP01-03', 'AC-3.1', 'Forgot password returns uniform 200 message, hashes token, dispatches email.', 'AUTH-REC-01..03, AUTH-OUT-01..06: Outbox dispatch, SHA-256 token, timing equality, rotated secret.', 'PASSED'),
    ('EP01-03', 'AC-3.2', 'Valid token and new password update credentials; spent token marked used.', 'AUTH-REC-04, AUTH-REC-05, AUTH-REC-07: Reset password, reuse rejected, login with new password.', 'PASSED'),
    ('EP01-03', 'AC-3.3', 'Resetting password revokes all prior active sessions; expired token rejected.', 'AUTH-REC-06, AUTH-REC-08, AUTH-SES-05: Multi-device cascade revocation, expired token handling.', 'PASSED'),
    ('EP11-01', 'AC-38.1', 'Normal authentication requests within limits are processed without throttling.', 'AUTH-RAT-04: Valid authentications execute with zero latency penalty.', 'PASSED'),
    ('EP11-01', 'AC-38.2', '5 failed login attempts trigger HTTP 429 with 15m lockout and Retry-After header.', 'AUTH-RAT-01, AUTH-RAT-02, AUTH-RAT-05: 5th failure lockout, SQLite persistence, 10th distributed.', 'PASSED'),
    ('EP11-01', 'AC-38.3', 'Counter reset on success; distributed attack protection across rotating IPs.', 'AUTH-RAT-03, AUTH-RAT-04, AUTH-RAT-05, AUTH-PRX-04: Account isolation, counter reset, spoofed IP defense.', 'PASSED')
]

for i, r in enumerate(ac_matrix, start=1):
    for j, val in enumerate(r):
        p = ac_table.rows[i].cells[j].paragraphs[0]
        run = p.add_run(val)
        if j == 4:
            run.bold = True
            run.font.color.rgb = RGBColor(0, 150, 60)
style_table(ac_table)

# 4. Requirements-to-Tests Traceability Matrix (49 Tests)
doc.add_heading('4. Requirements-to-Tests Traceability Matrix (49 Tests)', level=2)
doc.add_paragraph('Comprehensive mapping of all 49 automated tests covering functional, security, and closure verification requirements:')

test_trace_table = doc.add_table(rows=50, cols=5)
t_headers = ['Test ID', 'Story / AC', 'Endpoint & Method', 'Expected Assertion', 'Result']
for j, h in enumerate(t_headers):
    test_trace_table.rows[0].cells[j].paragraphs[0].add_run(h)

tests_data = [
    # Registration (EP01-01)
    ('AUTH-REG-01', 'EP01-01 (AC-1.1)', 'POST /api/v1/auth/register', 'HTTP 201, user profile, HttpOnly SameSite=Lax cookie', 'PASS (215ms)'),
    ('AUTH-REG-02', 'EP01-01 (AC-1.2)', 'POST /api/v1/auth/register', 'HTTP 409 Conflict on existing email', 'PASS (7ms)'),
    ('AUTH-REG-03', 'EP01-01 (AC-1.3)', 'POST /api/v1/auth/register', 'HTTP 400 Bad Request on invalid email syntax', 'PASS (4ms)'),
    ('AUTH-REG-04', 'EP01-01 (AC-1.3)', 'POST /api/v1/auth/register', 'HTTP 400 Bad Request on password <8 chars', 'PASS (4ms)'),
    ('AUTH-REG-05', 'EP01-01 (AC-1.3)', 'POST /api/v1/auth/register', 'HTTP 400 Bad Request on password without numbers', 'PASS (6ms)'),
    ('AUTH-REG-06', 'EP01-01 (AC-1.3)', 'POST /api/v1/auth/register', 'HTTP 400 Bad Request on display name <2 chars', 'PASS (3ms)'),
    # Login & Session (EP01-02)
    ('AUTH-LOG-01', 'EP01-02 (AC-2.1)', 'POST /api/v1/auth/login', 'HTTP 200 OK, HttpOnly session cookie, CSRF token', 'PASS (144ms)'),
    ('AUTH-LOG-02', 'EP01-02 (AC-2.3)', 'POST /api/v1/auth/login', 'HTTP 401 Unauthorized "Invalid email or password"', 'PASS (134ms)'),
    ('AUTH-LOG-03', 'EP01-02 (AC-2.3)', 'POST /api/v1/auth/login', 'HTTP 401 Unauthorized for unregistered email', 'PASS (140ms)'),
    ('AUTH-LOG-04', 'EP01-02 (AC-2.1)', 'GET /api/v1/auth/me', 'HTTP 200 OK authenticated via ambient Cookie', 'PASS (8ms)'),
    ('AUTH-LOG-05', 'EP01-02 (AC-2.2)', 'POST /api/v1/auth/logout', 'HTTP 403 Forbidden when X-CSRF-Token is omitted', 'PASS (3ms)'),
    ('AUTH-LOG-06', 'EP01-02 (AC-2.2)', 'POST /api/v1/auth/logout', 'HTTP 200 OK with CSRF token, session cookies cleared', 'PASS (8ms)'),
    ('AUTH-LOG-07', 'EP01-02 (AC-2.2)', 'GET /api/v1/auth/me', 'HTTP 401 Unauthorized with revoked session cookie', 'PASS (4ms)'),
    # Password Recovery (EP01-03)
    ('AUTH-REC-01', 'EP01-03 (AC-3.1)', 'POST /api/v1/auth/forgot-password', 'HTTP 200, 15m token, genuine email to outbox', 'PASS (53ms)'),
    ('AUTH-REC-02', 'EP01-03 (AC-3.1)', 'Direct DB Inspection', 'Reset token cryptographically hashed at rest (SHA-256)', 'PASS (1ms)'),
    ('AUTH-REC-03', 'EP01-03 (AC-3.1)', 'POST /api/v1/auth/forgot-password', 'HTTP 200 identical msg & timing for ghost user, no email', 'PASS (125ms)'),
    ('AUTH-REC-04', 'EP01-03 (AC-3.2)', 'POST /api/v1/auth/reset-password', 'HTTP 200 OK, password updated, token marked used', 'PASS (141ms)'),
    ('AUTH-REC-05', 'EP01-03 (AC-3.2)', 'POST /api/v1/auth/reset-password', 'HTTP 400 Bad Request when re-using spent token', 'PASS (4ms)'),
    ('AUTH-REC-06', 'EP01-03 (AC-3.3)', 'GET /api/v1/auth/me', 'HTTP 401 Unauthorized for prior active session', 'PASS (4ms)'),
    ('AUTH-REC-07', 'EP01-03 (AC-3.2)', 'POST /api/v1/auth/login', 'HTTP 200 OK authenticating with new password', 'PASS (146ms)'),
    ('AUTH-REC-08', 'EP01-03 (AC-3.3)', 'POST /api/v1/auth/reset-password', 'HTTP 400 Bad Request on expired reset token (>15m)', 'PASS (4ms)'),
    # Rate Limiting (EP11-01)
    ('AUTH-RAT-01', 'EP11-01 (AC-38.2)', 'POST /api/v1/auth/login', 'HTTP 429 Too Many Requests on 5th failure with Retry-After', 'PASS (3ms)'),
    ('AUTH-RAT-02', 'EP11-01 (AC-38.2)', 'POST /api/v1/auth/login', 'Lockout persists across in-memory restarts via SQLite', 'PASS (3ms)'),
    ('AUTH-RAT-03', 'EP11-01 (AC-38.3)', 'POST /api/v1/auth/login', 'HTTP 200 OK for separate user (composite isolation)', 'PASS (171ms)'),
    ('AUTH-RAT-04', 'EP11-01 (AC-38.3)', 'POST /api/v1/auth/login', 'Success clears failure counter; prevents lockout', 'PASS (179ms)'),
    ('AUTH-RAT-05', 'EP11-01 (AC-38.2)', 'POST /api/v1/auth/login', 'HTTP 429 on 10th distributed attack across rotating IPs', 'PASS (174ms)'),
    # Security Isolation Baseline
    ('AUTH-SEC-01', 'EP01-02 (AC-2.1)', 'GET /api/v1/auth/me', 'HTTP 401 Unauthorized without Authorization or Cookie', 'PASS (3ms)'),
    ('AUTH-SEC-02', 'EP01-02 (AC-2.1)', 'GET /api/v1/auth/me', 'HTTP 401 Unauthorized with malformed Bearer token', 'PASS (3ms)'),
    # Task 1: QA Secret Security & Rotation
    ('AUTH-OUT-01', 'EP01-03 (AC-3.1)', 'GET /api/v1/auth/test/outbox', 'HTTP 403 Forbidden when X-Internal-Test-Key is omitted', 'PASS (6ms)'),
    ('AUTH-OUT-02', 'EP01-03 (AC-3.1)', 'GET /api/v1/auth/test/outbox', 'HTTP 403 Forbidden for retired legacy key (rotation verified)', 'PASS (5ms)'),
    ('AUTH-OUT-03', 'EP01-03 (AC-3.1)', 'GET /api/v1/auth/test/outbox', 'HTTP 200 OK with outbox array when rotated key is provided', 'PASS (6ms)'),
    ('AUTH-OUT-04', 'EP01-03 (AC-3.1)', 'GET /api/v1/auth/test/outbox', 'HTTP 403 Forbidden when key is unconfigured in environment', 'PASS (9ms)'),
    ('AUTH-OUT-05', 'EP01-03 (AC-3.1)', 'GET /api/v1/auth/test/outbox', 'HTTP 404 Not Found permanently disabled in production', 'PASS (5ms)'),
    ('AUTH-OUT-06', 'EP01-03 (AC-3.1)', 'GET /server/data/*.log', 'HTTP 404 Not Found preventing static outbox file leakage', 'PASS (14ms)'),
    # Task 2: Advanced CSRF Security
    ('AUTH-CSRF-01', 'EP01-02 (AC-2.2)', 'POST /api/v1/auth/logout', 'HTTP 403 Forbidden missing X-CSRF-Token on cookie auth', 'PASS (3ms)'),
    ('AUTH-CSRF-02', 'EP01-02 (AC-2.2)', 'POST /api/v1/auth/logout', 'HTTP 403 Forbidden mismatched X-CSRF-Token vs cookie', 'PASS (3ms)'),
    ('AUTH-CSRF-03', 'EP01-02 (AC-2.2)', 'POST /api/v1/auth/logout', 'HTTP 403 Forbidden cross-session CSRF token injection', 'PASS (4ms)'),
    ('AUTH-CSRF-04', 'EP01-02 (AC-2.2)', 'POST /api/v1/auth/logout', 'HTTP 403 Forbidden untrusted Origin header rejected', 'PASS (3ms)'),
    ('AUTH-CSRF-05', 'EP01-02 (AC-2.2)', 'POST /api/v1/auth/logout', 'HTTP 403 Forbidden untrusted Referer header rejected', 'PASS (3ms)'),
    ('AUTH-CSRF-06', 'EP01-02 (AC-2.2)', 'POST /api/v1/auth/logout', 'HTTP 200 OK valid session-bound CSRF token + valid Origin', 'PASS (11ms)'),
    # Task 3: Session Security & At-Rest Cryptography
    ('AUTH-SES-01', 'EP01-02 (AC-2.1)', 'Direct DB Inspection', 'Session secret SHA-256 hashed at rest (auth_sessions.token)', 'PASS (1ms)'),
    ('AUTH-SES-02', 'EP01-02 (AC-2.1)', 'GET /api/v1/auth/me', 'HTTP 401 Unauthorized DB dump hash cannot directly authenticate', 'PASS (11ms)'),
    ('AUTH-SES-03', 'EP01-02 (AC-2.1)', 'POST /api/v1/auth/login', 'Local HTTP cookies: HttpOnly=true, SameSite=Lax, Secure=false', 'PASS (170ms)'),
    ('AUTH-SES-04', 'EP01-02 (AC-2.1)', 'POST /api/v1/auth/login', 'HTTPS cookies: Secure=true enforced on session & CSRF cookies', 'PASS (202ms)'),
    ('AUTH-SES-05', 'EP01-03 (AC-3.3)', 'GET /api/v1/auth/me', 'Multi-device concurrent 200/200; Cascade revoked 401/401 on reset', 'PASS (7ms)'),
    # Task 2: Reverse Proxy & HTTPS Audit
    ('AUTH-PRX-01', 'EP01-02 (AC-2.1)', 'POST /api/v1/auth/login', 'Untrusted client spoofed X-Forwarded-Proto ignored (no Secure flag)', 'PASS (184ms)'),
    ('AUTH-PRX-02', 'EP01-02 (AC-2.1)', 'POST /api/v1/auth/login', 'Trusted proxy X-Forwarded-Proto: https accepted (Secure enforced)', 'PASS (176ms)'),
    ('AUTH-PRX-03', 'EP01-02 (AC-2.1)', 'POST /api/v1/auth/login', 'Production (NODE_ENV=production) unconditionally enforces Secure', 'PASS (169ms)'),
    ('AUTH-PRX-04', 'EP11-01 (AC-38.3)', 'POST /api/v1/auth/login', 'Untrusted client spoofed X-Forwarded-For discarded for rate limiting', 'PASS (191ms)')
]

for i, r in enumerate(tests_data, start=1):
    for j, val in enumerate(r):
        p = test_trace_table.rows[i].cells[j].paragraphs[0]
        run = p.add_run(val)
        if j == 4:
            run.bold = True
            run.font.color.rgb = RGBColor(0, 150, 60)
style_table(test_trace_table)

# 5. Browser Automation Blocker & Manual QA Verification Checklist
doc.add_heading('5. Browser Automation Blocker & Manual QA Verification Checklist', level=2)
doc.add_paragraph(
    'Technical Blocker & Integrity Commitment (Screenshots NOT CAPTURED):\n'
    'Automated browser screenshots are officially documented as NOT CAPTURED due to an upstream Azure CDN driver infrastructure failure '
    '(HTTP 404 from playwright.azureedge.net downloading playwright-1.57.0-win32_x64.zip). In addition, direct headless browser processes '
    'executed within this non-interactive Windows service environment cannot allocate graphical display contexts. '
    'In strict adherence to engineering integrity, screenshots have NOT been fabricated, and browser testing is tracked as an open QA limitation item.'
)
doc.add_paragraph(
    'Comprehensive Manual Verification Checklist for Human QA:\n\n'
    '1. User Registration Flow:\n'
    '   • Open http://localhost:5050 in Chrome or Edge.\n'
    '   • Click "Sign In" in the navigation bar -> switch to "Create Account" tab.\n'
    '   • Enter Gamer Tag "ObsidianGamer", email "player_manual@nexusplay.gg", password "ValidPass2026!".\n'
    '   • Submit form -> Verify modal closes, top bar shows player display name avatar, and HTTP 201 response is logged in Network tab.\n'
    '   • DevTools Inspection: Confirm localStorage and sessionStorage are completely empty. Confirm nexusplay_session cookie is set with HttpOnly and SameSite=Lax.\n\n'
    '2. User Sign-In & Sign-Out Flow:\n'
    '   • Click user avatar -> Click "Sign Out".\n'
    '   • Verify cookies nexusplay_session and nexusplay_csrf are purged (Max-Age=0).\n'
    '   • Click "Sign In", enter credentials, submit form -> Verify authentication succeeds and session cookie is restored.\n\n'
    '3. Form Validation Messages:\n'
    '   • In Create Account tab, test: empty fields, bad email (no @), password <8 chars, password without numbers, display name <2 chars.\n'
    '   • Verify descriptive error banners appear dynamically above the input fields matching server validation specifications.\n\n'
    '4. Password Recovery Flow:\n'
    '   • Click "Reset Password" tab -> Enter "player_manual@nexusplay.gg" -> Click "Send Reset Link".\n'
    '   • Verify uniform success banner: "If this email is registered, password reset instructions have been sent."\n'
    '   • Inspect server/data/email-outbox.log (or staging outbox API with X-Internal-Test-Key) to retrieve the 64-character token.\n'
    '   • Enter token and new password "BrandNewPass2026!" in Reset Password form -> Verify password updates with HTTP 200.\n'
    '   • Verify all previously active sessions across other browser windows or devices are cascade revoked.\n\n'
    '5. Responsive UI Verification:\n'
    '   • Desktop (1440px): Verify full 3-column Obsidian Arcade layout with sidebar navigation, game grid, and player stats.\n'
    '   • Tablet (768px): Verify responsive collapse of sidebar into mobile-friendly header navigation.\n'
    '   • Mobile (375px): Verify authentication modal scales to full-width drawer with accessible touch targets (min 44px).\n\n'
    '6. Keyboard Navigation & Accessibility:\n'
    '   • Press Tab to cycle focus sequentially through all form inputs, tabs, and action buttons.\n'
    '   • Press Enter to submit active forms; press Escape to dismiss the modal.\n'
    '   • Verify visible focus rings adhere to Obsidian Arcade violet/teal theme guidelines.'
)

# 6. Change Register & File Inventory
doc.add_heading('6. Change Register & File Inventory', level=2)
inv_data = [
    ('.env.example', 'Configuration', 'Template documenting NODE_ENV, PORT, INTERNAL_TEST_KEY, and TRUSTED_PROXIES.'),
    ('server/src/config.js', 'Core Config', 'Lightweight native .env loader, trusted reverse proxy validator (isTrustedProxy), and secure request evaluator.'),
    ('server/src/app.js', 'Express Core', 'Configured app.set("trust proxy", isTrustedProxy) to accept proxy forwarding only from verified IPs.'),
    ('server/src/db/schema.sql', 'Database Schema', 'Added csrf_token column to auth_sessions table for cryptographic session binding.'),
    ('server/src/db/index.js', 'Database Manager', 'Automated column migration ensuring csrf_token exists on legacy databases without data loss.'),
    ('server/src/modules/identity/crypto.js', 'Security / Crypto', 'Added hashToken (SHA-256), deriveCsrfToken (HMAC-SHA256), verifyCsrfBinding (timingSafeEqual), and constantTimeDummyWork timing equalization.'),
    ('server/src/modules/identity/validation.js', 'Validation', 'RFC 5322 email regex, 8-64 char password policy (letter+number), 2-32 char display name.'),
    ('server/src/modules/identity/rateLimiter.js', 'Rate Limiting', 'SQLite-backed rate limiter surviving server restarts; composite ip:email and distributed target email defense.'),
    ('server/src/modules/identity/emailService.js', 'Email Delivery', 'Transactional email dispatch, staging file/memory outbox logging, dynamic isProduction getter, and production SMTP/SES specification.'),
    ('server/src/modules/identity/authService.js', 'Domain Service', 'Hashed session tokens (SHA-256) at rest, database dump defense, hashed reset tokens, genuine email dispatch, cascade session revocation.'),
    ('server/src/modules/identity/middleware.js', 'HTTP Middleware', 'Origin & Referer validation, cookie extraction (nexusplay_session), session-bound CSRF token validation (X-CSRF-Token).'),
    ('server/src/modules/identity/routes.js', 'Express Router', 'HttpOnly cookie issuance, SameSite=Lax, CSRF cookie, clearAuthCookies with HTTPS Secure attribute, and protected /test/outbox endpoint (404 in prod, dynamic secret with timingSafeEqual in non-prod).'),
    ('server/src/modules/identity/index.js', 'Module Export', 'Clean identity subsystem exports and entrypoint.'),
    ('client/src/utils/csrf.ts', 'Frontend Utility', 'Client-side reader for nexusplay_csrf cookie to supply X-CSRF-Token header on fetch requests.'),
    ('client/src/components/AuthModal.tsx', 'React 19 Component', 'Obsidian Arcade modal using credentials: include and X-CSRF-Token header; zero localStorage token persistence.'),
    ('client/src/App.tsx', 'React 19 Core', 'Session restoration via ambient HttpOnly cookie; complete removal of localStorage/sessionStorage token handling.'),
    ('.gitignore', 'Repository Config', 'Added .env, .env.*, server/data/*.log, and *.log ignores to prevent secret leakage into git tracking.'),
    ('scripts/test-sprint01-auth.js', 'Automated QA', 'Comprehensive test harness executing all 49 security and functional verification tests.')
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
ev_table = doc.add_table(rows=3, cols=5)
ev_headers = ['Test Suite', 'Target & Port', 'Executed Checks', 'Outcome', 'Evidence Artifact']
for j, h in enumerate(ev_headers):
    ev_table.rows[0].cells[j].paragraphs[0].add_run(h)

ev_data = [
    ('Sprint 01 Hardened Suite', 'http://127.0.0.1:5059', '49 tests (EP01-01, EP01-02, EP01-03, EP11-01 + Outbox + CSRF + Session + Proxy)', '49/49 PASSED (100%)', 'evidence/sprint-01/test-results/sprint-01-auth-test-results-*.json'),
    ('Regression Smoke Suite', 'http://localhost:5050', '5 checks (Liveness, DB, Status, UI Shell, WebSocket)', '5/5 PASSED (100%)', 'evidence/sprint-00/test-results/smoke-test-pass-*.json')
]
for i, r in enumerate(ev_data, start=1):
    for j, val in enumerate(r):
        p = ev_table.rows[i].cells[j].paragraphs[0]
        run = p.add_run(val)
        if j == 3:
            run.bold = True
            run.font.color.rgb = RGBColor(0, 150, 60)
style_table(ev_table)

# 8. Unresolved Deployment-Security Requirements
doc.add_heading('8. Unresolved Deployment-Security Requirements', level=2)
doc.add_paragraph(
    '1. Ingress TLS Termination & Trusted Proxy CIDR Alignment: In production deployment (Sprint 13+), ingress reverse proxies (AWS ALB, Cloudflare, or Nginx) must terminate TLS with valid CA certificates. The TRUSTED_PROXIES environment variable must be configured with the exact private VPC CIDRs of the ingress layer to prevent external header spoofing.\n'
    '2. HSTS Header Policy: Production reverse proxies must enforce HTTP Strict Transport Security (Strict-Transport-Security: max-age=63072000; includeSubDomains; preload).\n'
    '3. Enterprise Secret Management: Production deployments must inject INTERNAL_TEST_KEY, DB credentials, and session secrets via AWS Secrets Manager or HashiCorp Vault with automated secret rotation.\n'
    '4. Production Transactional Email Gateway: Provisioning AWS SES or SendGrid with strict SPF, DKIM, and DMARC DNS records.\n'
    '5. Open Browser Verification Limitation: Automated browser screenshots remain NOT CAPTURED due to upstream Azure CDN driver download unavailability. Retained as an open QA limitation item until dedicated graphical runner infrastructure is provisioned.'
)

# 9. Completion Gate & Sign-Off Recommendation
doc.add_heading('9. Completion Gate & Sign-Off Recommendation', level=2)
doc.add_paragraph(
    'All functional, security hardening, reverse proxy audit, and secret rotation requirements for Sprint 01 have been satisfied, verified, and validated. '
    'The Principal Application Security Engineer, Senior QA Lead, and Technical Documentation Lead formally submit this verification evidence and request final Product Owner approval to close Sprint 01.'
)

sign_table = doc.add_table(rows=3, cols=3)
sign_headers = ['Role', 'Name / Signee', 'Approval Decision / Date']
for j, h in enumerate(sign_headers):
    sign_table.rows[0].cells[j].paragraphs[0].add_run(h)

sign_data = [
    ('Principal AppSec & Senior QA Lead', 'Google Antigravity Lead Agent', 'VERIFIED & RECOMMENDED FOR CLOSURE / 2026-10-24'),
    ('Product Owner / SRE Lead', '[PRODUCT_OWNER]', 'REQUESTED FINAL SPRINT 01 CLOSURE APPROVAL')
]
for i, r in enumerate(sign_data, start=1):
    for j, val in enumerate(r):
        sign_table.rows[i].cells[j].paragraphs[0].add_run(val)
style_table(sign_table)

report_path = os.path.join('docs', 'reports', 'Sprint-01-Implementation-Report.docx')
doc.save(report_path)
print(f'Successfully created {report_path}')


# ==============================================================================
# 2. UPDATE MASTER-Implementation-Record.docx TO VERSION 0.7
# ==============================================================================
master_path = os.path.join('docs', 'reports', 'MASTER-Implementation-Record.docx')
master_doc = docx.Document(master_path)

# Update Document Control
t0 = master_doc.tables[0]
for row in t0.rows:
    if 'Sprint' in row.cells[0].text:
        row.cells[1].text = 'Sprint 01: Identity & Security (EP01-01, EP01-02, EP01-03, EP11-01) — Final Approval Verification'
    elif 'Version' in row.cells[0].text:
        row.cells[1].text = '0.7'

# Update Version History (Table 1)
t1 = master_doc.tables[1]
found_v07 = False
for row in t1.rows:
    if row.cells[0].text.strip() == '0.7':
        row.cells[1].text = '2026-10-24'
        row.cells[2].text = (
            'Sprint 01 Final Approval Verification: Implemented Identity & Security module covering EP01-01, EP01-02, EP01-03, and EP11-01. '
            'Satisfied all three conditional approval requirements: Task 1 (Internal QA Secret Security: removed all hardcoded fallbacks, rotated static QA key, dynamic secret injection, unconfigured environment lockout, timingSafeEqual comparison), '
            'Task 2 (Reverse Proxy and HTTPS Security: trusted proxy header validation via TRUSTED_PROXIES, untrusted client spoofing discarded, unconditional production Secure and HttpOnly cookies, documented deployment security requirements), '
            'Task 3 (Browser Verification: documented Playwright CDN 404 driver download limitation, marked NOT CAPTURED without screenshot fabrication, formulated comprehensive manual QA verification checklist). '
            'Verified 49/49 automated security & functional tests passing (100%) and 5/5 Sprint 00 smoke regression tests passing.'
        )
        row.cells[3].text = 'docs/reports/Sprint-01-Implementation-Report.docx'
        found_v07 = True
        break

if not found_v07:
    new_row = t1.add_row()
    new_row.cells[0].paragraphs[0].text = '0.7'
    new_row.cells[1].paragraphs[0].text = '2026-10-24'
    new_row.cells[2].paragraphs[0].text = (
        'Sprint 01 Final Approval Verification: Implemented Identity & Security module covering EP01-01, EP01-02, EP01-03, and EP11-01. '
        'Satisfied all three conditional approval requirements: Task 1 (Internal QA Secret Security: removed all hardcoded fallbacks, rotated static QA key, dynamic secret injection, unconfigured environment lockout, timingSafeEqual comparison), '
        'Task 2 (Reverse Proxy and HTTPS Security: trusted proxy header validation via TRUSTED_PROXIES, untrusted client spoofing discarded, unconditional production Secure and HttpOnly cookies, documented deployment security requirements), '
        'Task 3 (Browser Verification: documented Playwright CDN 404 driver download limitation, marked NOT CAPTURED without screenshot fabrication, formulated comprehensive manual QA verification checklist). '
        'Verified 49/49 automated security & functional tests passing (100%) and 5/5 Sprint 00 smoke regression tests passing.'
    )
    new_row.cells[3].paragraphs[0].text = 'docs/reports/Sprint-01-Implementation-Report.docx'

# Update Section 2: Sprint Roadmap & Progress
for idx, p in enumerate(master_doc.paragraphs):
    if 'Sprint 01: Identity & Security' in p.text or 'Sprint 01: identity' in p.text.lower():
        if idx + 1 < len(master_doc.paragraphs):
            master_doc.paragraphs[idx + 1].text = (
                'Status: COMPLETED & FULLY VERIFIED — FINAL APPROVAL CONDITIONS SATISFIED (2026-10-24). '
                'Delivered: EP01-01 (Registration with scrypt hashing, RFC 5322 validation, duplicate 409 handling), '
                'EP01-02 (Login/Logout, 24h HttpOnly cookies, HMAC session-bound CSRF, Origin validation, zero localStorage, SHA-256 session secret hashing at rest, DB dump direct reuse defense, trusted proxy verification), '
                'EP01-03 (Password recovery, SHA-256 hashed 15m single-use token, transactional email outbox, rotated QA secret, production 404 denial, fleet-wide session cascade revocation), '
                'EP11-01 (Persistent SQLite rate limiting surviving restarts, 5-failure threshold, 15m lockout, Retry-After header, distributed brute-force defense, spoofed IP rejection). '
                'Test Suite: 49/49 tests passed (100%). Regression Suite: 5/5 checks passed (100%). Browser Status: NOT CAPTURED (Playwright CDN 404 limitation, full manual QA checklist provided). Report: docs/reports/Sprint-01-Implementation-Report.docx.'
            )
            break

# Save updated Master Implementation Record
master_doc.save(master_path)
print(f'Successfully updated {master_path} to Version 0.7')
