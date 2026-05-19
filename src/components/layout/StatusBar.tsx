import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { Terminal, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';

export function StatusBar() {
  const { 
    tick, 
    activeEigengap, 
    integrityPredicate, 
    memoryLogCount, 
    modelType,
    isAttacked
  } = useSimulation();

  return (
    <div className="w-full h-10 bg-slate-950/90 border-t border-white/10 backdrop-blur-md flex-shrink-0 flex items-center px-4 font-mono text-[10px] text-slate-400 uppercase tracking-widest z-30">
      
      {/* Left section: Terminal Output style */}
      <div className="flex items-center gap-2 flex-1">
        <Terminal size={12} className="text-cyan-500" />
        <span className="text-cyan-500/70">root@apu-x:~#</span>
        <span className="text-slate-300">sys.monitor.tail()</span>
        <span className="text-slate-600 animate-pulse">_</span>
      </div>

      {/* Middle section: Telemetry */}
      <div className="flex items-center gap-8 px-4 border-l border-r border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">TICK:</span>
          <span className="text-white w-16 tabular-nums">{tick.toString().padStart(6, '0')}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-slate-500">δ_k:</span>
          <span className={`tabular-nums font-bold ${activeEigengap < 0.2 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {activeEigengap.toFixed(4)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">MEM:</span>
          <span className="text-purple-400 tabular-nums">
            {modelType === 'PMM' ? `O(log ${Math.floor(memoryLogCount * 10)})` : `O(${Math.floor(memoryLogCount * 100)})`}
          </span>
        </div>
      </div>

      {/* Right section: Integrity Status */}
      <div className="flex items-center gap-4 pl-4 min-w-[200px] justify-end">
         <div className="flex items-center gap-1.5">
           <Cpu size={12} className={modelType === 'PMM' ? 'text-cyan-400' : 'text-slate-500'} />
           <span className={modelType === 'PMM' ? 'text-cyan-400' : 'text-slate-500'}>
             {modelType === 'PMM' ? 'PMM ACTIVE' : 'SOTA MODE'}
           </span>
         </div>

         <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded flex-shrink-0 ${integrityPredicate === 1 ? 'bg-crimson-gim/20 text-crimson-gim border border-crimson-gim/50 animate-pulse' : isAttacked ? 'bg-amber-gim/20 text-amber-gim border border-amber-gim/50' : 'bg-emerald-gim/20 text-emerald-gim border border-emerald-gim/50'}`}>
            {integrityPredicate === 1 ? (
              <>
                <ShieldAlert size={12} />
                <span className="font-bold">I(t)=1 BREACH</span>
              </>
            ) : (
              <>
                <ShieldCheck size={12} />
                <span className="font-bold">I(t)=0 SAFE</span>
              </>
            )}
         </div>
      </div>

    </div>
  );
}
