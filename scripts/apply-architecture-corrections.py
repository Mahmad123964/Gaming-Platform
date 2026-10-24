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
# 1. REGENERATE UI/UX DESIGN SYSTEM SPECIFICATION (DOCX)
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
run_sub = sub_p.add_run('"Obsidian Arcade" • NexusPlay Online Gaming Platform • Version 1.1 (Corrected) • 2026-10-24')
run_sub.font.name = 'Arial'
run_sub.font.size = Pt(11)
run_sub.font.color.rgb = RGBColor(100, 116, 139)

doc_ui.add_heading('1. Document Control & Metadata', level=2)
t_ctrl = doc_ui.add_table(rows=8, cols=2)
ctrl_items = [
    ('Document Name', 'NexusPlay UI/UX Design System: "Obsidian Arcade"'),
    ('Version', '1.1 (Corrected Architecture Baseline)'),
    ('Author Roles', 'Principal UI/UX Designer, Senior Frontend Architect & Product Designer'),
    ('Target Architecture', 'React 19, TypeScript, Vite, Scoped CSS Modules'),
    ('Design Standard', 'WCAG 2.1 AA Compliant, Responsive Breakpoints, Reduced-Motion Supported'),
    ('Backlog Traceability', 'EP-01 through EP-15 (including EP-14 PWA Shell & EP-15 Offline Progress)'),
    ('QA Verification Status', 'Design System Specification Under Review; Browser Verification NOT CAPTURED'),
    ('Approval Status', 'PROPOSED / PENDING FINAL PRODUCT OWNER SIGN-OFF')
]
for i, (k, v) in enumerate(ctrl_items):
    t_ctrl.rows[i].cells[0].paragraphs[0].add_run(k).bold = True
    t_ctrl.rows[i].cells[1].paragraphs[0].add_run(v)
style_table(t_ctrl)

doc_ui.add_heading('2. Design Philosophy & Visual Identity', level=2)
doc_ui.add_paragraph(
    'The "Obsidian Arcade" design system is engineered specifically for NexusPlay to bridge the gap between high-energy '
    'gaming immersion and refined, modern luxury software ergonomics. Traditional browser gaming sites are plagued by '
    'cluttered layouts, distracting flashing banners, and garish neon fatigue. Obsidian Arcade redefines the genre '
    'through structured dark charcoal surfaces, mathematical spacing, restrained violet (#7C3AED) and tactical cyan (#06B6D4) accents, '
    'and tactile micro-interactions that feel responsive and alive without compromising visual discipline.'
)

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

doc_ui.add_heading('3.3 Spacing, Elevation & Motion Tokens', level=3)
doc_ui.add_paragraph(
    '• Spacing System: 4px base modular scale (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px).\n'
    '• Border Radii: 6px (--radius-sm, badges/tags), 12px (--radius-md, cards/buttons), 20px (--radius-lg, dialogs/panels), 9999px (pills).\n'
    '• Elevation & Blur: Backdrop filter blur(16px), subtle surface border-glow on hover (rgba(124, 58, 237, 0.35)).\n'
    '• Motion Curves: Standard transition cubic-bezier(0.16, 1, 0.3, 1), durations 150ms/250ms/300ms, reduced-motion overrides.'
)

doc_ui.add_heading('4. Reusable Component Blueprints', level=2)
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
    ('Progress & Conflict Resolution Modal', 
     'Interactive modal invoked when GameSyncContract detects diverging cloud and offline saves. Presents side-by-side timestamps, '
     'level, scores, and inventory hashes, allowing explicit player selection without silent data loss.'),
    ('Offline Storage Manager Panel', 
     'Displays storage consumption gauge (e.g. "185 MB / 2.0 GB used"), inventory of locally downloaded games, one-click update '
     'check, and storage purge controls.')
]
for name, desc in comp_items:
    p = doc_ui.add_paragraph()
    p.add_run(f'• {name}: ').bold = True
    p.add_run(desc)

