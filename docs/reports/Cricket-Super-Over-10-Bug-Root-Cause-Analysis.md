# CRICKET SUPER OVER — 10-BUG ROOT CAUSE ANALYSIS & REMEDIATION MATRIX
**Incident Reference:** `INC-2026-10-CRICKET-01`  
**Game Slug:** `cricket-super-over` (Game #54)  
**Component Path:** `client/src/components/gamePlayer/CricketSuperOver.tsx`  
**Date:** 2026-10-27  
**Auditor:** Principal Game Architect & Technical Quality Auditor  

---

## Comprehensive Defect Dossiers

### BUG-CSO-01: Catalog Thumbnails Missing / Generic SVG Placeholders
- **Bug ID:** `BUG-CSO-01`
- **Severity:** Major
- **Actual Behavior:** In the public game catalog, `cricket-super-over` (and all other games) renders a generic category-level wireframe SVG emblem (e.g. generic controller/puzzle shape) with no distinct cricket imagery.
- **Expected Behavior:** High-resolution, distinct visual thumbnail or styled thematic emblem displaying cricket iconography (cricket bat, wickets, ball seam) with dynamic glowing accents.
- **Preconditions:** User navigates to the NexusPlay home catalog view.
- **Reproduction Steps:**
  1. Open `http://localhost:5050`.
  2. Locate the game card for "Cricket Super Over" (`#game-card-cricket-super-over`).
  3. Observe the card's visual header area.
- **Root Cause:** In `client/src/components/catalog/GameCard.tsx` (lines 64–79), the card artwork renders a hardcoded category SVG switch (`puzzle`, `strategy`, `card`, `action`, or generic rectangle fallback). Neither individual game thumbnails nor game-specific artwork metadata are queried or rendered.
- **Affected Files:**
  - `client/src/components/catalog/GameCard.tsx`
  - `client/src/components/catalog/GameCard.module.css`
- **Fix Recommendation:** Enhance `GameCard.tsx` to support dedicated thumbnail artwork or styled thematic vector badges with game-specific sport icons and typography for sports titles.
- **Automated Regression Coverage:** Add DOM assertion verifying card artwork contains distinct game-specific art or identifiers.
- **Human Validation Requirement:** Visually verify that Cricket Super Over is instantly recognizable in the catalog grid.

---

### BUG-CSO-02: Fullscreen Mode Leaves Excessive Empty Black Space
- **Bug ID:** `BUG-CSO-02`
- **Severity:** Major
- **Actual Behavior:** When entering fullscreen mode on a desktop display (e.g. 1920×1080), the cricket canvas remains fixed at a tiny 360×260 pixels, surrounded by immense empty black letterboxing and dead space.
- **Expected Behavior:** The game canvas and UI elements should scale dynamically to fill the available modal/fullscreen container while maintaining an optimal aspect ratio.
- **Preconditions:** Launch Cricket Super Over on desktop screen >= 1080p.
- **Reproduction Steps:**
  1. Launch Cricket Super Over from catalog.
  2. Click the Fullscreen icon (`#btn-toggle-fullscreen`) in the top bar.
  3. Observe that the game canvas stays at 360×260px inside the 1920×1080 viewport.
- **Root Cause:** `CricketSuperOver.tsx` hardcodes `<canvas width={360} height={260} />`. In `ExpandedGames.module.css`, `.gameCanvas` has `max-width: 100%; height: auto;`, but lacks responsive container filling, aspect ratio locking, or dynamic resolution scaling.
- **Affected Files:**
  - `client/src/components/gamePlayer/CricketSuperOver.tsx`
  - `client/src/components/gamePlayer/ExpandedGames.module.css`
- **Fix Recommendation:** Implement a responsive canvas sizing routine (or CSS `aspect-ratio: 16/10; width: 100%; max-width: 640px; height: auto`) that cleanly fills the player area on both standard and fullscreen viewports.
- **Automated Regression Coverage:** Assert canvas client width and height expand when container width increases.
- **Human Validation Requirement:** Toggle fullscreen on desktop and verify game fills the stage smoothly.

---

### BUG-CSO-03: Visual Presentation is Primitive and Minimalist
- **Bug ID:** `BUG-CSO-03`
- **Severity:** Major
- **Actual Behavior:** The cricket pitch is a flat brown rectangle on a solid green rectangle. The batsman is a single cyan dot with a straight yellow line for a bat. Stumps are tiny yellow boxes. The ball is a solid red circle with no shadow or height perspective.
- **Expected Behavior:** Engaging arcade cricket visuals featuring 2.5D perspective pitch markings (popping crease, bowling crease, return creases, wide lines), stadium boundary rope, grass striping, ball elevation with dynamic ground shadow, batsman stance/swing animations, and pitch impact dust.
- **Preconditions:** Launch Cricket Super Over.
- **Reproduction Steps:**
  1. Launch game.
  2. Inspect canvas rendering during ready and bowling states.
- **Root Cause:** `render()` loop in `CricketSuperOver.tsx` used minimal 2D canvas draw primitives (`fillRect`, basic `arc`) without depth cues, perspective transforms, or textured shading.
- **Affected Files:**
  - `client/src/components/gamePlayer/CricketSuperOver.tsx`
- **Fix Recommendation:** Overhaul the canvas render pipeline to draw a perspective pitch with stadium turf gradients, 3D ball height with ground shadow, realistic wickets with bails, bowler approach indicator, and visual particle feedback on shots.
- **Automated Regression Coverage:** Verify rendering loop executes without canvas context errors across 60 FPS.
- **Human Validation Requirement:** Confirm visuals feel like a cohesive retro-arcade cricket title rather than a prototype wireframe.

---

### BUG-CSO-04: Disjointed Dual-Role Player Controls (Player Bowls and Bats)
- **Bug ID:** `BUG-CSO-04`
- **Severity:** Critical (P0)
- **Actual Behavior:** The user must manually click "🏏 Bowl Delivery" to bowl the ball, and then within 500 milliseconds switch context to click "🚀 Loft for 6" or "Straight Drive" as the batsman. The player is forced to play against themselves.
- **Expected Behavior:** Coherent player identity: The player controls the **BATSMAN** (Nexus Stars chasing 16–18 runs in a Super Over). The AI bowler autonomously runs in, varies pitch line, length, and pace, and releases deliveries. The player focuses purely on batting timing and shot selection.
- **Preconditions:** Launch game in 'READY' state.
- **Reproduction Steps:**
  1. Observe the touch control buttons: "🏏 Bowl Delivery", "🚀 Loft for 6", "Straight Drive", "Square Sweep".
  2. Notice that the player has to click "Bowl Delivery", then race to click a shot button.
- **Root Cause:** The architecture lacked an autonomous AI bowler state machine. Delivery release was tied directly to a user-facing button without an automatic countdown or bowler AI runner.
- **Affected Files:**
  - `client/src/components/gamePlayer/CricketSuperOver.tsx`
- **Fix Recommendation:** Implement an automated AI Bowler loop with delivery anticipation ("Bowler approaching crease..."). Provide a "Next Delivery" or auto-bowl flow where the player is exclusively the batsman.
- **Automated Regression Coverage:** Simulate full 6-ball innings where AI bowls autonomously and player inputs only batting shots.
- **Human Validation Requirement:** Test batting responsiveness when reacting to incoming AI deliveries.

---

### BUG-CSO-05: Bowling Progression Stops After Delivery #4
- **Bug ID:** `BUG-CSO-05`
- **Severity:** Critical (P0)
- **Actual Behavior:** The innings frequently stops advancing after the 4th ball, or fails to allow all 6 legal balls.
- **Expected Behavior:** Exactly six (6) legal deliveries must be bowled unless the batting side reaches the winning target early or loses all 2 wickets.
- **Preconditions:** Start an innings and play through deliveries.
- **Reproduction Steps:**
  1. Bowl delivery 1, 2, 3, 4.
  2. If 2 wickets have fallen (very common due to narrow timing windows), state becomes `'MATCH_END'`, disabling all buttons with no game over banner.
  3. If a ball passes the batsman without a shot click, `ballRef.current.active` remains `true` forever because there was no boundary check, permanently locking the game in `'BOWLING'`.
- **Root Cause:**
  1. Lack of out-of-bounds boundary cleanup: when ball passed the canvas edge, `active` never reset to `false`.
  2. Premature match termination due to `wickets >= 2` triggering a silent freeze.
- **Affected Files:**
  - `client/src/components/gamePlayer/CricketSuperOver.tsx`
- **Fix Recommendation:** Add comprehensive ball lifecycle management: if ball reaches boundary or passes wicketkeeper, auto-finalize the delivery as a dot ball or wide, update ball counter, and reset state.
- **Automated Regression Coverage:** Test automated 6-ball lifecycle completion with leaves, misses, and defensive blocks.
- **Human Validation Requirement:** Play a full 6-ball over to completion without any stalling.

---

### BUG-CSO-06: Gameplay Freezes When Runs Reach 12 (or Terminal State)
- **Bug ID:** `BUG-CSO-06`
- **Severity:** Critical (P0)
- **Actual Behavior:** When the player reaches target runs or loses 2 wickets (often at 12 runs after two big shots), all control buttons become disabled, the scoreboard freezes, and no game-over banner or completion modal is displayed.
- **Expected Behavior:** Clear, celebratory victory or defeat overlay: "VICTORY! Target Chased!" or "MATCH OVER! Bowled Out", displaying final scorecard, and invoking `onGameOver(finalScore)`.
- **Preconditions:** Score runs up to the target or lose 2 wickets.
- **Reproduction Steps:**
  1. Hit two consecutive sixes (runs = 12).
  2. If target is reached or subsequent wicket falls, observe that all buttons disable (`disabled={state === 'MATCH_END'}`).
  3. Notice that nothing happens on screen; `onGameOver` is never called.
- **Root Cause:**
  1. `CricketSuperOver.tsx` receives `onGameOver` in its props but **never calls `onGameOver()` anywhere in its codebase**.
  2. The JSX contains no modal dialog or victory banner for `state === 'MATCH_END'`; it only sets `disabled` attributes on the buttons.
- **Affected Files:**
  - `client/src/components/gamePlayer/CricketSuperOver.tsx`
- **Fix Recommendation:** Implement a rich, clear Game Over / Victory overlay with full match summary, strike rate, boundaries count, and invoke `onGameOver(finalScore)` callback.
- **Automated Regression Coverage:** Assert `onGameOver` is called with final score when match concludes.
- **Human Validation Requirement:** Win and lose a Super Over match; verify victory/defeat dialog appears cleanly.

---

### BUG-CSO-07: Wide and Dot Balls Require Inappropriate Batting Input to Advance
- **Bug ID:** `BUG-CSO-07`
- **Severity:** Critical (P0)
- **Actual Behavior:** If the bowler bowls a wide delivery or the batsman leaves the ball outside off-stump, the ball flies off-screen and the game stays stuck in `'BOWLING'`. The user MUST click a shot button to force the ball to count.
- **Expected Behavior:** If the player leaves the ball or misses, the ball should pass the stumps to the wicketkeeper, auto-detect Dot Ball or Wide (+1 extra run, extra ball), update the scoreboard, and prepare the next delivery automatically.
- **Preconditions:** AI bowls a delivery; player takes no action.
- **Reproduction Steps:**
  1. Trigger a delivery.
  2. Do not press any batting button.
  3. Observe that the ball exits the screen and the game remains permanently in `'BOWLING'`.
- **Root Cause:** Delivery completion logic was located exclusively inside `playShot()` (lines 104–164). The canvas render loop had zero bounds-checking for `ball.y > canvas.height`.
- **Affected Files:**
  - `client/src/components/gamePlayer/CricketSuperOver.tsx`
- **Fix Recommendation:** In the physics/render loop, detect when `ball.y > batsman.y + 40` (passed keeper). Check if ball trajectory was outside wide lines. Trigger automated dot ball or wide ball completion with sound and commentary.
- **Automated Regression Coverage:** Assert unattended deliveries automatically resolve to dot ball or wide within 2 seconds.
- **Human Validation Requirement:** Watch delivery pass without touching controls; confirm it registers as a dot ball automatically.

---

### BUG-CSO-08: Overly Restricted Shot Outcomes (No Fours, Wides, or Realistic Extras)
- **Bug ID:** `BUG-CSO-08`
- **Severity:** Major
- **Actual Behavior:** Outcomes were restricted to simplistic formulas: `LOFT` yielded either 6 or caught out; `DRIVE` yielded 2 runs; four-run boundaries were rarely triggered; wides and singles were virtually absent.
- **Expected Behavior:** Full cricket scoring spectrum:
  - **4 Runs:** Ground drives beating fielders to the rope.
  - **6 Runs:** Clean lofted shots clearing boundary rope.
  - **1 or 2 Runs:** Defended nudges and controlled sweeps.
  - **Dot Ball (0):** Beaten by pace or left alone.
  - **Wide (+1):** Ball bowled outside tramline (re-bowled).
  - **Wickets:** Bowled (stumps hit) or Caught (aerial mis-hit).
- **Preconditions:** Play shots across different timings and shot types.
- **Reproduction Steps:**
  1. Play multiple deliveries with `DRIVE`, `LOFT`, and `SWEEP`.
  2. Check score distribution; note lack of boundary fours and extras.
- **Root Cause:** Rigid, narrow timing checks (`timingDist < 15`, `timingDist < 30`) without fielder positioning, angle calculations, or boundary ground physics.
- **Affected Files:**
  - `client/src/components/gamePlayer/CricketSuperOver.tsx`
- **Fix Recommendation:** Overhaul shot physics: calculate contact angle, ball velocity vector, fielder interception zones, and ball roll to boundary ropes for crisp 4s and 6s.
- **Automated Regression Coverage:** Test shot matrix asserting 0, 1, 2, 4, 6, Wide, and Wicket outcomes are all achievable.
- **Human Validation Requirement:** Successfully score 4s, 6s, 1s, and observe realistic wickets during play.

---

### BUG-CSO-09: Inoperable Speaker / Audio Control
- **Bug ID:** `BUG-CSO-09`
- **Severity:** Moderate
- **Actual Behavior:** Clicking the speaker icon (`#btn-toggle-sound`) in the platform modal toggles the visual icon, but Cricket Super Over produces zero sound.
- **Expected Behavior:** Audio toggle enables/mutes realistic 8-bit / synthesized sound effects: bat crack, wicket clatter, boundary roar, umpire whistle.
- **Preconditions:** Launch Cricket Super Over with system audio enabled.
- **Reproduction Steps:**
  1. Click `#btn-toggle-sound` in modal header.
  2. Play shots, hit boundaries, or get bowled.
  3. Note total silence.
- **Root Cause:**
  1. `GamePlayerModal.tsx` did not pass `soundEnabled={soundEnabled}` to `<CricketSuperOver />`.
  2. `CricketSuperOver.tsx` contained zero Web Audio API synthesis or sound routines.
- **Affected Files:**
  - `client/src/components/gamePlayer/GamePlayerModal.tsx`
  - `client/src/components/gamePlayer/CricketSuperOver.tsx`
- **Fix Recommendation:** Add Web Audio API synthesis in `CricketSuperOver.tsx` supporting:
  - `playBatCrack()` (willow-on-leather frequency pulse).
  - `playWicketClatter()` (wood collision resonance).
  - `playCrowdCheer()` (crowd noise filter).
  - `playUmpireWhistle()` (frequency chirp).
  Pass `soundEnabled` prop from `GamePlayerModal.tsx`.
- **Automated Regression Coverage:** Assert audio synthesis triggers without errors and respects `soundEnabled = false`.
- **Human Validation Requirement:** Toggle sound on and off; confirm audible bat crack and cheering when enabled.

---

### BUG-CSO-10: Inconsistent and Unrealistic Ball-Delivery Mechanics
- **Bug ID:** `BUG-CSO-10`
- **Severity:** Major
- **Actual Behavior:** Ball moves down pitch at fixed velocity with no arc, depth scaling, pitch elevation, or realistic seam bounce.
- **Expected Behavior:** 2.5D trajectory: ball starts smaller at bowler end, grows as it approaches, descends onto pitch, bounces with realistic coefficient of restitution, deviates on seam/swing, and rises toward batsman's waist/chest height.
- **Preconditions:** Observe ball trajectory during bowling.
- **Reproduction Steps:**
  1. Trigger delivery.
  2. Observe ball movement path.
- **Root Cause:** Ball animation in canvas loop only updated `b.x += b.vx; b.y += b.vy` with flat 2D linear addition and a crude `vy *= 0.95` at `y >= 140`.
- **Affected Files:**
  - `client/src/components/gamePlayer/CricketSuperOver.tsx`
- **Fix Recommendation:** Implement a 3D coordinate model (`x, y, z`) projected to 2D screen coordinates with parabolic gravity, bounce velocity loss, and shadow projection.
- **Automated Regression Coverage:** Assert ball coordinates follow parabolic arc with bounce point between 40% and 60% pitch length.
- **Human Validation Requirement:** Observe realistic ball flight, bounce, and rise before striking.
