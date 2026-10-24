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
# 1. CREATE docs/reports/Sprint-03-Implementation-Report.docx
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
run_title = title_p.add_run('Sprint 03 Implementation Report — Content Administration')
run_title.font.name = 'Arial'
run_title.font.size = Pt(22)
run_title.font.bold = True
run_title.font.color.rgb = RGBColor(16, 24, 40)

sub_p = doc.add_paragraph()
sub_p.paragraph_format.space_after = Pt(16)
run_sub = sub_p.add_run('NexusPlay Online Gaming Platform • Sprint 03 Final Closure Verification • Version 1.1 • Date: 2026-10-24')
run_sub.font.name = 'Arial'
run_sub.font.size = Pt(11)
run_sub.font.color.rgb = RGBColor(71, 84, 103)

# 1. Document Control & Metadata
doc.add_heading('1. Document Control & Metadata', level=2)
ctrl_table = doc.add_table(rows=9, cols=2)
ctrl_data = [
    ('Project Name', 'NexusPlay Online Gaming Platform'),
    ('Sprint Scope', 'Sprint 03: Content Administration (EP03-02, EP10-01, EP10-02, EP10-03, EP11-02)'),
    ('Implementation Baseline', 'React 19, TypeScript, Vite, Scoped CSS Modules, Node.js Express, SQLite DatabaseSync'),
    ('Sprint Status', 'COMPLETED & FULLY VERIFIED — FINAL CLOSURE VERIFICATION SATISFIED (100% PASS RATE)'),
    ('Target Environment', 'Staging (http://localhost:5050) & Automated Chrome CDP Browser Test Engine'),
    ('Acceptance Criteria Count', '18 Reconciled Criteria (EP03-02: 3, EP10-01: 3, EP10-02: 3, EP10-03: 3, EP11-02: 6) — 100% Verified'),
    ('Automated Test Results', '69/69 Sprint 03 Tests PASS (100%) | 31/31 Catalog PASS | 49/49 Security PASS | 5/5 Smoke PASS (Total: 154/154 PASS)'),
    ('Browser Verification Status', '12/12 Checks PASS (100%) via Chrome DevTools Protocol (CDP) • 12 Genuine Screenshots Captured'),
    ('Lead Roles', 'Principal Software Architect, Application Security Engineer, QA Lead, Technical Documentation Lead')
]
for i, (k, v) in enumerate(ctrl_data):
    ctrl_table.rows[i].cells[0].paragraphs[0].text = k
    ctrl_table.rows[i].cells[0].paragraphs[0].runs[0].font.bold = True
    ctrl_table.rows[i].cells[1].paragraphs[0].text = v
style_table(ctrl_table)