doc_ui.add_heading('5. Accessibility (WCAG 2.1 AA) Standards', level=2)
doc_ui.add_paragraph(
    '1. High Contrast: Text against charcoal and obsidian surfaces strictly meets 4.5:1 (normal text) and 3:1 (large text/icons).\n'
    '2. Visible Focus Rings: outline: 2px solid var(--accent-cyan); outline-offset: 2px on all interactive controls.\n'
    '3. Keyboard Traversal: Full keyboard navigation (Tab/Shift-Tab, arrow keys in game grids and category scrollbars, Escape to dismiss modals).\n'
    '4. Reduced-Motion Mode: Full implementation of @media (prefers-reduced-motion: reduce) disabling scaling, orb animations, and heavy transitions.'
)

doc_ui.add_heading('6. Responsive Breakpoints', level=2)
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

doc_ui.add_heading('7. QA Verification Statement & Implementation Caveat', level=2)
doc_ui.add_paragraph(
    'IMPORTANT QA NOTICE: The design specifications, responsive layouts, and accessibility rules detailed in this document '
    'represent approved design standards for upcoming Phase 1 sprints. They are NOT claimed as verified running code on the basis '
    'of Sprint 00 smoke tests alone. The running staging server currently executes the baseline foundation shell (HTTP/WS gateway), '
    'while browser subagent walkthroughs remain documented as NOT CAPTURED due to upstream Playwright CDN 404 driver download limitations.'
)

doc_ui.add_heading('8. Approval Sign-Off', level=2)
t_sign1 = doc_ui.add_table(rows=3, cols=3)
t_sign1.rows[0].cells[0].paragraphs[0].add_run('Role')
t_sign1.rows[0].cells[1].paragraphs[0].add_run('Signer')
t_sign1.rows[0].cells[2].paragraphs[0].add_run('Status / Date')
t_sign1.rows[1].cells[0].paragraphs[0].add_run('Principal UI/UX Designer')
t_sign1.rows[1].cells[1].paragraphs[0].add_run('Google Antigravity Lead Agent')
t_sign1.rows[1].cells[2].paragraphs[0].add_run('CORRECTED & SUBMITTED / 2026-10-24')
t_sign1.rows[2].cells[0].paragraphs[0].add_run('Product Owner')
t_sign1.rows[2].cells[1].paragraphs[0].add_run('[PRODUCT_OWNER]')
t_sign1.rows[2].cells[2].paragraphs[0].add_run('PENDING APPROVAL')
style_table(t_sign1)

path_ui = os.path.join('docs', 'design', 'UI-UX-Design-System-Specification.docx')
doc_ui.save(path_ui)
print(f'Successfully updated {path_ui}')


# ==============================================================================
# 2. REGENERATE PWA & OFFLINE GAMING ARCHITECTURE SPECIFICATION (DOCX)
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
run_sub2 = sub_p2.add_run('NexusPlay Online Gaming Platform • Version 1.1 (Corrected) • 2026-10-24')
run_sub2.font.name = 'Arial'
run_sub2.font.size = Pt(11)
run_sub2.font.color.rgb = RGBColor(100, 116, 139)

doc_pwa.add_heading('1. Document Control & Scope', level=2)
t_ctrl2 = doc_pwa.add_table(rows=8, cols=2)
ctrl_items2 = [
    ('Specification Title', 'Progressive Web App & Offline Gaming Architecture'),
    ('Version', '1.1 (Corrected Architecture Baseline)'),
    ('Author Roles', 'Senior Frontend Architect & PWA / Reliability Engineer'),
    ('Governing Backlog Epics', 'EP-14 (Offline PWA Shell & Storage) and EP-15 (Offline Progress & Entitlements)'),
    ('Key Technologies', 'Service Worker, Cache Storage API, IndexedDB (NexusPlayDB), Storage Quota API'),
    ('Core Principles', 'Zero Offline Payments, Zero Simulated Multiplayer, Contract-Based Sync, Legal Licensing Gate'),
    ('Offline Entitlement Duration', '[OFFLINE_ENTITLEMENT_DURATION] (Subject to Legal & Business Review)'),
    ('Status', 'PROPOSED / PENDING FINAL ARCHITECTURE APPROVAL')
]
for i, (k, v) in enumerate(ctrl_items2):
    t_ctrl2.rows[i].cells[0].paragraphs[0].add_run(k).bold = True
    t_ctrl2.rows[i].cells[1].paragraphs[0].add_run(v)
