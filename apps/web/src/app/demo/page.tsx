"use client";

import React, { useEffect, useState } from "react";
import Script from "next/script";

export default function DemoPage() {
  const [logs, setLogs] = useState<string[]>(["Tracker active..."]);

  const handleTrackClick = () => {
    if (typeof window !== "undefined" && (window as any).WebTracker) {
      const tracker = new (window as any).WebTracker({
        endpoint: window.location.origin,
        targetId: "demo_page",
        version: "demo",
      });
      tracker.track("click", "custom_button_click", { buttonId: "track-btn" });

      const time = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev, `[${time}] Tracked event: "custom_button_click"`]);
    } else {
      setLogs((prev) => [...prev, "WebTracker SDK not loaded yet."]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] font-sans flex items-center justify-center p-6">
      <Script
        src="/sdk/sdk.js"
        data-endpoint=""
        data-target-id="demo_page"
        data-version="demo"
        strategy="afterInteractive"
      />
      <div className="w-full max-w-lg bg-[#1e293b] rounded-xl shadow-2xl border border-slate-800 p-8">
        <h1 className="text-3xl font-extrabold text-[#38bdf8] mb-4">Telemetry SDK Demo</h1>
        <p className="text-slate-400 leading-relaxed mb-6">
          This page automatically loads the browser SDK and initiates event tracking (pageview &amp; duration heartbeats).
        </p>

        <div className="bg-slate-900 rounded-lg p-5 border border-slate-800/50 mb-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-2">Stay Duration Active</h3>
          <p className="text-sm text-slate-400">
            A duration heartbeat is sent back to the server every 5 seconds. Keep this tab open to accumulate duration, then check the analytics endpoint!
          </p>
        </div>

        <div className="bg-slate-900 rounded-lg p-5 border border-slate-800/50 mb-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-3">Custom Event Tracker</h3>
          <button
            id="track-btn"
            onClick={handleTrackClick}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-medium rounded-lg transition shadow-md shadow-sky-950/50 mb-4 cursor-pointer"
          >
            Trigger Click Event
          </button>
          <p className="text-xs text-slate-500 mb-2">Logs will appear below as you interact:</p>
          <div className="bg-black/60 rounded border border-slate-800 p-4 font-mono text-xs text-emerald-400 max-h-40 overflow-y-auto space-y-1">
            {logs.map((log, idx) => (
              <div key={idx} dangerouslySetInnerHTML={{ __html: log }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
