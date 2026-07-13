import { FastifyInstance } from "fastify";

const DEMO_HTML = /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Modular Tracker - Interactive Demo</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      border: 1px solid #1e293b;
    }
    h1 { color: #38bdf8; font-size: 1.8rem; }
    p { color: #94a3b8; line-height: 1.6; }
    .card {
      background: #1e293b;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    button {
      background: #0284c7;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      transition: background 0.2s;
    }
    button:hover { background: #0369a1; }
    .log-box {
      background: #020617;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.85rem;
      color: #4ade80;
      max-height: 150px;
      overflow-y: auto;
    }
  </style>
</head>
<body>
  <h1>Telemetry SDK Demo</h1>
  <p>This page automatically loads the browser SDK and initiates event tracking (pageview &amp; duration heartbeats).</p>

  <div class="card">
    <h3>Stay Duration Active</h3>
    <p>A duration heartbeat is sent back to the server every 5 seconds. Keep this tab open to accumulate duration, then check the analytics endpoint!</p>
  </div>

  <div class="card">
    <h3>Custom Event Tracker</h3>
    <button id="track-btn">Trigger Click Event</button>
    <p>Logs will appear below as you interact:</p>
    <div id="log" class="log-box">Tracker active...<br></div>
  </div>

  <!-- Load our built SDK -->
  <script src="/sdk/sdk.js" data-endpoint="" data-target-id="demo_page" data-version="demo"></script>
  <script>
    const btn = document.getElementById('track-btn');
    const logEl = document.getElementById('log');

    btn.addEventListener('click', () => {
      if (window.WebTracker) {
        const tracker = new window.WebTracker({
          endpoint: window.location.origin,
          targetId: 'demo_page',
          version: 'demo'
        });
        tracker.track('click', 'custom_button_click', { buttonId: 'track-btn' });

        const time = new Date().toLocaleTimeString();
        logEl.innerHTML += '[' + time + '] Tracked event: "custom_button_click"<br>';
        logEl.scrollTop = logEl.scrollHeight;
      }
    });
  </script>
</body>
</html>
`;

export async function demoRoutes(fastify: FastifyInstance) {
  /**
   * GET /demo
   * Interactive demo page that loads the browser SDK.
   */
  fastify.get("/demo", async (_request, reply) => {
    return reply.type("text/html").send(DEMO_HTML);
  });
}
