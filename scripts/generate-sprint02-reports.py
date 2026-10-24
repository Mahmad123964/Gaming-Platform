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
# 1. CREATE docs/reports/Sprint-02-Implementation-Report.docx
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
run_title = title_p.add_run('Sprint 02 Implementation Report — Game Catalog & Discovery')
run_title.font.name = 'Arial'
run_title.font.size = Pt(22)
run_title.font.bold = True
run_title.font.color.rgb = RGBColor(16, 24, 40)

sub_p = doc.add_paragraph()
sub_p.paragraph_format.space_after = Pt(16)
run_sub = sub_p.add_run('NexusPlay Online Gaming Platform • Sprint 02 Final QA & Closure Gate • Version 1.1 • Date: 2026-10-24')
run_sub.font.name = 'Arial'
run_sub.font.size = Pt(11)
run_sub.font.color.rgb = RGBColor(71, 84, 103)

# 1. Document Control & Metadata
doc.add_heading('1. Document Control & Metadata', level=2)
ctrl_table = doc.add_table(rows=8, cols=2)
ctrl_data = [
    ('Project Name', 'NexusPlay Online Gaming Platform'),
    ('Sprint Scope', 'Sprint 02: Game Catalog & Discovery (EP02-01, EP02-02, EP02-03, EP02-04)'),
    ('Implementation Baseline', 'React 19, TypeScript, Vite, Scoped CSS Modules, Node.js Express, SQLite DatabaseSync'),
    ('Sprint Status', 'COMPLETED & FULLY VERIFIED — FINAL QA GATE SATISFIED (100% PASS RATE)'),
    ('Target Environment', 'Staging (http://localhost:5050) & Automated Chrome CDP Browser Test Engine'),
    ('Automated Test Results', '31/31 Catalog Tests PASS (100%) | 49/49 Security Tests PASS | 5/5 Smoke Checks PASS'),
    ('Browser Verification Status', '13/13 Checks PASS (100%) via Chrome DevTools Protocol (CDP) • 11 Genuine Screenshots Captured'),
    ('Lead Roles', 'Principal QA Automation Engineer, Senior React Architect, Security Engineer, Documentation Lead')
]
for i, (k, v) in enumerate(ctrl_data):
    ctrl_table.rows[i].cells[0].paragraphs[0].text = k
    ctrl_table.rows[i].cells[0].paragraphs[0].runs[0].font.bold = True
    ctrl_table.rows[i].cells[1].paragraphs[0].text = v
style_table(ctrl_table)

# 2. Executive Summary
doc.add_heading('2. Executive Summary', level=2)
p_exec = doc.add_paragraph(
    'Sprint 02 delivered the complete Game Catalog & Discovery Engine for NexusPlay, satisfying all four approved user stories: '
    'EP02-01 (Browse published games), EP02-02 (Search games by title), EP02-03 (Filter games by category), and EP02-04 (View game details). '
    'The implementation strictly adheres to the approved Obsidian Arcade UI/UX design system specification, featuring responsive '
    'game cards with 16:9 cover artwork, debounced title search (300ms) with clear actions, horizontal category filter tabs, '
    'and an accessible modal view presenting comprehensive gameplay mode metadata, player capacity, computer opponent support, '
    'and access requirements (Free to Play vs Obsidian VIP).\n\n'
    'During the Final QA Gate, the recurring Playwright driver installation constraint was formally investigated and resolved: '
    'by leveraging locally installed Google Chrome via the native Chrome DevTools Protocol (CDP) WebSocket interface and software rasterizer '
    '(--headless=old --remote-debugging-port=9222), genuine end-to-end browser automation was achieved without unapproved dependency '
    'modifications. All 13 browser interaction checks passed (100%), and 11 authentic screenshots were captured and archived in '
    'evidence/sprint-02/screenshots/. All 31 backend/catalog automated tests, all 49 Sprint 01 authentication regression tests, and all 5 '
    'smoke checks passed with a 100% success rate.'
)

# 3. Requirements & Acceptance Criteria Verification
doc.add_heading('3. Requirements & Acceptance Criteria Traceability Matrix', level=2)
p_ac = doc.add_paragraph('Detailed verification results across all 4 approved Sprint 02 user stories and 12 acceptance criteria:')

ac_table = doc.add_table(rows=13, cols=5)
ac_headers = ['Story ID', 'Criteria ID', 'Requirement Summary', 'Test Identifier', 'Verification Result']
for j, h in enumerate(ac_headers):
    ac_table.rows[0].cells[j].paragraphs[0].text = h

