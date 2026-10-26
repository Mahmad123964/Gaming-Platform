# PRODUCT OWNER MANUAL UAT EXPLORATORY CHECKLIST
**Game Under Test:** Cricket Super Over (`cricket-super-over`, Game #54)  
**Incident Reference:** `INC-2026-10-CRICKET-01`  
**Target Environment:** Staging Platform (`http://localhost:5050`)  
**Branch:** `recovery/m35-quality-incident-cricket`  
**Status:** **READY FOR PRODUCT OWNER TESTING**

---

## 1. Test Environment Setup

1. Ensure the staging backend server is active:
   ```bash
   node server/src/index.js --env=staging --port=5050
   ```
2. Open Google Chrome or any modern browser and navigate to:
   `http://localhost:5050`

---

## 2. Step-by-Step Exploratory Verification Steps

### Test Step 1: Catalog Discovery & Thumbnail Inspection (DEF-01)
- [ ] Scroll through the game catalog or use the search bar to find "Cricket Super Over".
- [ ] Verify that the game card is clearly titled and visually distinct.
- [ ] Click the card to open the Details Modal, then click **"Launch Game"** (`#btn-launch-game`).

### Test Step 2: Fullscreen & Responsive Layout (DEF-02)
- [ ] In the Game Player Modal header, click the **Fullscreen** button (`#btn-toggle-fullscreen`).
- [ ] Verify that the game canvas and scoreboard expand cleanly to fill the stage without being shrunk into a tiny 360×260 box.
- [ ] Toggle fullscreen off and verify the modal layout returns smoothly.

### Test Step 3: Visual Presentation & 2.5D Pitch (DEF-03, DEF-10)
- [ ] Observe the cricket pitch graphics:
  - Perspective trapezoid pitch narrower at bowler's end and wider at batsman's end.
  - Turf grass striping with boundary rope marking.
  - Popping crease, bowling crease, and wide tramlines.
  - Three wooden stumps with orange bails.
  - Batsman in Nexus blue jersey with white pads.

### Test Step 4: AI Bowler Delivery & Role Coherence (DEF-04)
- [ ] Observe that you control the **Batsman**.
- [ ] Notice the bowler variation badge (e.g. `⚡ Fast Yorker`, `🌀 Outswinger`, `💥 Sharp Bouncer`, `🐢 Slower Ball`).
- [ ] Click **"🏏 Bowl Now"** or let the 3-second countdown automatically deliver the ball.
- [ ] Observe the ball:
  - Starts smaller at the bowler's end.
  - Has a visible ground shadow directly below it.
  - Drops, bounces realistically on the pitch, and rises toward the batsman.

### Test Step 5: Automated Dot Ball & Wide Ball Resolution (DEF-05, DEF-07)
- [ ] When a delivery is bowled, **do not press any batting button** (leave the ball).
- [ ] Verify that as the ball passes the batsman:
  - If on the stumps: Wickets fall ("BOWLED HIM!").
  - If outside the wide tramline: Umpire signals **WIDE BALL** (+1 extra run, ball is re-bowled, whistle sounds).
  - If normal delivery left alone: Commentary announces **Dot Ball**, and balls bowled increments without freezing!
- [ ] Verify that you **never** have to press a batting button to advance a dot ball.

### Test Step 6: Batting Shots & Scoring (DEF-08)
- [ ] Test the four shot types using either the on-screen buttons or keyboard shortcuts:
  - **Spacebar / Drive (`#btn-cso-drive`):** Crisp ground shot. Test timing for 1, 2, or 4 runs.
  - **Up Arrow / Loft (`#btn-cso-loft`):** High aerial stroke. Perfect timing delivers a 6 into the stands. Mistiming results in a catch!
  - **C Key / Cut (`#btn-cso-cut`):** Square cut piercing the offside gap for 2 or 4 runs.
  - **Down Arrow / Defend (`#btn-cso-defend`):** Solid forward defense blocking yorkers safely.
- [ ] Test batsman stance adjustment:
  - **Left Arrow / "Move Left":** Steps batsman to off-stump.
  - **Right Arrow / "Move Right":** Steps batsman to leg-stump.

### Test Step 7: Audio Synthesis & Sound Toggle (DEF-09)
- [ ] Click the **Sound Toggle** icon (`#btn-toggle-sound`) in the top bar to ensure sound is enabled.
- [ ] Hit a boundary and listen for:
  - Crisp wooden bat-on-ball crack.
  - Crowd cheer resonance on 4s and 6s.
  - Umpire whistle on wide balls.
  - Wooden clatter when bowled.
- [ ] Click the Sound Toggle icon to mute; verify that the game is completely silent.

### Test Step 8: Innings Completion & Victory / Defeat Screen (DEF-05, DEF-06)
- [ ] Continue playing deliveries until one of three conditions occurs:
  1. **Nexus Stars chase the target (runs >= 16):**
     - Verify green victory overlay appears: **"🏆 NEXUS STARS WIN SUPER OVER!"**
  2. **Two wickets fall (wickets = 2):**
     - Verify defeat overlay appears: **"❌ ALL OUT! 2 wickets down."**
  3. **Six legal balls are bowled without reaching target:**
     - Verify match over overlay appears.
- [ ] Verify that the final scorecard displays: Total Runs, Wickets, Balls, 4s, and 6s.
- [ ] Verify that the game **does not freeze** at 12 runs or any other score.

### Test Step 9: In-Flight Session Reset & Restart
- [ ] On the match-over overlay, click **"🏏 Play Another Super Over"** (`#btn-cso-restart-overlay`).
- [ ] Verify:
  - Runs reset to 0.
  - Wickets reset to 0.
  - Balls reset to 0.
  - Bails restore onto stumps.
  - Commentary resets to opening instructions.

### Test Step 10: Mobile Touch Usability (Chrome DevTools Mobile Mode)
- [ ] In Chrome, press `F12` and click the Device Toggle icon (`Ctrl+Shift+M`).
- [ ] Select **iPhone SE (375 × 667)**.
- [ ] Verify that the canvas, scoreboard, commentary, and all 7 touch buttons fit without horizontal scrolling.
- [ ] Play a ball using only touch clicks.

---

## 3. Product Owner Acceptance Decision

| Criteria | Result | PO Initials | Notes |
|:---|:---:|:---:|:---|
| 1. Clear Player/AI Separation | [ ] PASS  [ ] FAIL | ___________ | |
| 2. Full 6-Ball Innings Playability | [ ] PASS  [ ] FAIL | ___________ | |
| 3. No Freezing at 12 Runs / Terminal | [ ] PASS  [ ] FAIL | ___________ | |
| 4. Auto-completion of Dots / Wides | [ ] PASS  [ ] FAIL | ___________ | |
| 5. Functional 4s, 6s, 2s, 1s, Wickets | [ ] PASS  [ ] FAIL | ___________ | |
| 6. Responsive Layout / Fullscreen | [ ] PASS  [ ] FAIL | ___________ | |
| 7. Audible Web Audio Sound Effects | [ ] PASS  [ ] FAIL | ___________ | |
| 8. Clean Session Restart | [ ] PASS  [ ] FAIL | ___________ | |

**Final Product Owner Determination:**  
`[  ] ACCEPT RECOVERY PROTOTYPE`  
`[  ] REJECT RECOVERY PROTOTYPE (Specify Deficiencies)`  

*Signature:* _______________________________________  
*Date:* ________________________