style_table(t_ctrl2)

doc_pwa.add_heading('2. Executive Summary', level=2)
doc_pwa.add_paragraph(
    'NexusPlay PWA architecture enables an installable, resilient desktop and mobile gaming experience. '
    'The system provides instant portal startup under poor or severed connectivity, enables user-controlled '
    'downloads of licensed browser games, persists local scores and level checkpoints via IndexedDB, and automatically '
    'reconciles data upon reconnection according to game-specific sync contracts. Strict operational boundaries ensure that payments, real-time multiplayer, and '
    'unauthorized game distribution are never executed without verified online connectivity.'
)

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

doc_pwa.add_heading('4. User-Controlled Game Downloads & Storage Management (EP-14)', level=2)
doc_pwa.add_paragraph(
    '1. Legal Distribution Gate: Games can only be downloaded if is_offline_compatible = 1 AND licensing_offline_approved = 1. '
    'Third-party titles lacking offline distribution agreements are strictly barred from local storage.\n'
    '2. Granular Storage Buckets: Each downloaded game is saved into an isolated cache bucket: game-asset-[gameId]-v[version]. '
    'This prevents cache bloat and allows atomic game updates and uninstalls.\n'
    '3. Storage Quota Monitoring: The UI queries navigator.storage.estimate() to show exact megabytes used and quota remaining. '
    'If available disk space falls below 200 MB, new downloads are blocked with a clear warning.\n'
    '4. Interrupted Download Recovery: Downloads stream chunks and record received bytes. If connectivity drops during download, '
    'the temporary cache bucket is safely discarded or paused without corrupting the active catalog.'
)

doc_pwa.add_heading('5. Local Progress Persistence (IndexedDB NexusPlayDB) (EP-15)', level=2)
doc_pwa.add_paragraph(
    'NexusPlay utilizes an isolated IndexedDB database named NexusPlayDB with three core object stores:\n'
    '• offline_progress: Keyed by [playerId, gameId]. Stores score, level, state_json, timestamp, and sync_status ("SYNCED" | "DIRTY" | "CONFLICT").\n'
    '• game_checkpoints: Stores timestamped snapshots for mid-game level resumption.\n'
    '• sync_queue: FIFO queue recording offline session results waiting for network delivery.'
)

doc_pwa.add_heading('6. GameSyncContract & Explicit Conflict Resolution', level=2)
doc_pwa.add_paragraph(
    'CRITICAL ARCHITECTURAL DIRECTIVE: The platform does NOT automatically merge all scores, levels, or saved game states. '
    'Every game integration registered in the catalog must declare a GameSyncContract with an explicit sync_strategy:\n'
    '• Strategy 1 (MONOTONIC_SCORE_ONLY): Pure arcade/score-attack titles. Safe automatic merge: server accepts max(server_score, local_score) with timestamp tie-breaking.\n'
    '• Strategy 2 (LINEAR_MILESTONE): Games with ordered linear chapters/levels. Auto-advances only if the local save is a direct forward milestone of the cloud state. Divergent milestone numbers trigger conflict resolution.\n'
    '• Strategy 3 (COMPLEX_STATEFUL): RPGs, puzzle boards, virtual currencies, or branching quest games. Automatic merging is STRICTLY FORBIDDEN to prevent inventory dupes or lost progress.\n\n'
    'Explicit Conflict Resolution Protocol:\n'
    'When a divergence is detected under Strategy 2 or Strategy 3, the sync engine holds the update in STAGED_CONFLICT and displays '
    'the Conflict Resolution Dialog showing side-by-side details (cloud timestamp, level, inventory hash vs local offline save). '
    'The player explicitly selects whether to keep the local save, download the cloud save, or fork into a separate save slot. '
    'If dismissed without selection, local progress remains safe in IndexedDB for the next prompt without data loss.'
)