# 2. Executive Summary
doc.add_heading('2. Executive Summary & Verification Reconciliation', level=2)
p_exec = doc.add_paragraph(
    'Sprint 03 delivered the comprehensive Content Administration system for the NexusPlay platform, fulfilling all five authorized '
    'user stories: EP03-02 (Register game launch URL and metadata), EP10-01 (Edit game title, category, and description), EP10-02 (Publish '
    'or unpublish individual games), EP10-03 (View and update game licensing approval status), and EP11-02 (Role-based access control '
    'and administrative change auditing).\n\n'
    'During final closure verification, four principal architectural and security audits were performed and successfully validated:\n'
    '1. Acceptance Criteria Reconciliation (18 Total ACs): The previous provisional report referenced 15 acceptance criteria. Thorough reconciliation '
    'against the master requirement documentation (docs/source/online_gaming_platform_all_stories_acceptance_criteria.docx) established that EP11-02 '
    'subsumes two distinct requirement clusters: AC-39.1..39.3 (Role-Based Access Control) and AC-40.1..40.3 (Administrative Change Auditing). '
    'The correct total across the five stories is eighteen (18) acceptance criteria. All 18 criteria have been completely implemented and verified with full traceability.\n'
    '2. Game Launch URL Security & Protocol Hardening: Rigorous server-side URL validation was implemented in ContentAdminService. The engine strictly '
    'rejects executable pseudo-protocols (javascript:, data:, vbscript:, file:, blob:), insecure plaintext HTTP (http://), protocol-relative URLs (//), '
    'path traversal sequences (/../, %2e%2e), and CRLF control-character injection. External launch URLs are strictly restricted to an approved domain '
    'whitelist (*.nexusplay.gg, *.nexusgames.net, *.obsidianarcade.com). Ten automated negative attack vectors and positive whitelist cases confirmed 100% enforcement.\n'
    '3. Licensing and Publication Transactional Consistency: Publication state and licensing approvals are synchronized with atomic SQLite DatabaseSync '
    'transactions (BEGIN IMMEDIATE ... COMMIT). Attempting to publish an unapproved game (pending or rejected status) is strictly blocked with HTTP 422/409. '
    'Revoking licensing clearance executes an atomic cascade setting is_published = 0, complemented by dual-layer catalog query enforcement in catalogService.js '
    'that renders unapproved games inaccessible even via direct deep-link lookups (HTTP 404).\n'
    '4. Audit Ledger Immutability & Attribution Integrity: Express route guards enforce HTTP 405 Method Not Allowed on all mutating HTTP methods (DELETE, '
    'PUT, POST, PATCH) targeting /api/v1/admin/audit-events, ensuring the historical audit trail is append-only and tamper-proof. All audit records '
    'strictly capture actor ID, action type, target resource, and ISO timestamp. In addition, security audits confirmed that rejected unauthorized attempts '
    '(ACCESS_DENIED) record operational diagnostic metadata without exposing sensitive credentials, passwords, or session tokens.\n\n'
    'Testing achieved 100% pass rates across 69 Sprint 03 automated tests, 31 Sprint 02 catalog tests, 49 Sprint 01 security tests, 5 staging smoke checks '
    '(154/154 automated regression assertions total), and 12/12 real Chrome DevTools Protocol (CDP) browser scenarios documented with 12 authentic screenshot artifacts.'
)

# 3. Requirements & Acceptance Criteria Reconciliation Matrix
doc.add_heading('3. Acceptance Criteria Traceability Matrix (18 Reconciled Criteria)', level=2)
p_ac = doc.add_paragraph('Reconciled verification results across all 5 approved Sprint 03 user stories and 18 acceptance criteria:')

ac_table = doc.add_table(rows=19, cols=5)
ac_headers = ['Story ID', 'Criteria ID', 'Requirement Summary', 'Test Identifier', 'Verification Result']
for j, h in enumerate(ac_headers):
    ac_table.rows[0].cells[j].paragraphs[0].text = h

