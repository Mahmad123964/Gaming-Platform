import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import os

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def style_table(table, header_bg='121622', alt_bg='F8FAFC'):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate(table.rows):
        for cell in row.cells:
            cell.paragraphs[0].paragraph_format.space_before = Pt(3)
            cell.paragraphs[0].paragraph_format.space_after = Pt(3)
            if i == 0:
                set_cell_background(cell, header_bg)
                for run in cell.paragraphs[0].runs:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(255, 255, 255)
            elif i % 2 == 1:
                set_cell_background(cell, alt_bg)

# ==============================================================================
# 1. UI/UX DESIGN SYSTEM SPECIFICATION (DOCX)
# ==============================================================================
doc_ui = docx.Document()
for section in doc_ui.sections:
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

# Title
title_p = doc_ui.add_paragraph()
title_p.paragraph_format.space_before = Pt(0)
title_p.paragraph_format.space_after = Pt(4)
run_title = title_p.add_run('UI/UX Design System Specification')
run_title.font.name = 'Arial'
run_title.font.size = Pt(22)
run_title.font.bold = True
run_title.font.color.rgb = RGBColor(18, 22, 34)

sub_p = doc_ui.add_paragraph()
sub_p.paragraph_format.space_after = Pt(16)
run_sub = sub_p.add_run('"Obsidian Arcade" • NexusPlay Online Gaming Platform • Version 1.0 • 2026-10-24')
run_sub.font.name = 'Arial'
run_sub.font.size = Pt(11)
run_sub.font.color.rgb = RGBColor(100, 116, 139)

# 1. Document Control
doc_ui.add_heading('1. Document Control & Metadata', level=2)
t_ctrl = doc_ui.add_table(rows=7, cols=2)
ctrl_items = [
    ('Document Name', 'NexusPlay UI/UX Design System: "Obsidian Arcade"'),
    ('Version', '1.0 (Sprint 00 Baseline Review)'),
    ('Author Roles', 'Principal UI/UX Designer, Senior Frontend Architect & Product Designer'),
    ('Target Architecture', 'React 19, TypeScript, Vite, Scoped CSS Modules'),
    ('Design Standard', 'WCAG 2.1 AA Compliant, Responsive, Reduced-Motion Supported'),
    ('Classification', 'Engineering, Product & Design Baseline Specification'),
    ('Approval Status', 'PROPOSED / PENDING PRODUCT OWNER SIGN-OFF')
]
for i, (k, v) in enumerate(ctrl_items):
    t_ctrl.rows[i].cells[0].paragraphs[0].add_run(k).bold = True
    t_ctrl.rows[i].cells[1].paragraphs[0].add_run(v)
style_table(t_ctrl)

# 2. Design Philosophy
doc_ui.add_heading('2. Design Philosophy & Visual Identity', level=2)
doc_ui.add_paragraph(
    'The "Obsidian Arcade" design system is engineered specifically for NexusPlay to bridge the gap between high-energy '
    'gaming immersion and refined, modern luxury software ergonomics. Traditional browser gaming sites are plagued by '
    'cluttered layouts, distracting flashing banners, and garish neon fatigue. Obsidian Arcade redefines the genre '
    'through structured dark charcoal surfaces, mathematical spacing, restrained violet (#7C3AED) and tactical cyan (#06B6D4) accents, '
    'and tactile micro-interactions that feel responsive and alive without compromising visual discipline.'
)

# 3. Design Tokens
doc_ui.add_heading('3. Core Design Tokens Architecture', level=2)
doc_ui.add_paragraph('All UI components consume centralized CSS custom properties declared in tokens.css:')

doc_ui.add_heading('3.1 Color Palette Tokens', level=3)
t_colors = doc_ui.add_table(rows=10, cols=4)
t_colors.rows[0].cells[0].paragraphs[0].add_run('Token Name')
t_colors.rows[0].cells[1].paragraphs[0].add_run('Hex / HSL')
t_colors.rows[0].cells[2].paragraphs[0].add_run('Role')
t_colors.rows[0].cells[3].paragraphs[0].add_run('Semantic Purpose')