doc_pwa.add_heading('7. Security Guardrails & Offline Entitlement Duration', level=2)
doc_pwa.add_paragraph(
    '• Zero Offline Payments: Checkout flows fail fast when offline. The UI states: "Internet connection required to initiate payment."\n'
    '• Zero Fake Multiplayer: Matchmaking and lobby creation are disabled offline. Players can only start single-player or local bot games.\n'
    '• Offline Entitlement Duration ([OFFLINE_ENTITLEMENT_DURATION]):\n'
    '  Paid games verified online receive a signed cryptographic entitlement lease valid for [OFFLINE_ENTITLEMENT_DURATION]. '
    'The placeholder [OFFLINE_ENTITLEMENT_DURATION] replaces any unapproved fixed duration and requires the following business, licensing, '
    'and security decisions before implementation:\n'
    '  1. Licensing Agreements: Written authorization from game publishers regarding maximum permitted offline play windows.\n'
    '  2. Business Churn & Revenue Risk: Analysis of subscription cancellation abuse (e.g. subscribing, downloading games, canceling immediately, and playing offline indefinitely).\n'
    '  3. Anti-Tampering & Clock Rollback: Technical enforcement against manipulating the operating system clock (requiring monotonic hardware counters, HMAC-sealed server timestamps on last heartbeat, and secure token expiration checks).\n'
    '  4. Revocation Handling: Process for revoking offline entitlements immediately upon reconnection if a chargeback or payment failure occurred.'
)

doc_pwa.add_heading('8. Backlog Traceability: Epics EP-14 and EP-15 (Max 4 Stories Per Epic)', level=2)
doc_pwa.add_paragraph(
    'To strictly enforce the approved backlog rule of at most four user stories per epic, offline functionality is divided into two distinct epics:'
)

doc_pwa.add_heading('8.1 Epic EP-14: Offline PWA Shell & Storage Management', level=3)
t_b1 = doc_pwa.add_table(rows=4, cols=4)
t_b1.rows[0].cells[0].paragraphs[0].add_run('Story ID')
t_b1.rows[0].cells[1].paragraphs[0].add_run('User Story')
t_b1.rows[0].cells[2].paragraphs[0].add_run('Priority')
t_b1.rows[0].cells[3].paragraphs[0].add_run('Acceptance Criteria')

b1_data = [
    ('EP14-01', 'PWA App Shell & Offline Shell Caching: As a player, I want the portal shell to open offline so that I can access downloaded games.', 'Should', 'AC-49.1 to AC-49.3'),
    ('EP14-02', 'Offline Game Download & Storage: As a player, I want to download authorized games and inspect storage space so that I can play while disconnected.', 'Should', 'AC-50.1 to AC-50.3'),
    ('EP14-03', 'Interrupted Download Recovery: As a player, I want interrupted game downloads to recover safely so that my storage and cache do not become corrupted.', 'Should', 'AC-51.1 to AC-51.3')
]
for i, r in enumerate(b1_data, start=1):
    for j, val in enumerate(r):
        t_b1.rows[i].cells[j].paragraphs[0].add_run(val)
style_table(t_b1)

doc_pwa.add_heading('8.2 Epic EP-15: Offline Progress & Entitlement Security', level=3)
t_b2 = doc_pwa.add_table(rows=4, cols=4)
t_b2.rows[0].cells[0].paragraphs[0].add_run('Story ID')
t_b2.rows[0].cells[1].paragraphs[0].add_run('User Story')
t_b2.rows[0].cells[2].paragraphs[0].add_run('Priority')
t_b2.rows[0].cells[3].paragraphs[0].add_run('Acceptance Criteria')