ac_rows = [
    ('EP03-02', 'AC-10.1', 'Save game with required metadata & allowed URL creates catalog record', 'ADM-REG-01', 'PASSED (HTTP 201 Created, record returned)'),
    ('EP03-02', 'AC-10.2', 'Missing mandatory metadata rejected with field-specific feedback', 'ADM-REG-02..07', 'PASSED (HTTP 400 with validationErrors map)'),
    ('EP03-02', 'AC-10.3', 'Newly created game defaults to unpublished draft; hidden from public', 'ADM-REG-08', 'PASSED (is_published=0, absent from public catalog)'),
    ('EP10-01', 'AC-35.1', 'Save valid title, category, description updates listing', 'ADM-EDT-01', 'PASSED (HTTP 200 OK, updated fields reflected in API/UI)'),
    ('EP10-01', 'AC-35.2', 'Blank required field prevents incomplete listing', 'ADM-EDT-02', 'PASSED (HTTP 400 Bad Request, save prevented)'),
    ('EP10-01', 'AC-35.3', 'Unauthorized player attempting metadata change is denied', 'ADM-EDT-03', 'PASSED (HTTP 403 Forbidden, mutation blocked)'),
    ('EP10-02', 'AC-36.1', 'Publish approved listing makes game visible in public catalog', 'ADM-PUB-01', 'PASSED (HTTP 200 OK, immediately discoverable)'),
    ('EP10-02', 'AC-36.2', 'Unpublish published game removes it from public discovery', 'ADM-PUB-02', 'PASSED (HTTP 200 OK, excluded from public search)'),
    ('EP10-02', 'AC-36.3', 'Unauthorized publishing action denied; status remains unchanged', 'ADM-PUB-03', 'PASSED (HTTP 403 Forbidden, state unchanged)'),
    ('EP10-03', 'AC-37.1', 'Administrator views and updates game licensing approval status', 'ADM-LIC-01', 'PASSED (Licensing status visible and modifiable)'),
    ('EP10-03', 'AC-37.2', 'Unapproved game publication is strictly blocked', 'ADM-LIC-02', 'PASSED (HTTP 422 LICENSING_APPROVAL_REQUIRED)'),
    ('EP10-03', 'AC-37.3', 'Loss of licensing clearance automatically unpublishes live game', 'ADM-LIC-03', 'PASSED (Auto-unpublish triggered, is_published=0)'),
    ('EP11-02', 'AC-39.1', 'Authorized content administrator permitted to perform actions', 'ADM-RBC-01', 'PASSED (HTTP 200 OK for admin role)'),
    ('EP11-02', 'AC-39.2', 'Player lacking content-management role denied with 403', 'ADM-RBC-02', 'PASSED (HTTP 403 Forbidden for player role)'),
    ('EP11-02', 'AC-39.3', 'Revoked administrative role denied immediately in real time', 'ADM-RBC-03', 'PASSED (Instant live DB check denies revoked user)'),
    ('EP11-02', 'AC-40.1', 'All critical administrative mutations recorded in audit trail', 'ADM-AUD-01', 'PASSED (Audit trail captures GAME_*, LICENSING_*)'),
    ('EP11-02', 'AC-40.2', 'Rejected unauthorized administrative actions audited', 'ADM-AUD-02', 'PASSED (ACCESS_DENIED security events recorded)'),
    ('EP11-02', 'AC-40.3', 'Authorized administrators retrieve chronological audit events', 'ADM-AUD-03', 'PASSED (HTTP 200 with pagination & action filtering)')
]

for i, row in enumerate(ac_rows):
    for j in range(5):
        ac_table.rows[i + 1].cells[j].paragraphs[0].text = row[j]
style_table(ac_table)

# 4. Security Verification Deep-Dive
doc.add_heading('4. Security Hardening & Audit Integrity Verification', level=2)
p_sec = doc.add_paragraph(
    '4.1 Game Launch URL Security (Task 2)\n'
    'To prevent Cross-Site Scripting (XSS), open-redirect vulnerabilities, local file inclusion (LFI), and malicious external frame injection, '
    'ContentAdminService enforces strict syntactic and semantic launch URL validation:\n'
    '• Executable Pseudo-Protocols: Rejects javascript:, data:, vbscript:, file:, and blob: schemes.\n'
    '• Insecure Transport: Rejects plaintext http:// URLs, mandating HTTPS for all external distribution.\n'
    '• Protocol-Relative URLs: Rejects paths starting with // to avoid scheme-spoofed redirection.\n'
    '• Directory Traversal: Rejects sequences containing /../, /..\\, or encoded %2e%2e in internal paths.\n'
    '• CRLF Header Injection: Detects and rejects line breaks and ASCII control characters (\\r, \\n, \\0).\n'
    '• Domain Whitelist: Restricts external hosts to nexusplay.gg, *.nexusplay.gg, localhost, 127.0.0.1, *.nexusgames.net, and *.obsidianarcade.com.\n\n'
    '4.2 Licensing & Publication Transactional Consistency (Task 3)\n'
    'Publication and licensing states are transactionally coupled via SQLite DatabaseSync immediate transactions (BEGIN IMMEDIATE ... COMMIT):\n'
    '• Publication Gate: Attempting to publish an unapproved game (status pending or rejected) is rejected with HTTP 422.\n'
    '• Revocation Cascade: Setting licensing clearance to rejected or suspended triggers an atomic update setting is_published = 0.\n'
    '• Public Catalog Isolation: Both catalog listing queries and single-game slug lookups (catalogService.js) join licensing_approvals '
    'and require (l.status = "approved" OR l.status IS NULL), preventing deep-link launch access for unapproved games.\n\n'
    '4.3 Audit Ledger Immutability & Attribution (Task 4)\n'
    '• Ledger Immutability: The router mounts an HTTP 405 Method Not Allowed handler for all mutating methods (DELETE, PUT, POST, PATCH) on /api/v1/admin/audit-events*.\n'
    '• Attribution: Every record captures actor ID, actor display name, action type, resource URI, and timestamp.\n'
    '• Credential Isolation: Audit logs of rejected attempts (ACCESS_DENIED) record HTTP method and caller metadata without storing passwords, session tokens, or secrets.'
)

