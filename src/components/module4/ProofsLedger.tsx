import React from 'react';
import { THEOREMS } from '../../data/theorems';
import { TheoremCard } from './TheoremCard';

export function ProofsLedger() {
  return (
    <div className="w-full h-full flex flex-col p-6 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold font-mono text-white tracking-widest flex items-center gap-3">
          <span className="text-emerald-400">04</span> FORMAL INVARIANTS & ANALYTICAL PROOFS
        </h2>
        <p className="text-sm text-slate-400 font-mono mt-2 max-w-3xl">
          Mathematical ledger verifying the stability guarantees of the Post-Mitigated Abraxas Model.
          Values update in real-time based on the global simulation state.
        </p>
      </div>

      <div className="max-w-5xl space-y-4 pb-20">
        {THEOREMS.map((theorem) => (
          <TheoremCard key={theorem.id} theorem={theorem} />
        ))}
      </div>
    </div>
  );
}
