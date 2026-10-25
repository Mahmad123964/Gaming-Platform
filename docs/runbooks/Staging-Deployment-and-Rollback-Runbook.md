# NexusPlay — Staging Deployment & Release Rollback Runbook

**Runbook Identifier:** NP-SRE-RBK-002  
**Target Environment:** Staging (`NODE_ENV=staging`, Port 5050)  
**Execution Automation:** `scripts/deploy-staging.js`, `scripts/rollback-staging.js`  
**Compliance Standard:** EP13-01 (Deployment Automation), EP13-02 (Release Rollback Procedure)  
**Document Version:** 2.0 (Sprint 07 Final SRE Certification Baseline)  

---

## 1. Overview & Rollback Philosophy

A rollback is defined as the verified, non-destructive physical restoration of a known-good staging release following a candidate deployment failure or post-deployment incident.

> **CRITICAL SRE DIRECTIVE:**  
> A rollback is **NOT** successful merely because a script updates deployment metadata or prints "Rollback Complete."  
> It must prove that physical executable artifacts are genuinely restored, that the active server process serves the restored release, that the artifact SHA-256 hash and Git commit match the known-good baseline, and that the restored platform passes automated health and smoke tests without application data loss.

---

## 2. Release Artifact Packaging & Last-Known-Good Baseline

Every candidate deployment (`scripts/deploy-staging.js`) and Last-Known-Good (LKG) release packages and preserves physical executable files:

1. **Physical Artifact Preservation:**
   - Candidate build output (`client/dist/`) is copied into an immutable artifact repository: `evidence/sprint-07/deployments/artifacts/<deploymentId>/dist/`.
   - Artifacts include compiled JavaScript bundles, CSS assets, SVGs, and `index.html`.
2. **Cryptographic Integrity & Manifest:**
   - A SHA-256 hash is computed for the entry artifact (`index.html`).
   - A complete `release-manifest.json` is generated listing every file, byte size, and SHA-256 hash.
3. **Last-Known-Good Baseline:**
   - Upon successful health and smoke test verification (5/5 passed), the deployment is marked `status = 'SUCCESS'`, and `evidence/sprint-07/deployments/last-known-good.json` is updated with the version, commit, deployment ID, and artifact hash.

---

## 3. Physical Rollback Engine & Verification Workflow

```
[STAGING DEPLOYMENT FAILURE DETECTED]
                │
                ▼
   [Identify LKG Release in DB / last-known-good.json]
                │
                ▼
   [Physical File Restoration]
   • Purge existing client/dist/ directory
   • Copy preserved LKG files from artifacts/<lkgId>/dist/ to client/dist/
   • Recompute SHA-256 hash of restored index.html
   • Assert restored SHA-256 EXACTLY matches LKG SHA-256
                │
                ▼
   [Active Server Verification]
   • Probe http://localhost:5050/api/health (Database connected)
   • Probe http://localhost:5050/health (Platform status)
   • Probe http://localhost:5050/ (Active HTTP response verification)
   • Verify GET /api/v1/admin/operations/deployment/status confirms isRollback: true
                │
                ▼
   [Execute Full Smoke Suite (5/5 checks)]
                │
          ┌──────┴──────┐
          ▼             ▼
   [HEALTHY: 200]   [UNHEALTHY: Timeout/500/Hash Mismatch]
          │             │
          │             ▼
          │       [HALT PROMOTION & EXIT 1]
          │       [Print Emergency Escalation Instructions]
          │       [Log DEPLOYMENT_ROLLBACK_FAILED in Audit]
          │       [Trigger Sev-1 Emergency Broadcast]
          ▼
   [Data Integrity Check: Assert players, games, audit tables intact]
   [RECORD DEPLOYMENT_ROLLBACK_COMPLETED in SQLite audit_events]
   [Save Machine-Readable Evidence: rollback-execution-evidence.json]
   [Declare Staging Restored & Clean Exit 0]
```

---

## 4. Operational Execution Procedures

### 4.1 Standard Automated Rollback Execution
To initiate an automated, physical rollback to the Last-Known-Good staging baseline:
```bash
node scripts/rollback-staging.js
```
To specify a designated target release version:
```bash
node scripts/rollback-staging.js --target=v0.7.0
```

### 4.2 Controlled Failure Verification Test (Task 1 SRE Certification)
To execute the complete 10-point controlled failure test (deploy distinguishable candidate release, inject failure, execute rollback, prove physical restoration, hash match, active server serving restored release, smoke tests pass, zero data loss, non-zero exit on failure):
```bash
node scripts/verify-controlled-rollback.js
```
Evidence is captured in:
`evidence/sprint-07/deployments/controlled-rollback-verification.json`

### 4.3 Negative Fault Testing (AC-46.3 Verification)
To safely test the failure detection, non-zero exit code (1), and escalation path:
```bash
node scripts/rollback-staging.js --simulate-rollback-failure
```

---

## 5. Non-Destructive Data Preservation Guarantee

- **Zero Database Destruction:** The rollback engine modifies only deployment release pointers and physical frontend artifacts (`client/dist/`).
- **No Table Drops or Migrations Rolled Back Blindly:** Relational player data (`players`), game catalog (`games`), player progress (`player_game_progress`), and immutable audit trails (`audit_events`) remain completely untouched and intact during rollback execution.

---

## 6. Failure Escalation Guidance (AC-46.3)

If a rollback attempt fails post-recovery health probing:
1. **Immediate Pipeline Halt:** The deployment pipeline freezes promotion immediately.
2. **Emergency Pager Broadcast:** Alert the On-Call Incident Commander via `pagerduty.nexusplay.internal/sre-primary`.
3. **Preserve Diagnostic Artifacts:** Do NOT restart or wipe the database blindly. Capture stdout/stderr and SQLite WAL state.
4. **Database Recovery:** If SQLite file corruption is diagnosed, restore the pre-deployment snapshot from `data/snapshots/`.
5. **Post-Mortem Requirement:** An SRE Post-Mortem document must be published within 24 hours of any Sev-1 rollback failure.
