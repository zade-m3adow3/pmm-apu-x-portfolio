import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { Play, Square, ShieldAlert, Cpu, Sparkles, ZapOff, Activity } from 'lucide-react';
import { HardwareMetrics } from './HardwareMetrics';
import type { ModelType } from '../../types';

export function ControlPanel() {
  const { 
    isAttacked, 
    setIsAttacked, 
    modelType, 
    setModelType, 
    quantizationNoise, 
    setQuantizationNoise,
    isRunning,
    toggleSimulation,
    resetSimulation
  } = useSimulation();

  return (
    <div className="absolute top-6 right-6 z-20 w-72 glass-strong rounded-2xl p-5 shadow-2xl border border-white/10 backdrop-blur-md transition-all duration-500 hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]">
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="font-mono text-sm font-bold tracking-wider text-white">SIMULATION_CTRL</h3>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={toggleSimulation}
            className={`p-1.5 rounded-md transition-colors ${isRunning ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
            title={isRunning ? "Pause Simulation" : "Resume Simulation"}
          >
            {isRunning ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <button 
            onClick={resetSimulation}
            className="p-1.5 rounded-md bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            title="Reset Simulation"
          >
            <span className="font-mono text-xs font-bold px-1">RST</span>
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Cpu size={12} />
            Architecture
          </label>
          <div className="grid grid-cols-1 gap-1.5 bg-slate-900/50 p-1.5 rounded-lg border border-white/5">
            {(['PMM', 'SOTA_Transformer', 'Legacy_Streaming_PCA'] as ModelType[]).map((type) => (
              <button
                key={type}
                onClick={() => setModelType(type)}
                className={`
                  text-xs font-mono py-2 px-3 rounded-md transition-all text-left relative overflow-hidden
                  ${modelType === type 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[inset_0_0_10px_rgba(0,240,255,0.1)]' 
                    : 'text-slate-400 hover:bg-white/5 border border-transparent'}
                `}
              >
                <div className="relative z-10 flex items-center justify-between">
                   <span>{type.replace(/_/g, ' ')}</span>
                   {modelType === type && <Sparkles size={12} className="text-cyan-400 animate-pulse" />}
                </div>
                {modelType === type && (
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent z-0"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Attack Toggle */}
        <div className="flex items-center justify-between py-2 border-t border-white/5">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <ShieldAlert size={14} className={isAttacked ? "text-crimson-gim" : "text-slate-500"} />
              Adversarial Stream
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5">Inject structural noise / slow-boil</span>
          </div>
          <button
            onClick={() => setIsAttacked(!isAttacked)}
            className={`
              relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none
              ${isAttacked ? 'bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-slate-700'}
            `}
          >
            <div className={`
              absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out
              ${isAttacked ? 'transform translate-x-6' : ''}
            `} />
          </button>
        </div>

        {/* Quantization Noise Toggle */}
        <div className="flex items-center justify-between py-2 border-t border-white/5">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <ZapOff size={14} className={quantizationNoise ? "text-amber-gim" : "text-slate-500"} />
              Quantization Noise
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5">ε_arith ≥ 10⁻³ vs ε_arith &lt; 10⁻³</span>
          </div>
          <button
            onClick={() => setQuantizationNoise(!quantizationNoise)}
            className={`
              relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none
              ${quantizationNoise ? 'bg-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-slate-700'}
            `}
          >
            <div className={`
              absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out
              ${quantizationNoise ? 'transform translate-x-6' : ''}
            `} />
          </button>
        </div>

        <div className="mt-4 border-t border-white/5 pt-4">
          <HardwareMetrics />
        </div>
      </div>
    </div>
  );
}