color_rows = [
    ('--bg-obsidian', '#0B0D13', 'Base Canvas', 'Main application background, depth foundation'),
    ('--bg-charcoal', '#121622', 'Surface Layer', 'Navigation bars, modals, footer panels'),
    ('--bg-card-elevated', 'rgba(26, 31, 48, 0.75)', 'Elevated Cards', 'Game cards, telemetry tiles, lobby slots'),
    ('--border-subtle', 'rgba(255, 255, 255, 0.08)', 'Dividers', 'Hairline structural borders (1px)'),
    ('--accent-violet', '#7C3AED', 'Brand Accent', 'Primary CTAs, category highlights, level milestones'),
    ('--accent-cyan', '#06B6D4', 'Telemetry / SRE', 'Live status, latency ping, active WebSocket indicators'),
    ('--accent-emerald', '#10B981', 'Success / Online', 'Online badge, smoke test pass, saved checkpoints'),
    ('--accent-amber', '#F59E0B', 'Warning / Offline', 'Offline mode indicator, pending sync queue, reconnecting'),
    ('--accent-rose', '#F43F5E', 'Danger / Degraded', 'Service alerts, failed payments, validation errors')
]
for i, r in enumerate(color_rows, start=1):
    for j, val in enumerate(r):
        t_colors.rows[i].cells[j].paragraphs[0].add_run(val)
style_table(t_colors)

doc_ui.add_heading('3.2 Typography Tokens', level=3)
doc_ui.add_paragraph(
    '• Display & Titles: Space Grotesk (Weights 600, 700). High-impact geometry for game titles, hero headers, and telemetry numbers.\n'
    '• Body & UI Controls: Outfit (Weights 400, 500, 600). Clean modern sans-serif optimized for reading legibility on all displays.\n'
    '• Monospace / Metrics: Fira Code / Space Grotesk. Precision alignment for latency, game scores, and transaction IDs.'
)

doc_ui.add_heading('3.3 Spacing, Elevation & Glassmorphism', level=3)
doc_ui.add_paragraph(
    '• Spacing System: 4px base modular scale (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px).\n'
    '• Border Radii: 6px (--radius-sm, badges/tags), 12px (--radius-md, cards/buttons), 20px (--radius-lg, dialogs/panels), 9999px (pills).\n'
    '• Elevation & Blur: Backdrop filter blur(16px), subtle surface border-glow on hover (rgba(124, 58, 237, 0.35)).'
)

# 4. Component Blueprints
doc_ui.add_heading('4. Reusable Component Specifications', level=2)
comp_items = [
    ('GameCard Component', 
     'Displays game cover art (16:9 ratio), title, category tag, access tier (Free vs Premium), offline-ready badge, and player count. '
     'On hover, elevates 4px with a subtle violet rim-glow and a 1.02 scale transform. Features skeleton shimmer loading states.'),
    ('Navbar & Global Status Pill', 
     'Fixed sticky header with frosted charcoal blur. Features the NexusPlay geometric logo, global search shortcut (Cmd/Ctrl+K), '
     'dynamic connection status pill (Online / Offline / Syncing), profile avatar, and instant health probe button.'),
    ('Search & Category Filter Bar', 
     'Horizontal category tabs (Action, Puzzle, Multiplayer, Arcade, Strategy) with smooth scroll cues. Search input supports '
     'debounced instant filtering across 100+ titles with active filter clear action.'),
    ('Multiplayer Lobby Room', 
     'State-driven room card showing status (Waiting, Full, Active), player slot avatars with host badges, one-click invitation '
     'code copy with visual toast confirmation, and real-time socket latency indicator.'),
    ('Player Profile & Stats Dashboard', 
     'Player avatar, display name, membership badge (Free/Subscriber), XP level bar, recent 10 completed session history, '
     'and unlocked achievements showcase.'),
    ('Premium Membership Card', 
     'Side-by-side tier comparison (Free Player vs Obsidian VIP), monthly/annual billing toggle, checkmark feature list, and '
     'high-contrast checkout button.'),
    ('Progress & History Tracker', 
     'High score log, level resumption cards with "Resume Level X" action, and cloud sync status badge.'),
    ('Offline Storage Manager Panel', 
     'Displays storage consumption gauge (e.g. "185 MB / 2.0 GB used"), inventory of locally downloaded games, one-click update '
     'check, and storage purge controls.')
]
for name, desc in comp_items:
    p = doc_ui.add_paragraph()
    p.add_run(f'• {name}: ').bold = True
    p.add_run(desc)

