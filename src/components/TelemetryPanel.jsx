'use client';

import { Activity, Shield, Zap, Clock, Wifi } from 'lucide-react';

function MetricCard({ icon: Icon, label, value, color = 'text-cyan', glow = false }) {
  return (
    <div className="flex items-center gap-3 py-3 px-2 border-b border-white/[0.03] last:border-b-0">
      <div className={`${color} opacity-40`}>
        <Icon size={13} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="metric-label mb-1">
          {label}
        </div>
        <div className={`metric-value-etched text-sm ${color} metric-value ${glow ? 'status-critical' : ''}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

export default function TelemetryPanel({ telemetry }) {
  const isCritical = telemetry.defcon === 'CRITICAL';

  return (
    <div className="glass-panel p-4">
      {/* Panel Header */}
      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-white/[0.03]">
        <Wifi size={10} className="text-cyan opacity-40" />
        <h2 className="panel-header-etched cyan font-display">
          Telemetry
        </h2>
      </div>

      {/* Metrics */}
      <div className="space-y-0">
        <MetricCard icon={Clock} label="Inf. Latency" value={`${telemetry.latency_ms} ms`}
          color={telemetry.latency_ms > 30 ? 'text-yellow-400' : 'text-cyan'} />
        <MetricCard icon={Activity} label="Inbound Traffic"
          value={`${(telemetry.packets_per_sec || 0).toLocaleString()} p/s`}
          color={telemetry.packets_per_sec > 100000 ? 'text-orange-400' : 'text-emerald-400'} />
        <MetricCard icon={Shield} label="Sys DEFCON" value={telemetry.defcon}
          color={isCritical ? 'text-crimson' : 'text-cyan'} glow={isCritical} />
        <MetricCard icon={Zap} label="Active Threats" value={telemetry.active_threats}
          color={telemetry.active_threats > 0 ? 'text-crimson' : 'text-gray-600'}
          glow={telemetry.active_threats > 0} />
      </div>

      {/* Timestamp Footer */}
      <div className="mt-3 pt-2.5 border-t border-white/[0.03]">
        <div className="font-mono text-[8px] text-gray-700 text-center tracking-[3px] uppercase">
          Last Tick: {telemetry.timestamp}
        </div>
      </div>
    </div>
  );
}
