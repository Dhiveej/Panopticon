'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import TelemetryPanel from '@/components/TelemetryPanel';
import ThreatLedger from '@/components/ThreatLedger';

// Dynamically import the graph component with SSR disabled (WebGL/Canvas requirement)
const PanopticonGraph = dynamic(() => import('@/components/PanopticonGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full graph-bg">
      <div className="text-cyan/50 font-display text-xs tracking-[4px] animate-pulse">
        INITIALIZING 3D TOPOLOGY...
      </div>
    </div>
  ),
});

// ── Live-fire backend bridge endpoint ────────────────────────────────────
const WS_URL = 'ws://localhost:8000/ws';

// ── Baseline infrastructure nodes (always visible) ───────────────────────
const BASELINE_NODES = [
  { id: '10.0.0.1', group: 'core' },
  { id: '10.0.0.5', group: 'core' },
  { id: '10.0.0.10', group: 'normal' },
  { id: '10.0.0.20', group: 'normal' },
  { id: '10.0.0.30', group: 'normal' },
];

const BASELINE_LINKS = [
  { source: '10.0.0.1', target: '10.0.0.5', threat: false },
  { source: '10.0.0.5', target: '10.0.0.10', threat: false },
  { source: '10.0.0.5', target: '10.0.0.20', threat: false },
  { source: '10.0.0.5', target: '10.0.0.30', threat: false },
];

export default function DashboardPage() {
  const [graphData, setGraphData] = useState({
    nodes: [...BASELINE_NODES],
    links: [...BASELINE_LINKS],
  });
  const [telemetry, setTelemetry] = useState({
    latency_ms: 0,
    packets_per_sec: 0,
    defcon: 'NOMINAL',
    active_threats: 0,
    timestamp: '--:--:--',
  });
  const [ledger, setLedger] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const threatCount = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[+] Connected to Panopticon STGCN Backend');
      setConnected(true);
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        console.log("[FIREHOSE] Raw data from backend:", event.data);
        const message = JSON.parse(event.data);

        if (message.type === 'THREAT_DETECTED') {
          const threat = message.data;
          threatCount.current += 1;

          // ── 1. Add attacker node if it doesn't exist, draw threat link ──
          // ── 1. Add attacker node if it doesn't exist, draw threat link ──
          setGraphData((prev) => {
            const nodeExists = prev.nodes.some((n) => n.id === threat.source);

            // Spawn attacker near the cluster center with a fixed position
            // so the force simulation doesn't fling it off-screen
            const spread = 80;
            const attackerNode = {
              id: threat.source,
              group: 'attacker',
              x: (Math.random() - 0.5) * spread,
              y: (Math.random() - 0.5) * spread,
              z: (Math.random() - 0.5) * spread,
              fx: (Math.random() - 0.5) * spread * 1.5,
              fy: (Math.random() - 0.5) * spread * 1.5,
              fz: (Math.random() - 0.5) * spread * 1.5,
            };

            const newNodes = nodeExists
              ? prev.nodes
              : [...prev.nodes, attackerNode];

            // Ensure the target node exists too
            const targetExists = newNodes.some((n) => n.id === threat.target);
            const finalNodes = targetExists
              ? newNodes
              : [...newNodes, { id: threat.target, group: 'normal' }];

            // ── THE FIX: PREVENT LINK STACKING ──
            const linkExists = prev.links.some((l) => {
              // Handle react-force-graph's internal object mutation
              const sId = typeof l.source === 'object' ? l.source.id : l.source;
              const tId = typeof l.target === 'object' ? l.target.id : l.target;
              return sId === threat.source && tId === threat.target;
            });

            if (linkExists) {
              // The laser is already drawn. Just update the nodes and ignore the duplicate link.
              return { nodes: finalNodes, links: prev.links };
            }

            // Draw the red laser for the first time
            const newLinks = [
              ...prev.links,
              {
                source: threat.source,
                target: threat.target,
                threat: true,
              },
            ];

            return { nodes: finalNodes, links: newLinks };
          });

          // ── 2. Prepend to the Threat Ledger ──
          const now = new Date();
          const timestamp = threat.time === 'NOW'
            ? now.toLocaleTimeString('en-US', { hour12: false })
            : threat.time;

          setLedger((prev) => [
            {
              time: timestamp,
              source: threat.source,
              target: threat.target,
              probability: threat.probability,
              classification: threat.class,
            },
            ...prev,
          ].slice(0, 100)); // Cap at 100 entries

          // ── 3. Update telemetry to reflect threat state ──
          setTelemetry({
            latency_ms: Math.floor(Math.random() * 5) + 1,
            packets_per_sec: Math.floor(Math.random() * 2000) + 500,
            defcon: threatCount.current >= 5 ? 'CRITICAL' : threatCount.current >= 2 ? 'ELEVATED' : 'ALERT',
            active_threats: threatCount.current,
            timestamp: now.toLocaleTimeString('en-US', { hour12: false }),
          });

          console.log(`[!] THREAT_DETECTED: ${threat.source} → ${threat.target} | ${threat.class} @ ${threat.probability}%`);
        }
      } catch (err) {
        console.error('[PANOPTICON] Parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[PANOPTICON] WebSocket disconnected — reconnecting in 2s...');
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = (err) => {
      console.error('[PANOPTICON] WebSocket error:', err);
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  return (
    <main className="relative w-screen h-screen overflow-hidden graph-bg">
      {/* ── Full-Screen Force Graph ───────────────────────────────── */}
      <div className="absolute inset-0 graph-container" id="panopticon-graph">
        <PanopticonGraph graphData={graphData} />
      </div>

      {/* ── Title Bar Overlay ─────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-3"
      >
        <div className="flex items-center gap-3">
          <h1 className="font-display text-cyan text-lg font-bold tracking-wider"
            style={{ textShadow: '0 0 15px rgba(0, 209, 255, 0.6)' }}>
            PANOPTICON
          </h1>
          <span className="font-display text-crimson text-xs font-bold tracking-widest"
            style={{ textShadow: '0 0 8px rgba(255, 0, 60, 0.5)' }}>
            /// STGCN INTRUSION SUBSYSTEM
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
          <span className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">
            {connected ? 'STREAM ACTIVE' : 'RECONNECTING'}
          </span>
        </div>
      </motion.header>

      {/* ── Left Panel: Telemetry ─────────────────────────────────── */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="absolute top-16 left-4 z-20 w-64"
          id="telemetry-panel"
        >
          <TelemetryPanel telemetry={telemetry} />
        </motion.div>
      </AnimatePresence>

      {/* ── Right Panel: Threat Ledger ────────────────────────────── */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          className="absolute top-16 right-4 z-20 w-auto"
          id="threat-ledger-panel"
        >
          <ThreatLedger ledger={ledger} />
        </motion.div>
      </AnimatePresence>

      {/* ── Bottom Status Bar ─────────────────────────────────────── */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-2 border-t border-white/5"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      >
        <span className="font-mono text-[9px] text-gray-700 tracking-wider">
          PANOPTICON v3.0 — LIVE FIRE MODE
        </span>
        <span className="font-mono text-[9px] text-gray-700 tracking-wider">
          TICK: {telemetry.timestamp} | NODES: {graphData.nodes.length} | EDGES: {graphData.links.length} | THREATS: {telemetry.active_threats}
        </span>
      </motion.footer>
    </main>
  );
}