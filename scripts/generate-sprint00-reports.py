import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import os

# -------------------------------------------------------------
# 1. GENERATE docs/reports/Sprint-00-Implementation-Report.docx
# -------------------------------------------------------------
doc = docx.Document()

for section in doc.sections:
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

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

# Title
title_p = doc.add_paragraph()
title_p.paragraph_format.space_before = Pt(0)
title_p.paragraph_format.space_after = Pt(4)
run_title = title_p.add_run('Sprint 00 Implementation Report')
run_title.font.name = 'Arial'
run_title.font.size = Pt(22)
run_title.font.bold = True
run_title.font.color.rgb = RGBColor(16, 24, 40)

sub_p = doc.add_paragraph()
sub_p.paragraph_format.space_after = Pt(16)
run_sub = sub_p.add_run('Online Gaming Platform • Phase 1 Foundation • Date: 2026-10-24')
run_sub.font.name = 'Arial'
run_sub.font.size = Pt(11)
run_sub.font.color.rgb = RGBColor(71, 84, 103)

# 1. Document Control
doc.add_heading('1. Document Control & Metadata', level=2)
ctrl_table = doc.add_table(rows=8, cols=2)
ctrl_data = [
    ('Project', 'Online Gaming Platform (NexusPlay)'),
    ('Sprint', 'Sprint 00: Project Foundation & Staging Pipeline'),
    ('Phase', 'Phase 1: Foundation & Core MVP'),
    ('Date / Time', '2026-10-24 14:45 UTC+5'),
    ('Git Branch & Commit', 'master @ 0cbf7cbde7607ee5cac8db1a949784bf4decc25d'),
    ('Author / Role', 'Google Antigravity Lead Agent (Software Architect & SRE Lead)'),
    ('Environment', 'Local Staging Environment (Node.js v22.16.0 / Windows x64)'),
    ('Deliverable Status', 'COMPLETED / READY FOR SIGN-OFF')
]
for i, (k, v) in enumerate(ctrl_data):
    ctrl_table.rows[i].cells[0].paragraphs[0].add_run(k).bold = True
    ctrl_table.rows[i].cells[1].paragraphs[0].add_run(v)
style_table(ctrl_table)

# 2. Executive Outcome
doc.add_heading('2. Executive Outcome', level=2)
p_exec = doc.add_paragraph(
    'Sprint 00 has fully achieved all planned foundation objectives for Phase 1. The repository was initialized, '
    'the architecture and technology stack were selected and formalized via ADR-0001 (Node.js v22 LTS, Express, '
    'WebSockets, node:sqlite, and a custom Vanilla CSS design system). The core relational database schema with '
    '12 domain entities was implemented and verified. A fully automated staging deployment pipeline (scripts/deploy-staging.js) '
    'and multi-stage automated smoke test suite (scripts/smoke-test.js) were developed, successfully executed, and validated '
    'across both positive and negative failure injection paths, satisfying story EP13-01 in its entirety.'
)

# 3. Acceptance Criteria Verification Matrix
doc.add_heading('3. Acceptance Criteria Verification Matrix (EP13-01)', level=2)
ac_table = doc.add_table(rows=4, cols=5)
ac_table.rows[0].cells[0].paragraphs[0].add_run('AC ID')
ac_table.rows[0].cells[1].paragraphs[0].add_run('Requirement Description')
ac_table.rows[0].cells[2].paragraphs[0].add_run('Method / Test')
ac_table.rows[0].cells[3].paragraphs[0].add_run('Result')
ac_table.rows[0].cells[4].paragraphs[0].add_run('Status')

ac_rows = [
    ('AC-45.1', 'Given an approved change is ready for staging, When the staging deployment is triggered, Then the change is deployed and an automated smoke test runs.', 'node scripts/deploy-staging.js triggers staging server spawn and executes 5-check smoke suite.', 'Deployed on port 5050; 5/5 checks executed in 1481ms.', 'PASSED'),
    ('AC-45.2', 'Given a smoke test fails, When the pipeline evaluates the result, Then the staging release is marked unsuccessful.', 'node scripts/deploy-staging.js --simulate-failure injects probe timeout into SMOKE-02.', 'Pipeline evaluated failure, logged error, marked release as FAILED in DB and JSON artifact, exited code 1.', 'PASSED'),
    ('AC-45.3', 'Given all required staging smoke checks pass, When the pipeline completes, Then the release result is recorded as successful.', 'Standard pipeline execution against healthy staging instance.', 'Release marked SUCCESS, written to deployments table (ID dep-1792835050394) and staging-release.json, exited code 0.', 'PASSED')
]
for i, r in enumerate(ac_rows, start=1):
    for j, val in enumerate(r):
        p = ac_table.rows[i].cells[j].paragraphs[0]
        run = p.add_run(val)
        if j == 4:
            run.bold = True
            run.font.color.rgb = RGBColor(0, 150, 60)