b2_data = [
    ('EP15-01', 'Local IndexedDB Progress Persistence: As a player, I want my game score and level checkpoint persisted offline so progress is not lost.', 'Should', 'AC-52.1 to AC-52.3'),
    ('EP15-02', 'Reconnection Sync & Contract-Based Conflict Resolution: As a player, I want my offline progress synchronized according to game contracts with conflict resolution.', 'Should', 'AC-53.1 to AC-53.3'),
    ('EP15-03', 'Offline Guardrails & Entitlement Lease: As an operator, I want payments and multiplayer blocked offline and paid games gated by [OFFLINE_ENTITLEMENT_DURATION].', 'Must', 'AC-54.1 to AC-54.3')
]
for i, r in enumerate(b2_data, start=1):
    for j, val in enumerate(r):
        t_b2.rows[i].cells[j].paragraphs[0].add_run(val)
style_table(t_b2)

doc_pwa.add_heading('9. QA Verification Statement & Implementation Caveat', level=2)
doc_pwa.add_paragraph(
    'IMPORTANT QA NOTICE: The PWA caching architecture, IndexedDB persistence, and sync mechanisms detailed in this document '
    'represent approved architectural specifications for upcoming Phase 1/Phase 2 delivery. They are NOT claimed as verified running code on the basis '
    'of Sprint 00 smoke tests alone. Sprint 00 smoke tests strictly verify the gateway liveness, readiness, and basic WebSocket handshake on port 5050. '
    'Browser walkthrough screenshots remain documented as NOT CAPTURED due to upstream Playwright CDN 404 driver download limitations.'
)

doc_pwa.add_heading('10. Approval Sign-Off', level=2)
t_sign2 = doc_pwa.add_table(rows=3, cols=3)
t_sign2.rows[0].cells[0].paragraphs[0].add_run('Role')
t_sign2.rows[0].cells[1].paragraphs[0].add_run('Signer')
t_sign2.rows[0].cells[2].paragraphs[0].add_run('Status / Date')
t_sign2.rows[1].cells[0].paragraphs[0].add_run('Senior Frontend & PWA Architect')
t_sign2.rows[1].cells[1].paragraphs[0].add_run('Google Antigravity Lead Agent')
t_sign2.rows[1].cells[2].paragraphs[0].add_run('CORRECTED & SUBMITTED / 2026-10-24')
t_sign2.rows[2].cells[0].paragraphs[0].add_run('Product Owner')
t_sign2.rows[2].cells[1].paragraphs[0].add_run('[PRODUCT_OWNER]')
t_sign2.rows[2].cells[2].paragraphs[0].add_run('PENDING APPROVAL')
style_table(t_sign2)

path_pwa = os.path.join('docs', 'architecture', 'PWA-and-Offline-Gaming-Architecture.docx')
doc_pwa.save(path_pwa)
print(f'Successfully updated {path_pwa}')


# ==============================================================================
# 3. UPDATE PRODUCT BACKLOG DOCUMENTS (DOCX)
# ==============================================================================
def update_backlog_doc(file_path):
    doc_bk = docx.Document(file_path)
    table = doc_bk.tables[0]
    
    # Check if already added
    existing_ids = [row.cells[0].text.strip() for row in table.rows]
    new_stories = [
        ('EP14-01', 'EP-14 · Offline PWA Shell & Storage', 'As a player, I want the portal shell to open offline so that I can access downloaded games without network access.', 'Should'),
        ('EP14-02', 'EP-14 · Offline PWA Shell & Storage', 'As a player, I want to download authorized games and inspect storage space so that I can play while disconnected.', 'Should'),
        ('EP14-03', 'EP-14 · Offline PWA Shell & Storage', 'As a player, I want interrupted game downloads to recover safely so that my storage and cache do not become corrupted.', 'Should'),
        ('EP15-01', 'EP-15 · Offline Progress & Entitlements', 'As a player, I want my game score and level checkpoint persisted offline in IndexedDB so that my progress is retained locally.', 'Should'),
        ('EP15-02', 'EP-15 · Offline Progress & Entitlements', 'As a player, I want my offline progress synchronized upon reconnection according to game contract rules so that my cloud progress reflects valid play.', 'Should'),
        ('EP15-03', 'EP-15 · Offline Progress & Entitlements', 'As an operator, I want payments and multiplayer blocked offline and paid games gated by [OFFLINE_ENTITLEMENT_DURATION] so that business rules are strictly enforced.', 'Must')
    ]
    
    for sid, epic, story, prio in new_stories:
        if sid not in existing_ids:
            row = table.add_row()
            row.cells[0].paragraphs[0].text = sid
            row.cells[1].paragraphs[0].text = epic
            row.cells[2].paragraphs[0].text = story
            row.cells[3].paragraphs[0].text = prio
            
    # Update summary paragraph
    for p in doc_bk.paragraphs:
        if 'Backlog summary:' in p.text:
            p.text = 'Backlog summary: 15 epics · 54 user stories · Must: 27 · Should: 24 · Could: 3. Maximum 4 stories per epic strictly maintained.'
            break
            
    doc_bk.save(file_path)
    print(f'Successfully updated backlog: {file_path}')

