const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('../server/src/app');
const { getDb } = require('../server/src/db');
const { authRateLimiter } = require('../server/src/modules/identity/rateLimiter');

// Configuration
const TEST_PORT = 5059;
let serverInstance = null;
const results = [];

function makeRequest(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const reqOptions = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: urlPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 5000
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          durationMs: duration,
          body: json
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout requesting ${urlPath}`));
    });

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function recordTest(id, story, ac, name, passed, expected, actual, durationMs = 0) {
  results.push({
    id,
    story,
    ac,
    name,
    passed,
    expected,
    actual,
    durationMs
  });
  const mark = passed ? '[PASS]' : '[FAIL]';
  console.log(`  ${mark} ${id} (${ac}): ${name} -> ${actual} (${durationMs}ms)`);
}

async function runSprint01Tests() {
  console.log(`\n======================================================================`);
  console.log(`  NEXUSPLAY SPRINT 01 — IDENTITY & SECURITY AUTOMATED TEST SUITE`);
  console.log(`  Stories: EP01-01, EP01-02, EP01-03, EP11-01`);
  console.log(`  Target: http://127.0.0.1:${TEST_PORT}`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(`======================================================================\n`);

  // Start isolated HTTP test server
  const app = createApp();
  const db = getDb();
  authRateLimiter.clearAll();

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`Test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  const testUser = {
    email: `player_${Date.now()}@nexusplay.gg`,
    password: 'ObsidianPlayer2026!',
    displayName: 'ObsidianKnight'
  };

  let sessionToken1 = null;
  let sessionToken2 = null;
  let resetToken = null;

  try {
    // ---------------------------------------------------------
    // EP01-01: User Registration
    // ---------------------------------------------------------
    console.log(`--- [EP01-01: User Registration] ---`);

    // AUTH-REG-01: Valid Registration (AC-1.1)
    {
      const res = await makeRequest('POST', '/api/v1/auth/register', {}, testUser);
      const passed = res.statusCode === 201 &&
        res.body?.success === true &&
        res.body?.data?.user?.email === testUser.email &&
        Boolean(res.body?.data?.token);
      if (passed) sessionToken1 = res.body.data.token;
      recordTest(
        'AUTH-REG-01',
        'EP01-01',
        'AC-1.1',
        'Successful registration returns HTTP 201 with user profile & session token',
        passed,
        'HTTP 201 with session token and player info',
        `HTTP ${res.statusCode} (token=${Boolean(res.body?.data?.token)})`,
        res.durationMs
      );
    }

    // AUTH-REG-02: Duplicate Email Registration (AC-1.2)
    {
      const res = await makeRequest('POST', '/api/v1/auth/register', {}, testUser);
      const passed = res.statusCode === 409 &&
        res.body?.error === 'Conflict';
      recordTest(
        'AUTH-REG-02',
        'EP01-01',
        'AC-1.2',
        'Duplicate email registration is rejected with HTTP 409 Conflict',
        passed,
        'HTTP 409 Conflict',
        `HTTP ${res.statusCode} (${res.body?.message})`,
        res.durationMs
      );
    }

    // AUTH-REG-03: Invalid Email Format (AC-1.3)
    {
      const res = await makeRequest('POST', '/api/v1/auth/register', {}, {
        email: 'invalid-email-no-at-domain',
        password: 'ValidPassword123!',
        displayName: 'TestPlayer'
      });
      const passed = res.statusCode === 400;
      recordTest(
        'AUTH-REG-03',
        'EP01-01',
        'AC-1.3',
        'Invalid email format rejected with HTTP 400 Bad Request',
        passed,
        'HTTP 400 Bad Request',
        `HTTP ${res.statusCode} (${res.body?.message})`,
        res.durationMs
      );
    }

    // AUTH-REG-04: Password too short < 8 chars (AC-1.3)
    {
      const res = await makeRequest('POST', '/api/v1/auth/register', {}, {
        email: `short_${Date.now()}@nexusplay.gg`,
        password: 'Pass1',
        displayName: 'ShortPassPlayer'
      });
      const passed = res.statusCode === 400 && res.body?.message?.includes('8 and 64');
      recordTest(
        'AUTH-REG-04',
        'EP01-01',
        'AC-1.3',
        'Password shorter than 8 chars rejected with HTTP 400 Bad Request',
        passed,
        'HTTP 400 with length constraint error',
        `HTTP ${res.statusCode} (${res.body?.message})`,
        res.durationMs
      );
    }

    // AUTH-REG-05: Password without numbers (AC-1.3)
    {
      const res = await makeRequest('POST', '/api/v1/auth/register', {}, {
        email: `nonum_${Date.now()}@nexusplay.gg`,
        password: 'PasswordNoNumbersHere',
        displayName: 'NoNumPlayer'
      });
      const passed = res.statusCode === 400 && res.body?.message?.includes('number');
      recordTest(
        'AUTH-REG-05',
        'EP01-01',
        'AC-1.3',
        'Password without numbers rejected with HTTP 400 Bad Request',
        passed,
        'HTTP 400 with number requirement error',
        `HTTP ${res.statusCode} (${res.body?.message})`,
        res.durationMs
      );
    }

    // AUTH-REG-06: Display name too short < 2 chars (AC-1.3)
    {
      const res = await makeRequest('POST', '/api/v1/auth/register', {}, {
        email: `shortname_${Date.now()}@nexusplay.gg`,
        password: 'Password123!',
        displayName: 'X'
      });
      const passed = res.statusCode === 400 && res.body?.message?.includes('Display name');
      recordTest(
        'AUTH-REG-06',
        'EP01-01',
        'AC-1.3',
        'Display name under 2 chars rejected with HTTP 400 Bad Request',
        passed,
        'HTTP 400 with display name constraint error',
        `HTTP ${res.statusCode} (${res.body?.message})`,
        res.durationMs
      );
    }

    // ---------------------------------------------------------
    // EP01-02: User Authentication (Sign-in / Sign-out)
    // ---------------------------------------------------------
    console.log(`\n--- [EP01-02: User Authentication] ---`);

    // AUTH-LOG-01: Successful Login (AC-2.1)
    {
      const res = await makeRequest('POST', '/api/v1/auth/login', {}, {
        email: testUser.email,
        password: testUser.password
      });
      const passed = res.statusCode === 200 &&
        res.body?.success === true &&
        res.body?.data?.user?.email === testUser.email &&
        Boolean(res.body?.data?.token);
      if (passed) sessionToken2 = res.body.data.token;
      recordTest(
        'AUTH-LOG-01',
        'EP01-02',
        'AC-2.1',
        'Valid credentials return HTTP 200 with session token & player profile',
        passed,
        'HTTP 200 with session token',
        `HTTP ${res.statusCode} (token=${Boolean(res.body?.data?.token)})`,
        res.durationMs
      );
    }

    // AUTH-LOG-02: Invalid Password (AC-2.3)
    {
      const res = await makeRequest('POST', '/api/v1/auth/login', {}, {
        email: testUser.email,
        password: 'WrongPassword999!'
      });
      const passed = res.statusCode === 401 &&
        res.body?.message === 'Invalid email or password';
      recordTest(
        'AUTH-LOG-02',
        'EP01-02',
        'AC-2.3',
        'Incorrect password returns HTTP 401 with generic error message',
        passed,
        'HTTP 401 "Invalid email or password"',
        `HTTP ${res.statusCode} (${res.body?.message})`,
        res.durationMs
      );
    }

    // AUTH-LOG-03: Non-existent Email (Anti-Enumeration) (AC-2.3)
    {
      const res = await makeRequest('POST', '/api/v1/auth/login', {}, {
        email: 'unregistered_ghost_user@nexusplay.gg',
        password: 'SomePassword123!'
      });
      const passed = res.statusCode === 401 &&
        res.body?.message === 'Invalid email or password';
      recordTest(
        'AUTH-LOG-03',
        'EP01-02',
        'AC-2.3',
        'Non-existent email returns identical HTTP 401 (prevents user enumeration)',
        passed,
        'HTTP 401 "Invalid email or password"',
        `HTTP ${res.statusCode} (${res.body?.message})`,
        res.durationMs
      );
    }

    // AUTH-LOG-04: Session Verification via /api/v1/auth/me
    {
      const res = await makeRequest('GET', '/api/v1/auth/me', {
        Authorization: `Bearer ${sessionToken2}`
      });
      const passed = res.statusCode === 200 && res.body?.user?.email === testUser.email;
      recordTest(
        'AUTH-LOG-04',
        'EP01-02',
        'AC-2.1',
        'Session token validates successfully via /api/v1/auth/me',
        passed,
        'HTTP 200 with authenticated player context',
        `HTTP ${res.statusCode} (user=${res.body?.user?.displayName})`,
        res.durationMs
      );
    }

    // AUTH-LOG-05: Logout and Session Invalidation (AC-2.2)
    {
      const res = await makeRequest('POST', '/api/v1/auth/logout', {
        Authorization: `Bearer ${sessionToken2}`
      }, { token: sessionToken2 });
      const passed = res.statusCode === 200 && res.body?.success === true;
      recordTest(
        'AUTH-LOG-05',
        'EP01-02',
        'AC-2.2',
        'Logout invalidates session token with HTTP 200 OK',
        passed,
        'HTTP 200 with session revoked confirmation',
        `HTTP ${res.statusCode} (${res.body?.message})`,
        res.durationMs
      );
    }

    // AUTH-LOG-06: Revoked Token Rejected (AC-2.2)
    {
      const res = await makeRequest('GET', '/api/v1/auth/me', {
        Authorization: `Bearer ${sessionToken2}`
      });
      const passed = res.statusCode === 401;
      recordTest(
        'AUTH-LOG-06',
        'EP01-02',
        'AC-2.2',
        'Revoked session token rejected on subsequent requests with HTTP 401',
        passed,
        'HTTP 401 Unauthorized',
        `HTTP ${res.statusCode} (${res.body?.message})`,
        res.durationMs
      );
    }

    // ---------------------------------------------------------
    // EP01-03: Password Recovery
    // ---------------------------------------------------------
    console.log(`\n--- [EP01-03: Password Recovery] ---`);

    // AUTH-REC-01: Forgot Password for Valid User (AC-3.1)
    {
      const res = await makeRequest('POST', '/api/v1/auth/forgot-password', {}, {
        email: testUser.email
      });
      const passed = res.statusCode === 200 &&
        res.body?.message?.includes('instructions have been sent') &&
        Boolean(res.body?.resetToken);
      if (passed) resetToken = res.body.resetToken;
      recordTest(
        'AUTH-REC-01',
        'EP01-03',
        'AC-3.1',
        'Forgot password returns generic HTTP 200 and generates 15-min reset token',
        passed,
        'HTTP 200 with generic instructions message and token',
        `HTTP ${res.statusCode} (token=${Boolean(resetToken)})`,
        res.durationMs
      );
    }

    // AUTH-REC-02: Forgot Password for Non-existent User (Anti-Enumeration) (AC-3.1)
    {
      const res = await makeRequest('POST', '/api/v1/auth/forgot-password', {}, {
        email: 'ghost_nonexistent_user@nexusplay.gg'
      });
      const passed = res.statusCode === 200 &&
        res.body?.message?.includes('instructions have been sent') &&
        !res.body?.resetToken;
      recordTest(
        'AUTH-REC-02',
        'EP01-03',
        'AC-3.1',
        'Forgot password for unknown email returns identical HTTP 200 (anti-enumeration)',
        passed,
        'HTTP 200 identical generic response',
        `HTTP ${res.statusCode} (${res.body?.message})`,
        res.durationMs
      );
    }

    // AUTH-REC-03: Reset Password with Valid Token (AC-3.2)
    const newTestPassword = 'NewObsidianPass2026!';
    {
      const res = await makeRequest('POST', '/api/v1/auth/reset-password', {}, {
        token: resetToken,
        newPassword: newTestPassword
      });
      const passed = res.statusCode === 200 && res.body?.success === true;
      recordTest(
        'AUTH-REC-03',
        'EP01-03',
        'AC-3.2',
        'Reset password with valid token updates credentials with HTTP 200',
        passed,
        'HTTP 200 password reset successful',
        `HTTP ${res.statusCode} (${res.body?.message})`,
        res.durationMs
      );
    }

    // AUTH-REC-04: Re-using the same reset token (Single-Use Token) (AC-3.2)
    {
      const res = await makeRequest('POST', '/api/v1/auth/reset-password', {}, {
        token: resetToken,
        newPassword: 'AnotherPassword999!'
      });
      const passed = res.statusCode === 400 &&
        res.body?.message?.includes('already been used');
      recordTest(
        'AUTH-REC-04',
        'EP01-03',
        'AC-3.2',
        'Re-using already used reset token rejected with HTTP 400 Bad Request',
        passed,
        'HTTP 400 token already used',
        `HTTP ${res.statusCode} (${res.body?.message})`,
        res.durationMs
      );
    }

    // AUTH-REC-05: Session Revocation on Password Reset (AC-3.3)
    {
      // Verify sessionToken1 (which was active before password reset) is now revoked!
      const res = await makeRequest('GET', '/api/v1/auth/me', {
        Authorization: `Bearer ${sessionToken1}`
      });
      const passed = res.statusCode === 401;
      recordTest(
        'AUTH-REC-05',
        'EP01-03',
        'AC-3.3',
        'Password reset immediately revokes all prior active sessions across devices',
        passed,
        'HTTP 401 Unauthorized for prior active session',
        `HTTP ${res.statusCode} (${res.body?.message})`,
        res.durationMs
      );
    }

    // AUTH-REC-06: Log In with New Password (AC-3.2)
    {
      const res = await makeRequest('POST', '/api/v1/auth/login', {}, {
        email: testUser.email,
        password: newTestPassword
      });
      const passed = res.statusCode === 200 && res.body?.success === true;
      recordTest(
        'AUTH-REC-06',
        'EP01-03',
        'AC-3.2',
        'Successfully login with updated password following reset',
        passed,
        'HTTP 200 with new active session',
        `HTTP ${res.statusCode} (token=${Boolean(res.body?.data?.token)})`,
        res.durationMs
      );
    }

    // AUTH-REC-07: Expired Reset Token Handling (AC-3.3)
    {
      // Insert an expired token directly into password_resets to test exact boundary
      const expiredToken = 'expired_test_token_abcdef1234567890';
      const expiredPlayer = db.get('SELECT id FROM players WHERE email = ?', [testUser.email]);
      const pastDate = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute in past
      db.run(
        `INSERT INTO password_resets (id, player_id, token, expires_at, used)
         VALUES ('rst-expired-test', ?, ?, ?, 0)`,
        [expiredPlayer.id, expiredToken, pastDate]
      );

      const res = await makeRequest('POST', '/api/v1/auth/reset-password', {}, {
        token: expiredToken,
        newPassword: 'SomeValidPassword99!'
      });
      const passed = res.statusCode === 400 && res.body?.message?.includes('expired');
      recordTest(
        'AUTH-REC-07',
        'EP01-03',
        'AC-3.3',
        'Expired reset token (>15m) rejected with HTTP 400 Bad Request',
        passed,
        'HTTP 400 token has expired',
        `HTTP ${res.statusCode} (${res.body?.message})`,
        res.durationMs
      );
    }

    // ---------------------------------------------------------
    // EP11-01: Authentication Rate Limiting
    // ---------------------------------------------------------
    console.log(`\n--- [EP11-01: Authentication Rate Limiting] ---`);

    // AUTH-RAT-01: Consecutive Failed Logins trigger 429 on 5th attempt (AC-38.1, AC-38.2)
    {
      const bruteUser = {
        email: `victim_${Date.now()}@nexusplay.gg`,
        password: 'ObsidianTargetPass1!'
      };

      // Register target user first
      await makeRequest('POST', '/api/v1/auth/register', {}, {
        email: bruteUser.email,
        password: bruteUser.password,
        displayName: 'VictimTarget'
      });

      // Clear limiter for clean test
      authRateLimiter.clearAll();

      let fifthAttemptRes = null;
      let sixthAttemptRes = null;

      // Fail attempts 1 through 4 (should return 401)
      for (let i = 1; i <= 4; i++) {
        const res = await makeRequest('POST', '/api/v1/auth/login', {}, {
          email: bruteUser.email,
          password: 'IncorrectPassword!'
        });
        if (res.statusCode !== 401) {
          console.error(`Unexpected status on attempt ${i}: ${res.statusCode}`);
        }
      }

      // 5th failed attempt: should trigger lockout (HTTP 429) per AC-38.2
      fifthAttemptRes = await makeRequest('POST', '/api/v1/auth/login', {}, {
        email: bruteUser.email,
        password: 'IncorrectPassword!'
      });

      // 6th attempt: lockout enforced, must return 429 with Retry-After header
      sixthAttemptRes = await makeRequest('POST', '/api/v1/auth/login', {}, {
        email: bruteUser.email,
        password: 'IncorrectPassword!'
      });

      const passed = fifthAttemptRes.statusCode === 429 &&
        sixthAttemptRes.statusCode === 429 &&
        Boolean(sixthAttemptRes.headers['retry-after']);

      recordTest(
        'AUTH-RAT-01',
        'EP11-01',
        'AC-38.2',
        '5 consecutive failed login attempts trigger HTTP 429 lockout with Retry-After header',
        passed,
        'HTTP 429 on 5th failure with Retry-After header',
        `5th: HTTP ${fifthAttemptRes.statusCode}, 6th: HTTP ${sixthAttemptRes.statusCode} (retryAfter=${sixthAttemptRes.headers['retry-after']}s)`,
        sixthAttemptRes.durationMs
      );
    }

    // AUTH-RAT-02: Rate limiter isolation across different accounts (AC-38.3)
    {
      const anotherEmail = `unlocked_${Date.now()}@nexusplay.gg`;
      const pass = 'TargetPass123!';
      await makeRequest('POST', '/api/v1/auth/register', {}, {
        email: anotherEmail,
        password: pass,
        displayName: 'UnlockedUser'
      });

      // Attempt login with correct password for different email: should succeed even while first email is locked
      const res = await makeRequest('POST', '/api/v1/auth/login', {}, {
        email: anotherEmail,
        password: pass
      });

      const passed = res.statusCode === 200 && res.body?.success === true;
      recordTest(
        'AUTH-RAT-02',
        'EP11-01',
        'AC-38.3',
        'Rate limit lockout isolates by IP+email composite key without blocking other users',
        passed,
        'HTTP 200 for independent account',
        `HTTP ${res.statusCode} (auth allowed for different email)`,
        res.durationMs
      );
    }

    // AUTH-RAT-03: Successful login resets counter before lockout threshold (AC-38.3)
    {
      const resetCounterUser = {
        email: `reset_counter_${Date.now()}@nexusplay.gg`,
        password: 'GoodPassword2026!'
      };

      await makeRequest('POST', '/api/v1/auth/register', {}, {
        email: resetCounterUser.email,
        password: resetCounterUser.password,
        displayName: 'CounterResetPlayer'
      });

      // Fail 3 times (below threshold of 5)
      for (let i = 0; i < 3; i++) {
        await makeRequest('POST', '/api/v1/auth/login', {}, {
          email: resetCounterUser.email,
          password: 'WrongPassword!'
        });
      }

      // Enter correct credentials on 4th attempt
      const successRes = await makeRequest('POST', '/api/v1/auth/login', {}, {
        email: resetCounterUser.email,
        password: resetCounterUser.password
      });

      // Now fail again: attempt count should be 1, NOT 4 or 5
      const failAfterSuccessRes = await makeRequest('POST', '/api/v1/auth/login', {}, {
        email: resetCounterUser.email,
        password: 'WrongPassword!'
      });

      const passed = successRes.statusCode === 200 &&
        failAfterSuccessRes.statusCode === 401 &&
        failAfterSuccessRes.body?.remainingAttempts === 4;

      recordTest(
        'AUTH-RAT-03',
        'EP11-01',
        'AC-38.3',
        'Successful login clears failed attempt counter, preventing premature lockout',
        passed,
        'HTTP 200 resets counter; subsequent failure shows remainingAttempts=4',
        `Success: HTTP ${successRes.statusCode}, Next failure: remainingAttempts=${failAfterSuccessRes.body?.remainingAttempts}`,
        failAfterSuccessRes.durationMs
      );
    }

    // ---------------------------------------------------------
    // Security & Data Isolation
    // ---------------------------------------------------------
    console.log(`\n--- [Security & Authorization Isolation] ---`);

    // AUTH-SEC-01: Protected endpoint without Authorization header (EP01-02)
    {
      const res = await makeRequest('GET', '/api/v1/auth/me');
      const passed = res.statusCode === 401;
      recordTest(
        'AUTH-SEC-01',
        'EP01-02',
        'AC-2.1',
        'Accessing protected /api/v1/auth/me without token returns HTTP 401 Unauthorized',
        passed,
        'HTTP 401 Unauthorized',
        `HTTP ${res.statusCode} (${res.body?.message})`,
        res.durationMs
      );
    }

    // AUTH-SEC-02: Protected endpoint with forged/tampered token (EP01-02)
    {
      const res = await makeRequest('GET', '/api/v1/auth/me', {
        Authorization: 'Bearer forged_tampered_token_999999999999999999999'
      });
      const passed = res.statusCode === 401;
      recordTest(
        'AUTH-SEC-02',
        'EP01-02',
        'AC-2.1',
        'Accessing protected endpoint with invalid token returns HTTP 401 Unauthorized',
        passed,
        'HTTP 401 Unauthorized',
        `HTTP ${res.statusCode} (${res.body?.message})`,
        res.durationMs
      );
    }

  } finally {
    // Close test server
    if (serverInstance) {
      await new Promise(r => serverInstance.close(r));
      console.log(`\nTest server closed.`);
    }
  }

  // Summary & Artifact persistence
  const total = results.length;
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const allPassed = failedCount === 0;

  console.log(`\n======================================================================`);
  console.log(`  SPRINT 01 TEST RESULTS SUMMARY`);
  console.log(`  Total Executed Tests: ${total}`);
  console.log(`  Passed              : ${passedCount}`);
  console.log(`  Failed              : ${failedCount}`);
  console.log(`  Overall Status      : ${allPassed ? 'ALL TESTS PASSED (100% SUCCESS)' : 'FAILED'}`);
  console.log(`======================================================================\n`);

  // Save evidence to evidence/sprint-01/test-results/
  const evidenceDir = path.join(__dirname, '..', 'evidence', 'sprint-01', 'test-results');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const payload = {
    testSuite: 'NexusPlay Sprint 01 Identity & Security Automated Verification',
    timestamp: new Date().toISOString(),
    totalTests: total,
    passedCount,
    failedCount,
    allPassed,
    epicsCovered: ['EP01-01', 'EP01-02', 'EP01-03', 'EP11-01'],
    acceptanceCriteriaCovered: [
      'AC-1.1', 'AC-1.2', 'AC-1.3',
      'AC-2.1', 'AC-2.2', 'AC-2.3',
      'AC-3.1', 'AC-3.2', 'AC-3.3',
      'AC-38.1', 'AC-38.2', 'AC-38.3'
    ],
    tests: results
  };

  const filename = `sprint-01-auth-test-results-${timestampStr}.json`;
  const filePath = path.join(evidenceDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  console.log(`Test evidence JSON saved: ${filePath}`);

  return { allPassed, results, filePath };
}

if (require.main === module) {
  runSprint01Tests().then(({ allPassed }) => {
    process.exit(allPassed ? 0 : 1);
  }).catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
}

module.exports = { runSprint01Tests };
