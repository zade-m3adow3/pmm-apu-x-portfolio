import React, { useState } from 'react';
import type { TheoremDef } from '../../types';
import { useSimulation } from '../../context/SimulationContext';
import { ChevronDown, ChevronRight, Activity } from 'lucide-react';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface TheoremCardProps {
  theorem: TheoremDef;
}

export function TheoremCard({ theorem }: TheoremCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { tick, isAttacked, modelType, quantizationNoise, activeEigengap, integrityPredicate, memoryLogCount } = useSimulation();

  // Compute live values
  const state = { isAttacked, modelType, quantizationNoise, activeEigengap, integrityPredicate, memoryLogCount, tick, isRunning: true } as any;
  const liveValue = theorem.getLiveValue(state);
  const status = theorem.getStatus(state);

  const statusColors = {
    nominal: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/30 animate-pulse',
    critical: 'text-crimson-gim bg-crimson-gim/10 border-crimson-gim/30 animate-pulse',
  };

  return (
    <div className="bg-slate-900/40 border border-white/10 rounded-xl overflow-hidden transition-all duration-300 hover:border-white/20">
      {/* Header */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between text-left focus:outline-none"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center font-mono font-bold text-slate-300 border border-white/10 shrink-0">
            {theorem.number}
          </div>
          <div>
            <h3 className="font-bold text-white text-lg tracking-wide">{theorem.title}</h3>
            <div className="text-sm text-slate-400 font-mono mt-1 w-full max-w-full overflow-x-auto overflow-y-hidden pb-1">
              <BlockMath math={theorem.statementLatex} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          {/* Live Value Indicator */}
          <div className={`flex flex-col items-end px-3 py-1.5 rounded-md border ${statusColors[status]}`}>
             <div className="text-[10px] font-mono uppercase tracking-widest opacity-80 flex items-center gap-1">
               <Activity size={10} />
               {theorem.liveValueLabel}
             </div>
             <div className="font-mono font-bold">{liveValue}</div>
          </div>
          
          <div className="text-slate-500">
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </div>
        </div>
      </button>

      {/* Expanded Content (Proof Steps) */}
      {isExpanded && (
        <div className="p-5 border-t border-white/5 bg-slate-950/50">
          <div className="space-y-6">
            {theorem.proofSteps.map((step, idx) => (
              <div key={idx} className="relative pl-6 border-l-2 border-slate-800">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center">
                   <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/50"></div>
                </div>
                
                <h4 className="text-sm font-semibold text-slate-300 mb-2">{step.label}</h4>
                <div className="bg-slate-900/50 rounded-lg p-4 mb-3 border border-white/5 overflow-x-auto text-cyan-50">
                  <BlockMath math={step.latex} />
                </div>
                <p className="text-sm text-slate-400 leading-relaxed font-mono">
                  {step.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
