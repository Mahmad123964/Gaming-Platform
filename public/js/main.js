// NexusPlay Online Gaming Platform - Frontend Telemetry Client (Sprint 00 Baseline)
document.addEventListener('DOMContentLoaded', () => {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const latencyText = document.getElementById('latencyText');
  const envBadge = document.getElementById('envBadge');
  const btnRefresh = document.getElementById('btnRefreshHealth');
  const metricUptime = document.getElementById('metricUptime');
  const metricMemory = document.getElementById('metricMemory');
  const badgeApi = document.getElementById('badgeApi');
  const badgeDb = document.getElementById('badgeDb');
  const badgeWs = document.getElementById('badgeWs');
  const terminalOutput = document.getElementById('terminalOutput');
  const terminalTime = document.getElementById('terminalTime');

  function logTerminal(message, type = 'dim') {
    if (!terminalOutput) return;
    const time = new Date().toLocaleTimeString();
    const span = document.createElement('span');
    span.className = `t-${type}`;
    span.textContent = `\n[${time}] ${message}`;
    terminalOutput.appendChild(span);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }

  async function probeHealth() {
    const start = performance.now();
    try {
      const response = await fetch('/api/health');
      const latency = Math.round(performance.now() - start);
      latencyText.textContent = `${latency} ms`;

      if (response.ok) {
        const data = await response.json();
        statusDot.className = 'status-dot pulse';
        statusText.textContent = 'Gateway Online';
        envBadge.textContent = (data.environment || 'STAGING').toUpperCase();
        
        badgeApi.textContent = '200 OK';
        badgeApi.className = 'badge badge-success';

        badgeDb.textContent = data.database === 'connected' ? 'CONNECTED' : 'DISCONNECTED';
        badgeDb.className = data.database === 'connected' ? 'badge badge-success' : 'badge badge-danger';

        if (metricUptime) metricUptime.textContent = `${data.uptimeSeconds || 0}s`;
        if (metricMemory && data.memory) metricMemory.textContent = `${data.memory.rssMB} MB`;

        logTerminal(`Health check succeeded (Latency: ${latency}ms, DB: ${data.database})`, 'green');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      statusDot.className = 'status-dot';
      statusDot.style.background = '#ff3366';
      statusText.textContent = 'Gateway Degraded';
      latencyText.textContent = '-- ms';
      badgeApi.textContent = 'ERROR';
      badgeApi.className = 'badge badge-danger';
      logTerminal(`Health probe failed: ${err.message}`, 'yellow');
    }
  }

  // WebSocket connection probe
  function connectWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (badgeWs) {
          badgeWs.textContent = 'CONNECTED';
          badgeWs.className = 'badge badge-success';
        }
        logTerminal(`WebSocket connected to ${wsUrl}`, 'green');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'CONNECTION_ESTABLISHED') {
            logTerminal(`Realtime Handshake: ${msg.message}`, 'blue');
          }
        } catch (e) {
          // ignore
        }
      };

      ws.onclose = () => {
        if (badgeWs) {
          badgeWs.textContent = 'DISCONNECTED';
          badgeWs.className = 'badge badge-warning';
        }
        logTerminal('WebSocket connection closed. Retrying in 5s...', 'dim');
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = () => {
        if (badgeWs) {
          badgeWs.textContent = 'ERROR';
          badgeWs.className = 'badge badge-danger';
        }
      };
    } catch (err) {
      logTerminal(`WS Init error: ${err.message}`, 'yellow');
    }
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      logTerminal('Manual health probe requested by operator...', 'blue');
      probeHealth();
    });
  }

  // Initial calls
  probeHealth();
  connectWebSocket();

  // Periodic health check every 15 seconds
  setInterval(probeHealth, 15000);
});