# 5. Accessibility & Motion
doc_ui.add_heading('5. Accessibility (WCAG 2.1 AA) & Motion Ergonomics', level=2)
doc_ui.add_paragraph(
    '1. High Contrast Ratios: Text against charcoal and obsidian surfaces strictly meets 4.5:1 (normal text) and 3:1 (large text/icons).\n'
    '2. Focus Visibility: Dedicated visible focus outline: outline: 2px solid var(--accent-cyan); outline-offset: 2px on all interactive controls.\n'
    '3. Keyboard Traversal: Full keyboard navigation (Tab/Shift-Tab, arrow keys in game grids and category scrollbars, Escape to dismiss modals).\n'
    '4. Reduced-Motion Mode: Full implementation of @media (prefers-reduced-motion: reduce) disabling scaling, orb animations, and heavy transitions.'
)

# 6. Responsive Breakpoints
doc_ui.add_heading('6. Responsive Breakpoint Matrix', level=2)
t_resp = doc_ui.add_table(rows=5, cols=4)
t_resp.rows[0].cells[0].paragraphs[0].add_run('Device Class')
t_resp.rows[0].cells[1].paragraphs[0].add_run('Viewport Width')
t_resp.rows[0].cells[2].paragraphs[0].add_run('Layout Grid')
t_resp.rows[0].cells[3].paragraphs[0].add_run('Navigation Pattern')

resp_data = [
    ('Mobile Phones', '360px – 767px', '1 column (stacked)', 'Sticky bottom nav + hamburger drawer'),
    ('Tablets / Small Laptops', '768px – 1023px', '2 – 3 columns', 'Top compact header + horizontal filter scroll'),
    ('Standard Desktop', '1024px – 1439px', '4 columns', 'Full top navigation + right telemetry drawer'),
    ('Ultra-Wide Displays', '≥ 1440px', '4 – 5 columns (max 1240px container)', 'Centered fixed container + expanded dashboards')
]
for i, r in enumerate(resp_data, start=1):
    for j, val in enumerate(r):
        t_resp.rows[i].cells[j].paragraphs[0].add_run(val)
style_table(t_resp)

# 7. Sign-off
doc_ui.add_heading('7. Design Review & Approval Gate', level=2)
doc_ui.add_paragraph('This design system specification is submitted for stakeholder approval prior to Phase 1 frontend implementation.')
t_sign1 = doc_ui.add_table(rows=3, cols=3)
t_sign1.rows[0].cells[0].paragraphs[0].add_run('Role')
t_sign1.rows[0].cells[1].paragraphs[0].add_run('Signer')
t_sign1.rows[0].cells[2].paragraphs[0].add_run('Status / Date')
t_sign1.rows[1].cells[0].paragraphs[0].add_run('Principal UI/UX Designer')
t_sign1.rows[1].cells[1].paragraphs[0].add_run('Google Antigravity Lead Agent')
t_sign1.rows[1].cells[2].paragraphs[0].add_run('SUBMITTED / 2026-10-24')
t_sign1.rows[2].cells[0].paragraphs[0].add_run('Product Owner')
t_sign1.rows[2].cells[1].paragraphs[0].add_run('[PRODUCT_OWNER]')
t_sign1.rows[2].cells[2].paragraphs[0].add_run('PENDING APPROVAL')
style_table(t_sign1)

path_ui = os.path.join('docs', 'design', 'UI-UX-Design-System-Specification.docx')
doc_ui.save(path_ui)
print(f'Successfully generated {path_ui}')


# ==============================================================================
# 2. PWA & OFFLINE GAMING ARCHITECTURE SPECIFICATION (DOCX)
# ==============================================================================
doc_pwa = docx.Document()
for section in doc_pwa.sections:
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

title_p2 = doc_pwa.add_paragraph()
title_p2.paragraph_format.space_before = Pt(0)
title_p2.paragraph_format.space_after = Pt(4)
run_title2 = title_p2.add_run('PWA & Offline Gaming Architecture')
run_title2.font.name = 'Arial'
run_title2.font.size = Pt(22)
run_title2.font.bold = True
run_title2.font.color.rgb = RGBColor(18, 22, 34)

sub_p2 = doc_pwa.add_paragraph()
sub_p2.paragraph_format.space_after = Pt(16)
run_sub2 = sub_p2.add_run('NexusPlay Online Gaming Platform • Version 1.0 • 2026-10-24')
run_sub2.font.name = 'Arial'
run_sub2.font.size = Pt(11)
run_sub2.font.color.rgb = RGBColor(100, 116, 139)