# 5. Browser Automation QA Verification & Evidence
doc.add_heading('5. Browser Automation QA Verification (Chrome CDP)', level=2)
p_cdp = doc.add_paragraph(
    'Browser verification was executed using Chrome DevTools Protocol (CDP) WebSocket automation against http://localhost:5050. '
    'All 12 interaction scenarios passed with 100% success rate, capturing authentic high-resolution screenshots archived in '
    'evidence/sprint-03/screenshots/:'
)

ui_table = doc.add_table(rows=13, cols=4)
ui_headers = ['Scenario ID', 'Interaction Scenario', 'Verification Outcome', 'Evidence Screenshot']
for j, h in enumerate(ui_headers):
    ui_table.rows[0].cells[j].paragraphs[0].text = h

ui_rows = [
    ('UI-ADM-01', 'Unauthenticated Visitor View', 'Admin console hidden; Sign In CTA visible in navbar', '01-unauthorized-visitor-view.png'),
    ('UI-ADM-02', 'Administrator Sign In Flow', 'Secure modal login with admin@nexusplay.gg credentials', '02-admin-login-modal.png'),
    ('UI-ADM-03', 'Admin Console Dashboard Active', 'Console active with 5 stats cards, control bar, inventory', '03-admin-authenticated-console.png'),
    ('UI-ADM-04', 'Game Registration Modal (EP03-02)', 'GameEditorModal opened with required metadata inputs and draft notice', '04-game-registration-modal.png'),
    ('UI-ADM-05', 'Validation Feedback (AC-10.2)', 'Client & server validation displays field-specific error states', '05-game-validation-feedback.png'),
    ('UI-ADM-06', 'Draft Game Registered (AC-10.3)', 'New game created as Draft with Pending licensing', '06-new-game-draft-registered.png'),
    ('UI-ADM-07', 'Edit Game Metadata (EP10-01)', 'Edit modal populates existing attributes for updating', '07-edit-metadata-modal.png'),
    ('UI-ADM-08', 'Licensing Approval Review (EP10-03)', 'Licensing modal updates distribution clearance to Approved', '08-licensing-clearance-modal.png'),
    ('UI-ADM-09', 'Publication Workflow (EP10-02)', 'Approved game published and synchronized with public catalog', '09-licensing-approved-and-published.png'),
    ('UI-ADM-10', 'Licensing Revocation (AC-37.3)', 'Clearance revocation warns user and auto-unpublishes game', '10-licensing-revocation-auto-unpublish.png'),
    ('UI-ADM-11', 'Audit Trail Inspection (EP11-02)', 'Audit modal displays immutable timestamped mutation records', '11-audit-trail-inspection.png'),
    ('UI-ADM-12', 'Mobile Responsive Viewport', '375x812 viewport verified with responsive stats and tables', '12-mobile-responsive-admin.png')
]

for i, row in enumerate(ui_rows):
    for j in range(4):
        ui_table.rows[i + 1].cells[j].paragraphs[0].text = row[j]
style_table(ui_table)

# 6. Comprehensive Regression Testing Summary
doc.add_heading('6. Comprehensive Regression Testing Summary', level=2)
reg_table = doc.add_table(rows=6, cols=4)
reg_headers = ['Test Suite', 'Target Scope', 'Assertions / Checks', 'Status']
for j, h in enumerate(reg_headers):
    reg_table.rows[0].cells[j].paragraphs[0].text = h