ac_matrix = [
    ('EP02-01', 'AC-5.1', 'Published games listed upon opening catalog', 'CAT-BRW-01, CAT-BRW-04, CAT-BRW-05, UI-VER-01', 'PASS (100%)'),
    ('EP02-01', 'AC-5.2', 'Unpublished games strictly omitted from catalog', 'CAT-BRW-02, UI-VER-02', 'PASS (100%)'),
    ('EP02-01', 'AC-5.3', 'Empty-state message displayed when 0 games published', 'CAT-BRW-03', 'PASS (100%)'),
    ('EP02-02', 'AC-6.1', 'Matching game appears on exact/partial title search', 'CAT-SRC-01, CAT-SRC-02, CAT-SRC-05, UI-VER-03', 'PASS (100%)'),
    ('EP02-02', 'AC-6.2', 'No-results state displayed when no title matches', 'CAT-SRC-03, UI-VER-04', 'PASS (100%)'),
    ('EP02-02', 'AC-6.3', 'Unpublished draft game excluded from search matches', 'CAT-SRC-04', 'PASS (100%)'),
    ('EP02-03', 'AC-7.1', 'Category filter displays only matching published games', 'CAT-CAT-01, CAT-CAT-02, CAT-CAT-05, UI-VER-05', 'PASS (100%)'),
    ('EP02-03', 'AC-7.2', 'Category with 0 games displays no-results state', 'CAT-CAT-03, UI-VER-06', 'PASS (100%)'),
    ('EP02-03', 'AC-7.3', 'Clearing category filter restores unfiltered catalog', 'CAT-CAT-04, UI-VER-07', 'PASS (100%)'),
    ('EP02-04', 'AC-8.1', 'Game details modal displays mode & player specs', 'CAT-DET-01, CAT-DET-02, UI-VER-09', 'PASS (100%)'),
    ('EP02-04', 'AC-8.2', 'Premium requirement clearly visible before launch', 'CAT-DET-03, CAT-DET-04, UI-VER-11', 'PASS (100%)'),
    ('EP02-04', 'AC-8.3', 'Unavailable or unpublished game shows 404 state', 'CAT-DET-05, CAT-DET-06', 'PASS (100%)')
]

for i, row in enumerate(ac_matrix):
    for j, val in enumerate(row):
        ac_table.rows[i+1].cells[j].paragraphs[0].text = val
style_table(ac_table)

# 4. Content Data Classification & Intellectual Property Guardrails
doc.add_heading('4. Content Data Classification & Intellectual Property Guardrails', level=2)
p_data = doc.add_paragraph(
    'In accordance with platform licensing and legal guidelines, all seeded games and visual assets were audited and classified:\n\n'
    '1. Demonstration & Prototype Content (Zero Third-Party Copyright Claims):\n'
    '• Cyber Invaders (Arcade / Free): Platform-authored demonstration title; custom original SVG retro vector emblem.\n'
    '• Quantum Grid (Puzzle / Free): Platform-authored demonstration title; custom original SVG spatial logic emblem.\n'
    '• Obsidian Chess (Strategy / Free): Classical chess discipline with proprietary Obsidian Arcade styling and bot support.\n'
    '• Neon Horizon (Arcade / Obsidian VIP): Platform-authored demonstration title showcasing premium subscription gating.\n'
    '• Chrono Tactics (Strategy / Obsidian VIP): Platform-authored squad tactics concept demonstrating multiplayer metadata.\n'
    '• Vortex Arena (Action / Free): Platform-authored kinetic physics concept demonstrating 1–4 player multiplayer metadata.\n'
    '• Cipher Matrix (Puzzle / Free): Platform-authored deduction concept with procedural terminal typography.\n'
    '• Solitaire Royale (Card & Board / Free): Classical Klondike discipline with custom obsidian deck styling.\n'
    '• Shadow Protocol (Action / Unpublished Draft): Internal QA prototype used strictly to verify draft access restrictions.\n\n'
    '2. Licensing Disclosure: No demonstration game is advertised or distributed as a licensed commercial third-party product. '
    'Playable container runtime integrations and third-party commercial titles are scheduled for Phase 1 Sprint 03/04.'
)