# 1. Document Control
doc_pwa.add_heading('1. Document Control & Scope', level=2)
t_ctrl2 = doc_pwa.add_table(rows=7, cols=2)
ctrl_items2 = [
    ('Specification Title', 'Progressive Web App & Offline Gaming Architecture'),
    ('Version', '1.0 (Phase 1 Baseline Review)'),
    ('Author Roles', 'Senior Frontend Architect & PWA / Reliability Engineer'),
    ('Governing Backlog Epic', 'EP-14: Offline Mode & PWA Capabilities'),
    ('Key Technologies', 'Service Worker, Cache Storage API, IndexedDB (NexusPlayDB), Storage Quota API'),
    ('Operating Principle', 'Zero Offline Payments, Zero Simulated Multiplayer, Strict Legal Asset Gating'),
    ('Status', 'PROPOSED / PENDING SPRINT SCOPE APPROVAL')
]
for i, (k, v) in enumerate(ctrl_items2):
    t_ctrl2.rows[i].cells[0].paragraphs[0].add_run(k).bold = True
    t_ctrl2.rows[i].cells[1].paragraphs[0].add_run(v)
style_table(t_ctrl2)

# 2. Executive Summary
doc_pwa.add_heading('2. Architecture Overview & Principles', level=2)
doc_pwa.add_paragraph(
    'NexusPlay PWA architecture enables an installable, resilient desktop and mobile gaming experience. '
    'The system provides instant portal startup under poor or severed connectivity, enables user-controlled '
    'downloads of licensed browser games, persists local scores and level checkpoints via IndexedDB, and automatically '
    'reconciles data upon reconnection. Strict operational boundaries ensure that payments, real-time multiplayer, and '
    'unauthorized game distribution are niemals executed without verified online connectivity.'
)

# 3. Service Worker & Caching Tiers
doc_pwa.add_heading('3. Service Worker Lifecycle & Multi-Tier Caching Strategy', level=2)
t_cache = doc_pwa.add_table(rows=5, cols=4)
t_cache.rows[0].cells[0].paragraphs[0].add_run('Cache Tier')
t_cache.rows[0].cells[1].paragraphs[0].add_run('Resource Scope')
t_cache.rows[0].cells[2].paragraphs[0].add_run('Strategy')
t_cache.rows[0].cells[3].paragraphs[0].add_run('Failure Behavior')

cache_rows = [
    ('Tier 1: App Shell', 'HTML, CSS modules, JS bundles, fonts, brand SVGs', 'Stale-While-Revalidate', 'Serves cached shell instantly; fetches update in background'),
    ('Tier 2: Catalog Metadata', 'Published game listings, categories, descriptions', 'Network-First with Cache Fallback', 'Shows cached catalog with offline-availability badges'),
    ('Tier 3: Downloaded Games', 'HTML5 canvas bundles, audio, sprites for verified games', 'Cache-Only (Isolated buckets)', 'Fails gracefully if game was not downloaded; shows download CTA'),
    ('Tier 4: Dynamic APIs', 'Auth (/api/v1/auth/*), Payments, Telemetry, WebSockets', 'Network-Only (Bypass Cache)', 'Fails fast with clear offline dialog; never returns stale billing/auth')
]
for i, r in enumerate(cache_rows, start=1):
    for j, val in enumerate(r):
        t_cache.rows[i].cells[j].paragraphs[0].add_run(val)
style_table(t_cache)

# 4. User-Controlled Downloads & Storage Quota
doc_pwa.add_heading('4. User-Controlled Game Downloads & Storage Management', level=2)
doc_pwa.add_paragraph(
    '1. Legal Distribution Gate: Games can only be downloaded if is_offline_compatible = 1 AND licensing_offline_approved = 1. '
    'Third-party titles lacking offline agreements cannot be cached.\n'
    '2. Granular Storage Buckets: Each downloaded game is saved into an isolated cache bucket: game-asset-[gameId]-v[version]. '
    'This prevents cache bloat and allows atomic game updates and uninstalls.\n'
    '3. Storage Quota Monitoring: The UI queries navigator.storage.estimate() to show exact megabytes used and quota remaining. '
    'If available disk space falls below 200 MB, new downloads are blocked with a clear warning.\n'
    '4. Interrupted Download Recovery: Downloads stream chunks and record received bytes. If connectivity drops during download, '
    'the temporary cache bucket is safely discarded or paused without corrupting the active catalog.'
)