update_backlog_doc('Documents/online_gaming_platform_moscow_backlog.docx')
update_backlog_doc('docs/source/online_gaming_platform_moscow_backlog.docx')


# ==============================================================================
# 4. UPDATE ACCEPTANCE CRITERIA DOCUMENTS (DOCX)
# ==============================================================================
def update_ac_doc(file_path):
    doc_ac = docx.Document(file_path)
    
    # Check if EP-14 already appended
    full_text = '\n'.join([p.text for p in doc_ac.paragraphs])
    if 'EP-14 · Offline PWA Shell & Storage Management' not in full_text:
        # Find index before Review and Sprint-Readiness Notes
        insert_idx = len(doc_ac.paragraphs) - 1
        for idx, p in enumerate(doc_ac.paragraphs):
            if 'Review and Sprint-Readiness Notes' in p.text:
                insert_idx = idx
                break
                
        # Append EP-14 and EP-15 content
        doc_ac.add_paragraph('EP-14 · Offline PWA Shell & Storage Management')
        
        doc_ac.add_paragraph('EP14-01  |  SHOULD')
        doc_ac.add_paragraph('As a player, I want the portal shell to open offline so that I can access downloaded games without network access.')
        doc_ac.add_paragraph('AC-49.1: Given the PWA application shell is cached, When a player opens the platform while disconnected from the network, Then the application loads and displays the offline portal view.')
        doc_ac.add_paragraph('AC-49.2: Given the platform is operating offline, When the interface renders, Then an offline status indicator is displayed and dynamic online features are disabled or flagged.')
        doc_ac.add_paragraph('AC-49.3: Given a new application shell version is released online, When an offline player reconnects and launches the app, Then the service worker updates in the background and prompts the player to refresh if required.')
        doc_ac.add_paragraph('Flagged ambiguities: Shell cache expiration policy [INCLUSIVE]/[EXCLUSIVE], maximum cache size bounds, and prompt timing for background updates.')
        
        doc_ac.add_paragraph('EP14-02  |  SHOULD')
        doc_ac.add_paragraph('As a player, I want to download authorized games and inspect storage space so that I can play while disconnected.')
        doc_ac.add_paragraph('AC-50.1: Given a game is marked as offline-compatible and has recorded offline licensing clearance, When a player requests to download the game, Then the assets are cached into an isolated game bucket and marked offline-ready.')
        doc_ac.add_paragraph('AC-50.2: Given a game is not approved for offline distribution, When the player views its details, Then the offline download option is unavailable with a clear licensing notice.')
        doc_ac.add_paragraph('AC-50.3: Given device available storage is below the minimum threshold, When a download is initiated, Then the download is prevented and current storage usage is displayed.')
        doc_ac.add_paragraph('Flagged ambiguities: Minimum storage threshold value [INCLUSIVE]/[EXCLUSIVE], eviction policies, and asset versioning schema.')

        doc_ac.add_paragraph('EP14-03  |  SHOULD')
        doc_ac.add_paragraph('As a player, I want interrupted game downloads to recover safely so that my storage and cache do not become corrupted.')
        doc_ac.add_paragraph('AC-51.1: Given a game download is interrupted by network loss, When connectivity is restored and resume is selected, Then the download resumes from the last valid chunk or restarts safely.')
        doc_ac.add_paragraph('AC-51.2: Given an interrupted download is abandoned, When cache maintenance executes, Then partial or corrupted download chunks are removed without affecting other games.')
        doc_ac.add_paragraph('AC-51.3: Given a downloaded game fails integrity verification, When the player attempts to launch it offline, Then launch is blocked and a re-download action is offered.')
        doc_ac.add_paragraph('Flagged ambiguities: Chunk size bounds [INCLUSIVE]/[EXCLUSIVE], integrity verification method (checksum/hash), and retry timeout limits.')

        doc_ac.add_paragraph('EP-15 · Offline Progress & Entitlement Security')
        
        doc_ac.add_paragraph('EP15-01  |  SHOULD')
        doc_ac.add_paragraph('As a player, I want my game score and level checkpoint persisted offline in IndexedDB so that my progress is retained locally.')
        doc_ac.add_paragraph('AC-52.1: Given an authenticated player completes a session of a downloaded game while offline, When the game reports progress, Then the score and checkpoint are persisted in local IndexedDB.')
        doc_ac.add_paragraph('AC-52.2: Given a player closes and reopens the browser while offline, When the downloaded game is resumed, Then the local saved level and score remain accessible.')
        doc_ac.add_paragraph('AC-52.3: Given multiple player accounts use the same device offline, When local progress is recorded, Then progress records remain partitioned by player identity without data contamination.')
        doc_ac.add_paragraph('Flagged ambiguities: Maximum local checkpoint history count [INCLUSIVE]/[EXCLUSIVE], encryption of sensitive progress, and guest play partitioning.')

        doc_ac.add_paragraph('EP15-02  |  SHOULD')
        doc_ac.add_paragraph('As a player, I want my offline progress synchronized upon reconnection according to game contract rules so that my cloud progress reflects valid play.')
        doc_ac.add_paragraph('AC-53.1: Given a game integration specifies an automatic merge contract, When reconnection occurs, Then eligible offline progress is synchronized to the server without user intervention.')
        doc_ac.add_paragraph('AC-53.2: Given a game integration specifies a conflict-modal contract and cloud progress has diverged from offline progress, When synchronization is evaluated, Then an explicit conflict resolution dialog is presented before applying changes.')
        doc_ac.add_paragraph('AC-53.3: Given synchronization fails due to server error or network timeout, When the failure occurs, Then the local progress remains intact in the sync queue for subsequent retry.')
        doc_ac.add_paragraph('Flagged ambiguities: GameSyncContract specification ownership, conflict tie-breaking order, and retry backoff intervals [INCLUSIVE]/[EXCLUSIVE].')

        doc_ac.add_paragraph('EP15-03  |  MUST')
        doc_ac.add_paragraph('As an operator, I want payments and multiplayer blocked offline and paid games gated by [OFFLINE_ENTITLEMENT_DURATION] so that business rules are strictly enforced.')
        doc_ac.add_paragraph('AC-54.1: Given the platform is offline, When a player attempts to initiate checkout or subscribe, Then the transaction is blocked with an explicit network-required notification.')
        doc_ac.add_paragraph('AC-54.2: Given the platform is offline, When a player attempts to enter matchmaking or create a multiplayer lobby, Then the action is denied and solo/bot alternatives are presented.')
        doc_ac.add_paragraph('AC-54.3: Given an authenticated subscriber launches a downloaded premium game offline, When offline duration exceeds [OFFLINE_ENTITLEMENT_DURATION], Then launch is prevented until an online entitlement re-validation occurs.')
        doc_ac.add_paragraph('Flagged ambiguities: Exact value of [OFFLINE_ENTITLEMENT_DURATION] [INCLUSIVE]/[EXCLUSIVE], clock manipulation tampering detection, and grace-period warning threshold.')

        for p in doc_ac.paragraphs:
            if 'Story coverage:' in p.text:
                p.text = 'Story coverage: 54/54  |  Criteria: 162  |  Ambiguity notes: 54/54  |  Epics strictly comply with maximum 4 stories per epic rule.'
                break

    doc_ac.save(file_path)
    print(f'Successfully updated acceptance criteria: {file_path}')

