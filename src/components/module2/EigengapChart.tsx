import React from 'react';
import { useChartData } from '../../hooks/useChartData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CONSTANTS } from '../../data/constants';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md font-mono text-xs">
        <p className="text-slate-400 mb-2">Tick: {label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="font-bold">
            {entry.name}: {entry.value.toFixed(4)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function EigengapChart() {
  const { eigengapData } = useChartData();

  return (
    <div className="w-full h-full flex flex-col p-4 bg-slate-900/30 rounded-xl border border-white/5">
      <div className="mb-4">
        <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
          Panel A: Spectral Eigengap Decay (<span className="text-purple-400">δ_k = λ_k - λ_&#123;k+1&#125;</span>)
        </h3>
        <p className="text-xs text-slate-400 mt-1">Tracks the minimal gap preventing representation collapse.</p>
      </div>
      
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={eigengapData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="t" tick={{ fill: '#64748b' }} minTickGap={50} />
            <YAxis domain={[0, 1.2]} tick={{ fill: '#64748b' }} />
            <Tooltip content={<CustomTooltip />} />
            
            <ReferenceLine y={CONSTANTS.DELTA_THRESH_DEFAULT} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Δ_thresh', fill: '#ef4444', fontSize: 10 }} />
            
            <Line 
              type="monotone" 
              dataKey="pmm" 
              name="PMM" 
              stroke="#00f0ff" 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false} 
            />
            <Line 
              type="monotone" 
              dataKey="sota" 
              name="SOTA" 
              stroke="#f59e0b" 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
