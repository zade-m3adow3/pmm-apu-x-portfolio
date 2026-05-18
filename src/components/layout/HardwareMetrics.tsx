import React from 'react';
import { useSimulation, HW_METRICS } from '../../context/SimulationContext';
import { Cpu, Zap, Wifi, ShieldCheck, Activity } from 'lucide-react';

/**
 * Hardware Metrics Panel — live readouts of APU-X physical metrics
 * Derived from Pillar 3 equations.
 */
export function HardwareMetrics() {
  const { pmmState, isAttacked, gimFilterW } = useSimulation();
  const { tEffTOPS, chs } = HW_METRICS;

  return (
    <div className="glass border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <Cpu size={14} className="text-cyan-400" />
        <span className="font-mono text-xs font-bold text-white tracking-widest uppercase">APU-X Live Metrics</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
        <MetricBox label="𝒯_eff (TOPS)" value={`${tEffTOPS.toFixed(2)} TOPS`} color="text-cyan-400" icon={<Zap size={10}/>} />
        <MetricBox label="ILV Path" value="≤ 850 nm" color="text-purple-400" icon={<Wifi size={10}/>} />
        <MetricBox label="κ_vertical" value="≥ 1400 W/m·K" color="text-emerald-400" icon={<Activity size={10}/>} />
        <MetricBox
          label="CHS Invariant"
          value={chs.invariantHolds ? `${(chs.vNoise * 1e6).toFixed(1)}μV < ${(chs.vLSB * 1e6).toFixed(2)}μV ✓` : 'VIOLATED ✗'}
          color={chs.invariantHolds ? 'text-emerald-400' : 'text-red-400'}
          icon={<ShieldCheck size={10}/>}
        />
        <MetricBox label="GIM W_t" value={gimFilterW.toFixed(5)} color={gimFilterW > 0.2 ? 'text-amber-400' : 'text-emerald-400'} />
        <MetricBox label="Active Rank k_t" value={String(pmmState.activeRank)} color="text-cyan-400" />
        <MetricBox label="H_vN(t)" value={pmmState.vNEntropy.toFixed(4)} color="text-purple-400" />
        <MetricBox label="I(t)" value={pmmState.integrityBreach ? '1 — BREACH' : '0 — SAFE'} color={pmmState.integrityBreach ? 'text-red-400 animate-pulse' : 'text-emerald-400'} />
      </div>
    </div>
  );
}

function MetricBox({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-slate-900/50 p-2 rounded border border-white/5">
      <div className="text-slate-500 uppercase tracking-widest flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className={`${color} font-bold mt-1 truncate`}>{value}</div>
    </div>
  );
}