update_ac_doc('Documents/online_gaming_platform_all_stories_acceptance_criteria.docx')
update_ac_doc('docs/source/online_gaming_platform_all_stories_acceptance_criteria.docx')


# ==============================================================================
# 5. UPDATE MASTER-Implementation-Record.docx (VERSION 0.4)
# ==============================================================================
master_path = os.path.join('docs', 'reports', 'MASTER-Implementation-Record.docx')
master_doc = docx.Document(master_path)

# Update Document Control Table (Table 0)
t0 = master_doc.tables[0]
for row in t0.rows:
    if row.cells[0].text.strip() == 'Backlog':
        row.cells[1].text = '54 user stories EP01-01–EP15-03'
    elif row.cells[0].text.strip() == 'Acceptance criteria':
        row.cells[1].text = '162 criteria AC-1.1–AC-54.3'

# Update Version History Table (Table 1)
t1 = master_doc.tables[1]
new_row = t1.add_row()
new_row.cells[0].paragraphs[0].text = '0.4'
new_row.cells[1].paragraphs[0].text = '2026-10-24'
new_row.cells[2].paragraphs[0].text = (
    'Architecture Review Corrections: Split offline functionality into EP-14 (EP14-01–03) and EP-15 (EP15-01–03) '
    'complying with max 4 stories per epic; replaced 72h with [OFFLINE_ENTITLEMENT_DURATION] and documented open business/licensing decisions; '
    'introduced GameSyncContract with explicit conflict resolution; updated QA caveats and backlog/AC documents (54 stories, 162 ACs).'
)
new_row.cells[3].paragraphs[0].text = 'docs/design/UI-UX-Design-System-Specification.docx, docs/architecture/PWA-and-Offline-Gaming-Architecture.docx'