# 5. Browser Automation Engine & Genuine Screenshot Evidence
doc.add_heading('5. Browser Automation Engine & Genuine Screenshot Evidence', level=2)
p_cdp = doc.add_paragraph(
    '5.1 Investigation and Resolution of Browser Automation Blocker:\n'
    '• Root Cause Analysis: Playwright was not installed in package.json dependencies, and internal IDE subagent routines '
    'attempted downloads from Microsoft Azure CDN which returned HTTP 404 (playwright-1.57.0-win32_x64.zip).\n'
    '• Remediation Strategy: Utilized locally installed Google Chrome (C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe). '
    'Executed Chrome with legacy headless software rasterization (--headless=old --remote-debugging-port=9222) and established a direct '
    'Chrome DevTools Protocol (CDP) WebSocket connection via Node.js.\n'
    '• React 19 Synthetic Event Support: Used Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set to properly '
    'trigger React synthetic onChange events during programmatic input entry.\n'
    '• Outcomes: 13/13 browser verification checks passed (100% success rate), and 11 authentic screenshots were captured.'
)

screen_table = doc.add_table(rows=12, cols=4)
screen_headers = ['Screenshot File', 'Check Identifier', 'Verification Target', 'File Size']
for j, h in enumerate(screen_headers):
    screen_table.rows[0].cells[j].paragraphs[0].text = h

screen_data = [
    ('01_catalog_grid_published_games.png', 'UI-VER-01, 02', 'Desktop 1440px: 8 published games visible; draft hidden', '365 KB'),
    ('02_catalog_search_partial.png', 'UI-VER-03', 'Debounced search for "grid": only Quantum Grid matches', '122 KB'),
    ('03_catalog_search_no_results.png', 'UI-VER-04', 'Search for "NonExistentZ9X": empty state box rendered', '95 KB'),
    ('04_catalog_category_filter_strategy.png', 'UI-VER-05', 'Category tab filter "Strategy": displays 2 matching games', '187 KB'),
    ('05_catalog_empty_category_simulation.png', 'UI-VER-06', 'Empty category filter "Simulation": clean empty state rendered', '104 KB'),
    ('06_catalog_filter_cleared.png', 'UI-VER-07', 'Filter reset action: full 8 published games restored', '370 KB'),
    ('07_catalog_sorted_reverse.png', 'UI-VER-08', 'Sort dropdown "Title Z-A": Vortex Arena positioned first', '372 KB'),
    ('08_game_details_modal_free.png', 'UI-VER-09', 'Modal for Obsidian Chess: 1-2 Players, Free to Play specs', '325 KB'),
    ('09_game_details_modal_premium_vip.png', 'UI-VER-11', 'Modal for Neon Horizon: prominent purple Obsidian VIP banner', '322 KB'),
    ('10_catalog_responsive_tablet_768px.png', 'UI-VER-12', 'Tablet viewport (768px width): two-column responsive reflow', '152 KB'),
    ('11_catalog_responsive_mobile_375px.png', 'UI-VER-13', 'Mobile viewport (375px width): single-column card stack', '55 KB')
]
for i, row in enumerate(screen_data):
    for j, val in enumerate(row):
        screen_table.rows[i+1].cells[j].paragraphs[0].text = val
style_table(screen_table)

# 6. Backend Quality & Security Verification
doc.add_heading('6. Backend Quality & Security Verification', level=2)
p_backend = doc.add_paragraph(
    'Backend catalog quality was evaluated across six key dimensions:\n'
    '1. Stable Pagination & Sorting: Verified that page boundaries accurately partition games without overlap (CAT-BRW-04), '
    'and that sort parameters (title:asc, title:desc, created_at:desc, players:desc) produce deterministic ordering (CAT-BRW-05).\n'
    '2. Parameter Boundary Clamping: Verified that out-of-range pagination inputs (e.g. page=-5, limit=9999) are safely clamped '
    'to page=1 and limit=50 without server degradation (CAT-SEC-03).\n'
    '3. Search & Filter Combinations: Verified that combined search and category filtering enforces strict AND logic (CAT-CAT-06).\n'
    '4. Unpublished Game Exclusion: Verified across three separate surfaces that unpublished titles cannot be discovered through '
    'catalog browsing (CAT-BRW-02), title search (CAT-SRC-04), or direct ID lookup (CAT-DET-05 returning HTTP 404).\n'
    '5. SQL Wildcard & Injection Sanitization: Verified that LIKE wildcard characters (%, _, \\) are escaped before SQL evaluation (CAT-SRC-06), '
    'and that SQL injection payloads (\' OR \'1\'=\'1) are safely parameterized and return zero matches (CAT-SEC-01).\n'
    '6. Error Responses: Verified that non-existent or invalid game identifiers return clean HTTP 404 Not Found responses with standard error payloads (CAT-DET-06).'
)