style_table(ac_table)

# 4. Change Register
doc.add_heading('4. Change Register & File Inventory', level=2)
chg_table = doc.add_table(rows=9, cols=3)
chg_table.rows[0].cells[0].paragraphs[0].add_run('File Path')
chg_table.rows[0].cells[1].paragraphs[0].add_run('Component')
chg_table.rows[0].cells[2].paragraphs[0].add_run('Rationale & Description')

chg_rows = [
    ('docs/decisions/ADR-0001-technology-stack.md', 'Architecture', 'Formal decision record selecting Node.js, Express, WebSockets, SQLite, and Vanilla CSS.'),
    ('package.json', 'Configuration', 'Project manifest, staging start and smoke test npm scripts, dependencies (express, ws).'),
    ('server/src/db/schema.sql', 'Persistence', 'Relational schema covering all 12 domain tables from UML architecture model.'),
    ('server/src/db/index.js', 'Persistence', 'Database manager with node:sqlite, table migration, and health probe.'),
    ('server/src/app.js', 'API Gateway', 'Express application with CORS, request logging, /health, /api/health, /api/v1/status.'),
    ('server/src/index.js', 'Core Server', 'Server entrypoint with HTTP and WebSocket /ws server and graceful shutdown.'),
    ('public/ (index.html, style.css, main.js)', 'Frontend UI', 'High-end dark mode gaming portal shell with SRE telemetry dashboard and live probe.'),
    ('scripts/ (deploy-staging.js, smoke-test.js)', 'CI/CD Pipeline', 'Automated staging pipeline and automated 5-check smoke suite fulfilling EP13-01.')
]
for i, r in enumerate(chg_rows, start=1):
    for j, val in enumerate(r):
        chg_table.rows[i].cells[j].paragraphs[0].add_run(val)
style_table(chg_table)

# 5. Testing & Verification Evidence
doc.add_heading('5. Testing & Verification Evidence', level=2)
doc.add_paragraph(
    'Verification was performed by executing genuine commands against the live staging instance. '
    'Real logs, timestamps, exit codes, and test result files were captured.'
)
test_table = doc.add_table(rows=3, cols=5)
test_table.rows[0].cells[0].paragraphs[0].add_run('Execution Scenario')
test_table.rows[0].cells[1].paragraphs[0].add_run('Command Executed')
test_table.rows[0].cells[2].paragraphs[0].add_run('Observed Exit')
test_table.rows[0].cells[3].paragraphs[0].add_run('Checks Passed')
test_table.rows[0].cells[4].paragraphs[0].add_run('Artifact File')

test_data = [
    ('Positive Staging Release', 'node scripts/deploy-staging.js', 'Code 0', '5 / 5 Passed', 'evidence/sprint-00/staging-release.json'),
    ('Negative Failure Injection', 'node scripts/deploy-staging.js --simulate-failure', 'Code 1', '1 Failed, Aborted', 'evidence/sprint-00/test-results/smoke-test-simulated-fail-*.json')
]
for i, r in enumerate(test_data, start=1):
    for j, val in enumerate(r):
        test_table.rows[i].cells[j].paragraphs[0].add_run(val)
style_table(test_table)

doc.add_paragraph('Visual Screenshots Note: NOT CAPTURED (Playwright driver download returned 404 from upstream CDN during automated browser subagent initialization). UI shell and telemetry interactivity verified via HTTP / Static Asset probe and live server testing.')

