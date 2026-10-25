# NexusPlay — Staging Deployment & Release Rollback Runbook

**Runbook Identifier:** NP-SRE-RBK-002  
**Target Environment:** Staging (`NODE_ENV=staging`, Port 5050)  
**Execution Automation:** `scripts/deploy-staging.js`, `scripts/rollback-staging.js`  
**Compliance Standard:** EP13-01 (Deployment Automation), EP13-02 (Release Rollback Procedure)  

---

## 1. Overview & Rollback Philosophy

A rollback is defined as the verified, non-destructive restoration of a known-good staging release following a candidate deployment failure or post-deployment incident.

> **CRITICAL SRE DIRECTIVE:**  
> A rollback is **NOT** successful merely because a script prints "Rollback Complete."  
> It must prove that a known-good release is genuinely restored, responding, and passing operational health checks.

---

## 2. Release Identification & Last-Known-Good (LKG) Metadata

Every release candidate and Last-Known-Good release is authoritatively tracked with:
1. **Release Version:** Semantic version identifier (e.g., `v0.7.0`, `v0.6.0`).
2. **Git Commit SHA:** Exact Git commit hash of the candidate.
3. **Deployment Timestamp:** ISO 8601 creation timestamp.
4. **Smoke Suite Evidence:** Full audit proof of 5/5 passing smoke checks.
5. **Persistence Location:** SQLite table `deployments` and `evidence/sprint-07/deployments/last-known-good.json`.

---

## 3. Automated Rollback Workflow

```
[STAGING DEPLOYMENT FAILURE DETECTED]
                │
                ▼
   [Identify LKG Release in DB] ──(Fallback)──► [evidence/.../last-known-good.json]
                │
                ▼
   [Restore Prior Target Version]
                │
                ▼
   [Health Probing: 15 Attempts] ──► http://localhost:5050/api/health
                │
         ┌──────┴──────┐
         ▼             ▼
   [HEALTHY: 200]   [UNHEALTHY: Timeout/500]
         │             │
         │             ▼
         │       [HALT PROMOTION & EXIT 1]
         │       [Print Emergency Escalation Instructions]
         │       [Log DEPLOYMENT_ROLLBACK_FAILED in Audit]
         │       [Trigger Sev-1 Emergency Broadcast]
         ▼
   [RECORD DEPLOYMENT_ROLLBACK_COMPLETED]
   [Save JSON Evidence to evidence/sprint-07/deployments/]
   [Declare Staging Restored & Clean Exit 0]
```

---

## 4. Operational Execution Procedures

### 4.1 Standard Automated Rollback Execution
To initiate a verified rollback to the Last-Known-Good staging baseline:
```bash
node scripts/rollback-staging.js
```
To specify a designated target release version:
```bash
node scripts/rollback-staging.js --target=v0.6.0
```

### 4.2 Negative Fault Testing (AC-46.3 Verification)
To safely test the failure detection, non-zero exit code (1), and escalation path without destroying staging infrastructure:
```bash
node scripts/rollback-staging.js --simulate-rollback-failure
```

---

## 5. Failure Escalation Guidance (AC-46.3)

If a rollback attempt fails post-recovery health probing:
1. **Immediate Pipeline Halt:** The deployment pipeline freezes promotion immediately.
2. **Emergency Pager Broadcast:** Alert the On-Call Incident Commander via `pagerduty.nexusplay.internal/sre-primary`.
3. **Preserve Diagnostic Artifacts:** Do NOT restart or wipe the database blindly. Capture stdout/stderr and SQLite WAL state.
4. **Database Recovery:** If SQLite file corruption is diagnosed, restore the pre-deployment snapshot from `data/snapshots/`.
5. **Post-Mortem Requirement:** An SRE Post-Mortem document must be published within 24 hours of any Sev-1 rollback failure.