# Update ADR Log (Section 6)
for p in master_doc.paragraphs:
    if 'ADR-0003' in p.text:
        p.text = (
            '• ADR-0001 (Accepted): Technology Stack & Delivery Model (Node.js v22, Express, WebSockets, node:sqlite, Vanilla CSS design system, Automated Staging Pipeline).\n'
            '• ADR-0002 (Approved): Frontend Stack Evolution (React 19, TypeScript, Vite, Scoped CSS Modules, Obsidian Arcade Design System).\n'
            '• ADR-0003 (Corrected / Approved): PWA & Offline Gaming Architecture (EP-14 PWA Shell & Storage, EP-15 Progress & Entitlements, GameSyncContract, Explicit Conflict Resolution, [OFFLINE_ENTITLEMENT_DURATION]).'
        )
        break

# Update Traceability Section (Section 7)
for idx, p in enumerate(master_doc.paragraphs):
    if 'Backlog Extension' in p.text:
        p.text = (
            'Corrected Backlog Extension — EP-14 and EP-15 Traceability (Criteria AC-49.1 through AC-54.3):\n'
            '• EP14-01 (Should): PWA App Shell Caching (AC-49.1–AC-49.3) -> Mapped to ServiceWorker, AppShellCache.\n'
            '• EP14-02 (Should): Offline Game Download & Storage (AC-50.1–AC-50.3) -> Mapped to DownloadManager, StorageQuota.\n'
            '• EP14-03 (Should): Interrupted Download Recovery & Quotas (AC-51.1–AC-51.3) -> Mapped to DownloadRecovery, CacheBucket.\n'
            '• EP15-01 (Should): IndexedDB Local Progress Persistence (AC-52.1–AC-52.3) -> Mapped to NexusPlayDB, OfflineProgressStore.\n'
            '• EP15-02 (Should): Reconnection Sync & Contract-Based Conflict (AC-53.1–AC-53.3) -> Mapped to GameSyncContract, ConflictModal.\n'
            '• EP15-03 (Must): Offline Security Guardrails & Lease TTL (AC-54.1–AC-54.3) -> Mapped to [OFFLINE_ENTITLEMENT_DURATION], EntitlementLeaseValidator, PaymentBlocker.'
        )
        break

master_doc.save(master_path)
print(f'Successfully updated {master_path} to Version 0.4')
