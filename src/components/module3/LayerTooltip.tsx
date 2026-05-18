import React from 'react';
import { SUBSTRATE_LAYERS } from '../../data/constants';
import { X } from 'lucide-react';

interface LayerTooltipProps {
  layerId: string | null;
  onClose: () => void;
}

export function LayerTooltip({ layerId, onClose }: LayerTooltipProps) {
  if (!layerId) return null;

  const spec = SUBSTRATE_LAYERS.find(l => l.id === layerId);
  if (!spec) return null;

  return (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 w-80 glass-strong rounded-xl p-5 border border-white/10 shadow-2xl z-20">
      <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-3">
        <div>
          <h3 className="font-mono font-bold text-white tracking-wide" style={{ color: spec.color }}>
            {spec.shortName}
          </h3>
          <p className="text-xs text-slate-400 mt-1">{spec.name}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      <p className="text-sm text-slate-300 mb-4 leading-relaxed">
        {spec.description}
      </p>

      <div className="space-y-2">
        {Object.entries(spec.specs).map(([key, value]) => (
          <div key={key} className="flex flex-col bg-slate-900/50 p-2 rounded border border-white/5">
            <span className="text-[10px] font-mono text-slate-500 uppercase">{key}</span>
            <span className="font-mono text-xs text-slate-200 mt-0.5">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