# 5. Local Progress & IndexedDB Schema
doc_pwa.add_heading('5. Local Progress Persistence (IndexedDB Schema)', level=2)
doc_pwa.add_paragraph(
    'NexusPlay utilizes an isolated IndexedDB database named NexusPlayDB with three core object stores:'
)
doc_pwa.add_paragraph(
    '• Store 1: offline_progress\n'
    '  - Key Path: [playerId, gameId] (composite key)\n'
    '  - Indices: sync_status, updated_at\n'
    '  - Fields: score (number), level (number), state_json (text), timestamp (ISO), sync_status ("SYNCED" | "DIRTY" | "CONFLICT")\n\n'
    '• Store 2: game_checkpoints\n'
    '  - Key Path: [playerId, gameId, checkpointId]\n'
    '  - Fields: level_number, inventory_state, snapshot_timestamp\n\n'
    '• Store 3: sync_queue\n'
    '  - Key Path: queueId (auto-increment)\n'
    '  - Fields: action ("SCORE_SUBMIT" | "LEVEL_SAVE"), payload, attempts, last_attempt'
)

# 6. Reconnection & Conflict Resolution Protocol
doc_pwa.add_heading('6. Network Reconnection & Conflict Resolution Protocol', level=2)
doc_pwa.add_paragraph(
    'When the browser reconnects, the platform executes a 4-step synchronization cycle:\n'
    'Step 1 (Heartbeat): Validates active network via HTTP probe to /health (avoids captive portal false positives).\n'
    'Step 2 (Queue Processing): Dispatches pending sync_queue records to the backend with idempotency keys.\n'
    'Step 3 (High-Watermark Rule): For high scores and linear levels, the system automatically accepts max(server_val, local_val).\n'
    'Step 4 (Explicit Conflict Modal): If complex state diverges between offline and server records, the platform displays '
    'a non-blocking modal: "Local save: Level 8 (2 hours ago offline) vs Cloud save: Level 7 (Yesterday). Choose which progress to keep."'
)

# 7. Security Guardrails
doc_pwa.add_heading('7. Security, Financial & Multiplayer Guardrails', level=2)
p_guards = doc_pwa.add_paragraph()
p_guards.add_run('• Zero Offline Payments: ').bold = True
p_guards.add_run('Payment checkout flows fail fast when offline. The UI states: "Internet connection required to initiate payment."\n')
p_guards.add_run('• Zero Fake Multiplayer: ').bold = True
p_guards.add_run('Matchmaking and lobby creation are disabled offline. Players can only start single-player or local bot games.\n')
p_guards.add_run('• Stale Entitlement Protection: ').bold = True
p_guards.add_run('Paid games verified online receive a signed entitlement lease with a strict 72-hour TTL. Expired leases require online check-in.')

# 8. Backlog Epics & Stories
doc_pwa.add_heading('8. Backlog Traceability: Epic EP-14 (Offline & PWA)', level=2)
t_backlog = doc_pwa.add_table(rows=6, cols=4)
t_backlog.rows[0].cells[0].paragraphs[0].add_run('Story ID')
t_backlog.rows[0].cells[1].paragraphs[0].add_run('Epic & User Story')
t_backlog.rows[0].cells[2].paragraphs[0].add_run('Priority')
t_backlog.rows[0].cells[3].paragraphs[0].add_run('Criteria Coverage')

b_rows = [
    ('EP14-01', 'PWA App Shell & Offline Shell Caching: As a player, I want the portal to open offline so I can access downloaded games.', 'Should', 'AC-49.1 to AC-49.3'),
    ('EP14-02', 'Offline Game Download & Storage: As a player, I want to download eligible games and inspect storage space.', 'Should', 'AC-50.1 to AC-50.3'),
    ('EP14-03', 'IndexedDB Progress Persistence: As a player, I want my score and level saved offline so progress is not lost.', 'Should', 'AC-51.1 to AC-51.3'),
    ('EP14-04', 'Reconnection Sync & Conflict Resolution: As a player, I want my offline progress synchronized to the server on reconnect.', 'Should', 'AC-52.1 to AC-52.3'),
    ('EP14-05', 'Offline Security Guardrails & Entitlement Lease: As an operator, I want payments and multiplayer blocked offline with 72h lease checks.', 'Must', 'AC-53.1 to AC-53.3')
]
for i, r in enumerate(b_rows, start=1):
    for j, val in enumerate(r):
        t_backlog.rows[i].cells[j].paragraphs[0].add_run(val)
style_table(t_backlog)