# 6. Operations & SRE Controls
doc.add_heading('6. Operations & SRE Controls', level=2)
p_ops = doc.add_paragraph()
p_ops.add_run('• Health Probes: ').bold = True
p_ops.add_run('Liveness probe at /health (HTTP 200, status=UP); Readiness probe at /api/health (DB connectivity, memory RSS, environment).\n')
p_ops.add_run('• Audit Ledger: ').bold = True
p_ops.add_run('Every staging deployment is recorded into the SQLite deployments table with commit SHA, duration, and test summary.\n')
p_ops.add_run('• Rollback Guidance: ').bold = True
p_ops.add_run('Staging server uses isolated process management; pipeline aborts without promoting broken builds (AC-45.2).')

# 7. Gate & Approval
doc.add_heading('7. Sprint 00 Completion Gate & Sign-Off', level=2)
doc.add_paragraph('All acceptance criteria for EP13-01 have passed verification. Sprint 01 remains locked pending explicit Product Owner approval.')

sign_table = doc.add_table(rows=3, cols=3)
sign_table.rows[0].cells[0].paragraphs[0].add_run('Role')
sign_table.rows[0].cells[1].paragraphs[0].add_run('Approver')
sign_table.rows[0].cells[2].paragraphs[0].add_run('Decision / Date')
sign_table.rows[1].cells[0].paragraphs[0].add_run('Lead Architect & SRE Agent')
sign_table.rows[1].cells[1].paragraphs[0].add_run('Google Antigravity Lead Agent')
sign_table.rows[1].cells[2].paragraphs[0].add_run('VERIFIED & SUBMITTED / 2026-10-24')
sign_table.rows[2].cells[0].paragraphs[0].add_run('Product Owner')
sign_table.rows[2].cells[1].paragraphs[0].add_run('[PRODUCT_OWNER]')
sign_table.rows[2].cells[2].paragraphs[0].add_run('PENDING USER APPROVAL')
style_table(sign_table)

report_path = os.path.join('docs', 'reports', 'Sprint-00-Implementation-Report.docx')
doc.save(report_path)
print(f'Successfully generated {report_path}')

# -------------------------------------------------------------
# 2. UPDATE docs/reports/MASTER-Implementation-Record.docx
# -------------------------------------------------------------
master_path = os.path.join('docs', 'reports', 'MASTER-Implementation-Record.docx')
master_doc = docx.Document(master_path)

# Update Version History Table (Table 1)
t1 = master_doc.tables[1]
new_row = t1.add_row()
new_row.cells[0].paragraphs[0].text = '0.2'
new_row.cells[1].paragraphs[0].text = '2026-10-24'
new_row.cells[2].paragraphs[0].text = 'Sprint 00 completed: Foundation, ADR-0001, SQLite schema v1.0, staging deploy pipeline & smoke test suite (EP13-01)'
new_row.cells[3].paragraphs[0].text = 'docs/reports/Sprint-00-Implementation-Report.docx'

# Update Sprint Tracking Table (Table 2) - Sprint 00 row
t2 = master_doc.tables[2]
row_00 = t2.rows[1]
row_00.cells[2].paragraphs[0].text = 'Completed / Verified'
row_00.cells[3].paragraphs[0].text = 'evidence/sprint-00/'
row_00.cells[4].paragraphs[0].text = 'Pending PO Approval'

# Update Sprint 00 text in body
for idx, p in enumerate(master_doc.paragraphs):
    if 'Sprint 00: project foundation' in p.text:
        if idx + 1 < len(master_doc.paragraphs):
            next_p = master_doc.paragraphs[idx + 1]
            next_p.text = (
                'Status: COMPLETED / VERIFIED (2026-10-24). '
                'Delivered: ADR-0001 technology stack, SQLite schema (12 tables), Express API server with SRE health checks (/health, /api/health, /api/v1/status), '
                'WebSocket server (/ws), frontend dark-mode gaming portal shell (public/), staging deployment pipeline (scripts/deploy-staging.js), '
                'and automated smoke test suite (scripts/smoke-test.js). Verified EP13-01 (AC-45.1, AC-45.2, AC-45.3 passed). '
                'Report: docs/reports/Sprint-00-Implementation-Report.docx. Git commit: 0cbf7cb.'
            )
            break

# Append ADR to section 6
for p in master_doc.paragraphs:
    if '[ADR LOG' in p.text:
        p.text = 'ADR-0001 (Accepted): Technology Stack & Delivery Model (Node.js v22, Express, WebSockets, node:sqlite, Vanilla CSS design system, Automated Staging Pipeline).'
        break

master_doc.save(master_path)
print(f'Successfully updated {master_path}')
