import React from 'react';
import { EigengapChart } from './EigengapChart';
import { MemoryChart } from './MemoryChart';
import { RollbackChart } from './RollbackChart';

export function SandboxDashboard() {
  return (
    <div className="w-full h-full flex flex-col p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-mono text-white tracking-widest flex items-center gap-3">
          <span className="text-amber-400">02</span> LIVE ADVERSARIAL COMPARATIVE SANDBOX
        </h2>
        <p className="text-sm text-slate-400 font-mono mt-2">
          Real-time metrics comparing PMM resilience against SOTA Transformer architecture under adversarial streams.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[600px]">
        <div className="lg:col-span-2 h-[350px]">
          <EigengapChart />
        </div>
        <div className="h-[300px]">
          <MemoryChart />
        </div>
        <div className="h-[300px]">
          <RollbackChart />
        </div>
      </div>
    </div>
  );
}