# 7. Regression Testing Summary
doc.add_heading('7. Regression Testing Summary', level=2)
p_reg = doc.add_paragraph(
    'All platform verification suites were executed against the running staging deployment and isolated test runners. '
    'Zero regressions were detected across the entire application stack.'
)

reg_table = doc.add_table(rows=6, cols=4)
reg_headers = ['Verification Suite', 'Target Scope', 'Pass / Total', 'Overall Status']
for j, h in enumerate(reg_headers):
    reg_table.rows[0].cells[j].paragraphs[0].text = h

reg_data = [
    ('Sprint 02 Browser CDP Suite', '12 UI Interaction Requirements + Viewports', '13 / 13', '100% PASS'),
    ('Sprint 02 Catalog Suite', 'EP02-01 to EP02-04, Security, Regressions', '31 / 31', '100% PASS'),
    ('Sprint 01 Authentication Suite', 'HttpOnly Cookies, CSRF, Rate Limiting, Cascade', '49 / 49', '100% PASS'),
    ('Sprint 00 Smoke Test Suite', 'Health, DB, Metadata, UI Shell, WebSockets', '5 / 5', '100% PASS'),
    ('React 19 Production Build', 'Vite Bundle, TypeScript Strict Check', '0 Errors (993ms)', 'SUCCESS')
]
for i, row in enumerate(reg_data):
    for j, val in enumerate(row):
        reg_table.rows[i+1].cells[j].paragraphs[0].text = val
style_table(reg_table)

# 8. Files Changed Register & Evidence Links
doc.add_heading('8. Files Changed Register & Evidence Links', level=2)
p_files = doc.add_paragraph(
    '• server/src/modules/catalog/catalogService.js: Core GameCatalogService with published filtering, search, and category taxonomy.\n'
    '• server/src/modules/catalog/routes.js: Express REST endpoints for games, categories, and game details.\n'
    '• server/src/modules/catalog/index.js: Module exports.\n'
    '• server/src/app.js: Mounted catalog routes and updated platform status metadata to Sprint 02.\n'
    '• client/src/types/catalog.ts: TypeScript interface definitions for Game, Category, Mode, and Access.\n'
    '• client/src/components/catalog/GameCard.tsx & .module.css: Obsidian Arcade game card with cover art, badges, and shimmer skeleton.\n'
    '• client/src/components/catalog/GameDetailsModal.tsx & .module.css: Modal view with specs grid, VIP warning, and unavailable 404 state.\n'
    '• client/src/components/catalog/GameCatalog.tsx & .module.css: Catalog container, debounced search, category tabs, and empty states.\n'
    '• client/src/components/RoadmapGrid.tsx: Updated roadmap cards reflecting Sprint 01 verified and Sprint 02 current.\n'
    '• client/src/App.tsx: Rendered GameCatalog in main layout and updated active sprint metadata.\n'
    '• docs/api/catalog-api.md: Version 1.0.0 Catalog API specification with data classification and CDP verification.\n'
    '• scripts/verify-sprint02-browser.js: Standalone CDP browser QA automation engine (13/13 passing).\n'
    '• scripts/test-sprint02-catalog.js: Standalone automated verification runner (31/31 passing).\n'
    '• evidence/sprint-02/screenshots/: 11 genuine PNG screenshots captured during browser execution.\n'
    '• evidence/sprint-02/test-results/: Authoritative JSON test evidence archives.'
)

# Save Sprint 02 Implementation Report
report_path = os.path.join('docs', 'reports', 'Sprint-02-Implementation-Report.docx')
doc.save(report_path)
print(f'Successfully created {report_path}')

# ==============================================================================
# 2. UPDATE docs/reports/MASTER-Implementation-Record.docx TO VERSION 0.8
# ==============================================================================
master_path = os.path.join('docs', 'reports', 'MASTER-Implementation-Record.docx')
master_doc = docx.Document(master_path)

# Update Document Control (Table 0)
t0 = master_doc.tables[0]
for row in t0.rows:
    if 'Sprint' in row.cells[0].text:
        row.cells[1].text = 'Sprint 02: Game Catalog & Discovery (EP02-01, EP02-02, EP02-03, EP02-04) — Fully Verified'
    elif 'Version' in row.cells[0].text:
        row.cells[1].text = '0.8'