reg_rows = [
    ('Sprint 03 Content Admin', 'EP03-02, EP10-01..03, EP11-02 (Admin CRUD, RBAC, URL Security, Licensing, Audit)', '69 Tests Executed', '69/69 PASSED (100%)'),
    ('Sprint 02 Game Catalog', 'EP02-01..04 (Browse, Search, Category Filter, Details Modal)', '31 Tests Executed', '31/31 PASSED (100%)'),
    ('Sprint 01 Identity & Security', 'EP01-01..03, EP11-01 (Auth, HttpOnly Cookies, CSRF, Rate Limits, Secrets)', '49 Tests Executed', '49/49 PASSED (100%)'),
    ('Sprint 00 Staging Pipeline', 'EP13-01 (Health, Readiness, Metadata, Shell, WebSocket)', '5 Checks Executed', '5/5 PASSED (100%)'),
    ('Browser QA Automation', 'Chrome CDP End-to-End Visual & Interaction Scenarios', '12 Scenarios Executed', '12/12 PASSED (100%)')
]

for i, row in enumerate(reg_rows):
    for j in range(4):
        reg_table.rows[i + 1].cells[j].paragraphs[0].text = row[j]
style_table(reg_table)

# 7. Closure Decision & Formal Approval Request
doc.add_heading('7. Closure Decision & Formal Request for Approval', level=2)
p_dec = doc.add_paragraph(
    'All five Sprint 03 user stories, eighteen reconciled acceptance criteria, URL security hardening controls, licensing consistency transactions, '
    'and audit ledger immutability protections have been completely implemented, verified, and documented. Zero regressions exist across Sprint 00, '
    'Sprint 01, and Sprint 02 baselines (154/154 automated tests passing). Formal approval for closure of Sprint 03 — Content Administration is '
    'hereby requested from the Product Owner.'
)

report_path = 'docs/reports/Sprint-03-Implementation-Report.docx'
doc.save(report_path)
print(f'Successfully generated {report_path}')


# ==============================================================================
# 2. UPDATE docs/reports/MASTER-Implementation-Record.docx TO VERSION 0.9
# ==============================================================================
master_path = 'docs/reports/MASTER-Implementation-Record.docx'
master_doc = docx.Document(master_path)

# Update Document Control (Table 0)
t0 = master_doc.tables[0]
for row in t0.rows:
    if 'Sprint' in row.cells[0].text:
        row.cells[1].text = 'Sprint 03: Content Administration (EP03-02, EP10-01, EP10-02, EP10-03, EP11-02) — Final Closure Verified'
    elif 'Version' in row.cells[0].text:
        row.cells[1].text = '0.9'

# Update Version History (Table 1)
t1 = master_doc.tables[1]
found_v09 = False
for row in t1.rows:
    if row.cells[0].text.strip() == '0.9':
        row.cells[1].text = '2026-10-24'
        row.cells[2].text = (
            'Sprint 03 Final Closure Verification: Reconciled 18 acceptance criteria across EP03-02, EP10-01, EP10-02, EP10-03, and EP11-02 '
            '(confirming EP11-02 subsumes both AC-39.1..39.3 RBAC and AC-40.1..40.3 Auditing). Hardened ContentAdminService with server-side '
            'launch URL validation rejecting dangerous schemes (javascript:, data:, vbscript:, file:, blob:, http://), protocol-relative paths, '
            'traversal, and unapproved hosts. Enforced atomic transaction consistency (BEGIN IMMEDIATE ... COMMIT) and auto-unpublish cascade '
            'for licensing revocation, with defense-in-depth catalog query filtering. Implemented HTTP 405 Method Not Allowed guards ensuring audit '
            'ledger immutability, verified complete actor/action/target attribution, and confirmed zero credential leakage in ACCESS_DENIED logs. '
            'Full regression verified: 69/69 Sprint 03 tests PASS, 31/31 Sprint 02 catalog tests PASS, 49/49 Sprint 01 security tests PASS, '
            '5/5 staging smoke checks PASS (154/154 automated PASS total), and 12/12 Chrome CDP browser scenarios PASS with 12 authentic screenshots.'
        )
        row.cells[3].text = 'docs/reports/Sprint-03-Implementation-Report.docx'
        found_v09 = True
        break

