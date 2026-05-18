import React from 'react';
import { useChartData } from '../../hooks/useChartData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

export function RollbackChart() {
  const { rollbackData } = useChartData();

  return (
    <div className="w-full h-full flex flex-col p-4 bg-slate-900/30 rounded-xl border border-white/5">
      <div className="mb-4">
        <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
          Panel C: Real-Time Parameter Rollback Deviation
        </h3>
        <p className="text-xs text-slate-400 mt-1">Drift variance under quantization errors (ε_arith).</p>
      </div>
      
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rollbackData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="t" tick={{ fill: '#64748b' }} minTickGap={50} />
            <YAxis domain={[0, 'dataMax + 0.1']} tick={{ fill: '#64748b' }} />
            <Tooltip content={<CustomTooltip />} />
            
            <Line 
              type="stepAfter" 
              dataKey="pmm" 
              name="PMM (Flat 0)" 
              stroke="#00f0ff" 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false} 
            />
            <Line 
              type="monotone" 
              dataKey="sota" 
              name="SOTA Drift" 
              stroke="#f43f5e" 
              strokeWidth={2} 
              strokeDasharray="3 3"
              dot={false} 
              isAnimationActive={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
