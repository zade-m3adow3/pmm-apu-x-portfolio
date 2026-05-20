import React, { useState, useEffect } from 'react';
import { Terminal, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { InlineMath, BlockMath } from '../Math';

interface ErrataItem {
  id: number;
  title: string;
  category: 'Math' | 'Hardware' | 'Logic';
  original: string | React.ReactNode;
  rectified: string | React.ReactNode;
  description: string;
}

const ERRATA_DB: ErrataItem[] = [
  {
    id: 1,
    title: 'Sign Error in Euler-Lagrange Eq.',
    category: 'Math',
    original: <BlockMath math={String.raw`\frac{d}{dt}\left(\frac{\partial L}{\partial \dot{q}}\right) + \frac{\partial L}{\partial q} = 0`} />,
    rectified: <BlockMath math={String.raw`\frac{d}{dt}\left(\frac{\partial L}{\partial \dot{q}}\right) - \frac{\partial L}{\partial q} = 0`} />,
    description: 'Critical sign inversion in the kinetic energy derivative resulted in unstable divergence under adversarial noise.'
  },
  {
    id: 2,
    title: 'SOT-MRAM Shadow Register Interfacing',
    category: 'Hardware',
    original: 'Snapshot triggers synchronously with crossbar matrix clock (77 MHz), leading to race conditions during GIM interrupt.',
    rectified: 'Snapshot trigger decoupled to asynchronous boundary using a graded SiGe buffer delay line (12 ns offset).',
    description: 'Mitigates the race condition during sudden thermal throttling events.'
  },
  {
    id: 3,
    title: 'Lyapunov Dissipation Inequality',
    category: 'Math',
    original: <BlockMath math={String.raw`\dot{V}(U_t) \le -\delta_k V(U_t)`} />,
    rectified: <BlockMath math={String.raw`\dot{V}(U_t) \le -2\delta_k V(U_t)`} />,
    description: 'Missing factor of 2 in the strict Lyapunov decay rate bound, underestimating tracking convergence speed.'
  },
  {
    id: 4,
    title: 'CNT Pillar Thermal Conductivity Bound',
    category: 'Hardware',
    original: <InlineMath math={String.raw`\kappa_{vertical} \ge 400\text{ W/m}\cdot\text{K}`} />,
    rectified: <InlineMath math={String.raw`\kappa_{vertical} \ge 1400\text{ W/m}\cdot\text{K}`} />,
    description: 'Initial material specification used standard copper vias. Upgraded to Carbon Nanotubes (CNT) to satisfy Boundary Condition 2.'
  },
  {
    id: 5,
    title: 'Banach Fixed-Point Metric Space',
    category: 'Math',
    original: 'Assumed completeness over standard Euclidean space ℝᵈ.',
    rectified: 'Strictly defined over the compact Stiefel manifold 𝒱_k(ℝᵈ) with geodesic distance.',
    description: 'Necessary for the contraction mapping theorem to hold for orthonormal matrices.'
  },
  // Add more to reach 14 to fill the ledger
  ...Array.from({ length: 9 }).map((_, i) => ({
    id: i + 6,
    title: `Substrate Integration Anomaly #${i + 6}`,
    category: (['Math', 'Hardware', 'Logic'][i % 3]) as any,
    original: 'Legacy streaming PCA formulation.',
    rectified: 'GIM fading-memory filtered formulation.',
    description: 'Resolved via ARX-mapped validation sequence.'
  }))
];

export function ErrataLedger() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isGlitching, setIsGlitching] = useState(false);
  const [status, setStatus] = useState<'pending' | 'verifying' | 'verified'>('pending');

  const handleSelect = (id: number) => {
    if (selectedId === id) return;
    setIsGlitching(true);
    setStatus('pending');
    
    // Simulate glitch effect timing
    setTimeout(() => {
      setSelectedId(id);
      setIsGlitching(false);
      setStatus('verifying');
      
      // Simulate verification process
      setTimeout(() => {
        setStatus('verified');
      }, 1200);
    }, 400);
  };

  const selectedItem = ERRATA_DB.find(item => item.id === selectedId);

  return (
    <div className={`w-full h-full flex bg-[#08080C] text-[#E2E8F0] overflow-hidden ${isGlitching ? 'animate-glitch' : ''}`}>
      
      <style>{`
        @keyframes glitch {
          0% { transform: translate(0) }
          20% { transform: translate(-2px, 1px) }
          40% { transform: translate(-1px, -1px); filter: contrast(150%) hue-rotate(90deg); }
          60% { transform: translate(2px, 1px) }
          80% { transform: translate(1px, -1px); filter: contrast(150%) invert(10%); }
          100% { transform: translate(0); filter: none; }
        }
        .animate-glitch {
          animation: glitch 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
      `}</style>

      {/* Left: Ledger List */}
      <div className="w-1/2 h-full border-r border-white/10 flex flex-col z-10 bg-[#08080C]/90 backdrop-blur-md">
        <div className="p-6 border-b border-white/10 flex-shrink-0">
          <h2 className="text-2xl font-bold font-mono text-white tracking-widest flex items-center gap-3">
            <Terminal className="text-cyan-400" />
            ERRATA & RECTIFICATION LEDGER
          </h2>
          <p className="text-sm text-slate-400 font-mono mt-2">
            Dynamic tracking of architectural discrepancies and mathematical resolutions.
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-2">
          {ERRATA_DB.map(item => (
            <div 
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`
                group flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer font-mono
                ${selectedId === item.id 
                  ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.1)]' 
                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}
              `}
            >
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm
                ${selectedId === item.id ? 'bg-cyan-500 text-slate-900' : 'bg-slate-800 text-slate-400 group-hover:text-white'}
              `}>
                {item.id.toString().padStart(2, '0')}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-bold truncate ${selectedId === item.id ? 'text-cyan-400' : 'text-slate-200'}`}>
                  {item.title}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                  CATEGORY: {item.category}
                </div>
              </div>
              <div className="text-slate-600 group-hover:text-slate-400">
                {selectedId === item.id ? <CheckCircle2 size={18} className="text-cyan-400" /> : <AlertCircle size={18} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Inspection Panel */}
      <div className="w-1/2 h-full bg-[#08080C] relative flex flex-col p-8 z-0">
        {/* Decorative Grid Lines Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{
            backgroundImage: 'linear-gradient(rgba(30, 41, 59, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 41, 59, 0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
        }}></div>

        {!selectedItem ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-mono opacity-50 relative z-10">
            <Terminal size={48} className="mb-4 opacity-50" />
            <p className="tracking-widest uppercase">Select an errata entry to inspect</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col relative z-10 animate-in fade-in slide-in-from-right-4 duration-500">
            
            {/* Status Token */}
            <div className="flex justify-end mb-8">
              <div className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold tracking-widest uppercase transition-all duration-300
                ${status === 'pending' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' : ''}
                ${status === 'verifying' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 animate-pulse' : ''}
                ${status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : ''}
              `}>
                {status === 'pending' && <><XCircle size={14} /> PENDING COMPILATION</>}
                {status === 'verifying' && <><RefreshCw size={14} className="animate-spin" /> VERIFYING ARX-MAP...</>}
                {status === 'verified' && <><CheckCircle2 size={14} /> VERIFIED ARX-MAPPED</>}
              </div>
            </div>

            <h3 className="text-xl font-bold font-mono text-white mb-2">{selectedItem.title}</h3>
            <p className="text-sm text-slate-400 font-mono mb-8">{selectedItem.description}</p>

            <div className="flex-1 grid grid-rows-2 gap-6">
              {/* Original */}
              <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-red-500/20 p-6 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50"></div>
                <div className="font-mono text-[10px] text-red-400/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <XCircle size={12} /> [ORIGINAL FLAWED IMPLEMENTATION]
                </div>
                <div className="flex-1 flex items-center justify-center font-mono text-slate-300">
                  {selectedItem.original}
                </div>
              </div>

              {/* Rectified */}
              <div className={`bg-slate-900/80 backdrop-blur-md rounded-xl border p-6 flex flex-col relative overflow-hidden transition-all duration-700
                ${status === 'verified' ? 'border-emerald-500/40 shadow-[inset_0_0_30px_rgba(16,185,129,0.05)]' : 'border-slate-700 opacity-50 filter blur-sm'}
              `}>
                <div className={`absolute top-0 left-0 w-1 h-full transition-colors duration-700 ${status === 'verified' ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                <div className={`font-mono text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2 transition-colors duration-700 ${status === 'verified' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <CheckCircle2 size={12} /> [RECTIFIED ARCHITECTURE]
                </div>
                <div className="flex-1 flex items-center justify-center font-mono text-white">
                  {selectedItem.rectified}
                </div>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