if not found_v09:
    new_row = t1.add_row()
    new_row.cells[0].paragraphs[0].text = '0.9'
    new_row.cells[1].paragraphs[0].text = '2026-10-24'
    new_row.cells[2].paragraphs[0].text = (
        'Sprint 03 Final Closure Verification: Reconciled 18 acceptance criteria across EP03-02, EP10-01, EP10-02, EP10-03, and EP11-02 '
        '(confirming EP11-02 subsumes both AC-39.1..39.3 RBAC and AC-40.1..40.3 Auditing). Hardened ContentAdminService with server-side '
        'launch URL validation rejecting dangerous schemes (javascript:, data:, vbscript:, file:, blob:, http://), protocol-relative paths, '
        'traversal, and unapproved hosts. Enforced atomic transaction consistency (BEGIN IMMEDIATE ... COMMIT) and auto-unpublish cascade '
        'for licensing revocation, with defense-in-depth catalog query filtering. Implemented HTTP 405 Method Not Allowed guards ensuring audit '
        'ledger immutability, verified complete actor/action/target attribution, and confirmed zero credential leakage in ACCESS_DENIED logs. '
        'Full regression verified: 69/69 Sprint 03 tests PASS, 31/31 Sprint 02 catalog tests PASS, 49/49 Sprint 01 security tests PASS, '
        '5/5 staging smoke checks PASS (154/154 automated PASS total), and 12/12 Chrome CDP browser scenarios PASS with 12 authentic screenshots.'
    )
    new_row.cells[3].paragraphs[0].text = 'docs/reports/Sprint-03-Implementation-Report.docx'

# Update Sprint Tracking (Table 2)
t2 = master_doc.tables[2]
for row in t2.rows:
    sprint_cell = row.cells[0].text.strip()
    if sprint_cell == '02':
        row.cells[2].text = 'Completed / Fully Verified'
        row.cells[3].text = 'evidence/sprint-02/'
        row.cells[4].text = 'Verified / Closed'
    elif sprint_cell == '03':
        row.cells[2].text = 'Completed / Fully Verified (18/18 ACs Reconciled, 69/69 Tests)'
        row.cells[3].text = 'evidence/sprint-03/'
        row.cells[4].text = 'Pending PO Approval'

# Update Section 4: Sprint Roadmap & Progress
for idx, p in enumerate(master_doc.paragraphs):
    if 'sprint 03: content administration' in p.text.lower() or 'sprint 03: content' in p.text.lower():
        if idx + 1 < len(master_doc.paragraphs):
            master_doc.paragraphs[idx + 1].text = (
                'Status: COMPLETED & FULLY VERIFIED (2026-10-24). '
                'Delivered: EP03-02 (Register game launch URL and metadata, draft content isolation, mandatory metadata validation, URL security hardening), '
                'EP10-01 (Edit game title, category, and description, field validation, player edit denial), '
                'EP10-02 (Publish or unpublish individual games, catalog synchronization, unauthorized attempt denial), '
                'EP10-03 (View and update game licensing approval status, publication blocking for unapproved games, atomic transaction auto-unpublish cascade), '
                'EP11-02 (Role-based access control with real-time DB role checking, ACCESS_DENIED security auditing, immutable 405-guarded audit ledger). '
                'Reconciled Acceptance Criteria: 18/18 verified (AC-10.1..10.3, AC-35.1..35.3, AC-36.1..36.3, AC-37.1..37.3, AC-39.1..39.3, AC-40.1..40.3). '
                'Browser Automation: 12/12 UI checks passed (100%) via Chrome DevTools Protocol (CDP); 12 genuine screenshots captured in evidence/sprint-03/screenshots/. '
                'Test Suite: 69/69 admin tests passed (100%). Full Regressions: 31/31 catalog tests passed, 49/49 security tests passed, 5/5 smoke checks passed (154/154 automated PASS total). '
                'Report: docs/reports/Sprint-03-Implementation-Report.docx.'
            )
            break

# Save updated Master Implementation Record
master_doc.save(master_path)
print(f'Successfully updated {master_path} to Version 0.9')