# Update Version History (Table 1)
t1 = master_doc.tables[1]
found_v08 = False
for row in t1.rows:
    if row.cells[0].text.strip() == '0.8':
        row.cells[1].text = '2026-10-24'
        row.cells[2].text = (
            'Sprint 02 Completion & Final QA Gate: Implemented Game Catalog & Discovery Engine covering EP02-01, EP02-02, EP02-03, and EP02-04. '
            'Delivered GameCatalogService backend with SQLite DatabaseSync, published-game gating, wildcard/injection sanitization, '
            'and category taxonomy. Built Obsidian Arcade React 19 frontend components (GameCard, GameCatalog, GameDetailsModal) '
            'with debounced title search, category filter tabs, mode/access specification grid, and empty/error states. '
            'Resolved browser automation blocker via Chrome DevTools Protocol (CDP) WebSocket engine; verified 13/13 browser UI checks '
            'passing with 11 genuine screenshots captured in evidence/sprint-02/screenshots/. Verified 31/31 automated Sprint 02 catalog tests passing (100%), '
            '49/49 Sprint 01 regression tests passing, and 5/5 smoke tests passing.'
        )
        row.cells[3].text = 'docs/reports/Sprint-02-Implementation-Report.docx'
        found_v08 = True
        break

if not found_v08:
    new_row = t1.add_row()
    new_row.cells[0].paragraphs[0].text = '0.8'
    new_row.cells[1].paragraphs[0].text = '2026-10-24'
    new_row.cells[2].paragraphs[0].text = (
        'Sprint 02 Completion & Final QA Gate: Implemented Game Catalog & Discovery Engine covering EP02-01, EP02-02, EP02-03, and EP02-04. '
        'Delivered GameCatalogService backend with SQLite DatabaseSync, published-game gating, wildcard/injection sanitization, '
        'and category taxonomy. Built Obsidian Arcade React 19 frontend components (GameCard, GameCatalog, GameDetailsModal) '
        'with debounced title search, category filter tabs, mode/access specification grid, and empty/error states. '
        'Resolved browser automation blocker via Chrome DevTools Protocol (CDP) WebSocket engine; verified 13/13 browser UI checks '
        'passing with 11 genuine screenshots captured in evidence/sprint-02/screenshots/. Verified 31/31 automated Sprint 02 catalog tests passing (100%), '
        '49/49 Sprint 01 regression tests passing, and 5/5 smoke tests passing.'
    )
    new_row.cells[3].paragraphs[0].text = 'docs/reports/Sprint-02-Implementation-Report.docx'

# Update Sprint Tracking (Table 2)
t2 = master_doc.tables[2]
for row in t2.rows:
    sprint_cell = row.cells[0].text.strip()
    if sprint_cell == '01':
        row.cells[2].text = 'Completed / Fully Verified'
        row.cells[3].text = 'evidence/sprint-01/'
        row.cells[4].text = 'Verified / Closed'
    elif sprint_cell == '02':
        row.cells[2].text = 'Completed / Fully Verified'
        row.cells[3].text = 'evidence/sprint-02/'
        row.cells[4].text = 'Pending PO Approval'

# Update Section 4: Sprint Roadmap & Progress
for idx, p in enumerate(master_doc.paragraphs):
    if 'sprint 02: discovery' in p.text.lower() or 'sprint 02: game' in p.text.lower():
        if idx + 1 < len(master_doc.paragraphs):
            master_doc.paragraphs[idx + 1].text = (
                'Status: COMPLETED & FULLY VERIFIED (2026-10-24). '
                'Delivered: EP02-01 (Browse published catalog, unpublished game exclusion, empty state handling, pagination boundaries), '
                'EP02-02 (Title search, case-insensitive substring matching, no-results state, draft exclusion, wildcard sanitization), '
                'EP02-03 (Category filtering, published game count taxonomy, empty category state, filter clear action), '
                'EP02-04 (Game details modal, gameplay mode, player capacity, bot opponent support, prominent Obsidian VIP requirement). '
                'Browser Automation: 13/13 UI checks passed (100%) via Chrome DevTools Protocol (CDP); 11 genuine screenshots captured in evidence/sprint-02/screenshots/. '
                'Test Suite: 31/31 catalog tests passed (100%). Regression Suites: 49/49 Sprint 01 security tests passed, 5/5 smoke checks passed. '
                'Report: docs/reports/Sprint-02-Implementation-Report.docx.'
            )
            break

# Save updated Master Implementation Record
master_doc.save(master_path)
print(f'Successfully updated {master_path} to Version 0.8')