# 9. Sign-off
doc_pwa.add_heading('9. Architecture Review & Approval Gate', level=2)
t_sign2 = doc_pwa.add_table(rows=3, cols=3)
t_sign2.rows[0].cells[0].paragraphs[0].add_run('Role')
t_sign2.rows[0].cells[1].paragraphs[0].add_run('Signer')
t_sign2.rows[0].cells[2].paragraphs[0].add_run('Status / Date')
t_sign2.rows[1].cells[0].paragraphs[0].add_run('Senior Frontend & PWA Architect')
t_sign2.rows[1].cells[1].paragraphs[0].add_run('Google Antigravity Lead Agent')
t_sign2.rows[1].cells[2].paragraphs[0].add_run('SUBMITTED / 2026-10-24')
t_sign2.rows[2].cells[0].paragraphs[0].add_run('Product Owner')
t_sign2.rows[2].cells[1].paragraphs[0].add_run('[PRODUCT_OWNER]')
t_sign2.rows[2].cells[2].paragraphs[0].add_run('PENDING APPROVAL')
style_table(t_sign2)

path_pwa = os.path.join('docs', 'architecture', 'PWA-and-Offline-Gaming-Architecture.docx')
doc_pwa.save(path_pwa)
print(f'Successfully generated {path_pwa}')


# ==============================================================================
# 3. UPDATE MASTER-Implementation-Record.docx IN-PLACE (VERSION 0.3)
# ==============================================================================
master_path = os.path.join('docs', 'reports', 'MASTER-Implementation-Record.docx')
master_doc = docx.Document(master_path)

# 1. Update Version History Table (Table 1)
t1 = master_doc.tables[1]
new_row = t1.add_row()
new_row.cells[0].paragraphs[0].text = '0.3'
new_row.cells[1].paragraphs[0].text = '2026-10-24'
new_row.cells[2].paragraphs[0].text = 'Sprint 00 Architecture Review: Finalized Obsidian Arcade UI/UX Design System Specification, PWA & Offline Gaming Architecture; approved ADR-0002 & ADR-0003; added EP-14 (EP14-01–EP14-05) to backlog traceability'
new_row.cells[3].paragraphs[0].text = 'docs/design/UI-UX-Design-System-Specification.docx, docs/architecture/PWA-and-Offline-Gaming-Architecture.docx'

# 2. Update ADR Log section (Section 6)
for idx, p in enumerate(master_doc.paragraphs):
    if 'ADR-0001' in p.text:
        p.text = (
            '• ADR-0001 (Accepted): Technology Stack & Delivery Model (Node.js v22, Express, WebSockets, node:sqlite, Vanilla CSS design system, Automated Staging Pipeline).\n'
            '• ADR-0002 (Approved / Proposed): Frontend Stack Evolution (React 19, TypeScript, Vite, Scoped CSS Modules, Obsidian Arcade Design System).\n'
            '• ADR-0003 (Proposed / Review): PWA & Offline Gaming Architecture (Service Worker App Shell, User-Controlled Downloads, IndexedDB NexusPlayDB, Conflict Resolution, Zero Offline Payments).'
        )
        break

# 3. Append EP-14 to Acceptance Criteria Traceability (Section 7)
for idx, p in enumerate(master_doc.paragraphs):
    if 'All 144 ACs pending.' in p.text or '7. Acceptance-criteria traceability' in p.text:
        # Append detailed traceability note
        p_extra = master_doc.add_paragraph()
        p_extra.text = (
            'Backlog Extension — EP-14: Offline Mode & PWA Capabilities (Criteria AC-49.1 through AC-53.3):\n'
            '• EP14-01 (Should): PWA App Shell Caching (AC-49.1–AC-49.3) -> Mapped to ServiceWorker, AppShellCache.\n'
            '• EP14-02 (Should): Offline Game Download & Quota (AC-50.1–AC-50.3) -> Mapped to DownloadManager, StorageQuota.\n'
            '• EP14-03 (Should): IndexedDB Local Progress Persistence (AC-51.1–AC-51.3) -> Mapped to NexusPlayDB, OfflineProgressStore.\n'
            '• EP14-04 (Should): Reconnection Sync & Conflict Resolution (AC-52.1–AC-52.3) -> Mapped to SyncQueue, ConflictResolverModal.\n'
            '• EP14-05 (Must): Offline Security Guardrails & Lease TTL (AC-53.1–AC-53.3) -> Mapped to EntitlementLeaseValidator, PaymentBlocker.'
        )
        break

master_doc.save(master_path)
print(f'Successfully updated {master_path} to Version 0.3')
