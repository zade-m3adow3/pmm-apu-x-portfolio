import { useRef, useEffect, useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import type { ChartDataPoint } from '../types';
import { DEFAULT_PARAMS } from '../simulation/simulationEngine';

/**
 * Streaming chart data hook driven by the full PMM simulation engine.
 * Pillar 1: Eigengap, Memory Scaling
 * Pillar 4: Rollback drift
 * Pillar 1.3: Regret bound (PMM vs SOTA)
 */
export function useChartData() {
  const { tick, isAttacked, modelType, quantizationNoise, activeEigengap, pmmState } = useSimulation();

  const [eigengapData, setEigengapData] = useState<ChartDataPoint[]>([]);
  const [memoryData, setMemoryData] = useState<ChartDataPoint[]>([]);
  const [rollbackData, setRollbackData] = useState<ChartDataPoint[]>([]);

  // SOTA tracking is independent — simulated parallel track
  const sotaEigengapRef = useRef(1.0);
  const legacyEigengapRef = useRef(1.0);
  const sotaDriftRef = useRef(0);

  const W = 200;

  useEffect(() => {
    // ── Pillar 1: SOTA eigengap simulation (exponential collapse under attack) ──
    if (isAttacked) {
      // δ_k(t) → 0 exponentially for SOTA (no hysteresis)
      sotaEigengapRef.current = Math.max(0.001, sotaEigengapRef.current * (1 - DEFAULT_PARAMS.nominalEigengapDecayRate));
      legacyEigengapRef.current = Math.max(0.001, legacyEigengapRef.current * (1 - DEFAULT_PARAMS.nominalEigengapDecayRate * 1.5));
    } else {
      sotaEigengapRef.current = Math.min(1.0, sotaEigengapRef.current + 0.005);
      legacyEigengapRef.current = Math.min(1.0, legacyEigengapRef.current + 0.003);
    }

    // ── Pillar 4: SOTA rollback drift — E[||θ_rollback - θ_t||²] accumulates ──
    const epsilonArith = quantizationNoise ? 1e-3 : 1e-6;
    if (isAttacked) {
      // 2n * ε_arith² drift growth
      sotaDriftRef.current += 2 * 0.05 * Math.pow(epsilonArith, 2) * 1000 * Math.log(sotaDriftRef.current + 1.1);
    } else {
      sotaDriftRef.current = Math.max(0, sotaDriftRef.current - 0.001);
    }

    // ── Chart data points ──────────────────────────────────────────
    const newEigengap: ChartDataPoint = {
      t: tick,
      pmm: activeEigengap,           // PMM stabilized via hysteresis dead-zone
      sota: sotaEigengapRef.current, // SOTA collapsing toward 0
      legacy: legacyEigengapRef.current,
    };

    const newMemory: ChartDataPoint = {
      t: tick,
      pmm: pmmState.memoryUsagePMM,    // O(log t) via LSFP
      sota: pmmState.memoryUsageSOTA,  // O(t) linear
    };

    // PMM rollback: E_rollback ≡ 0 (DASM Zero-Drift Invariant)
    const newRollback: ChartDataPoint = {
      t: tick,
      pmm: pmmState.parameterDriftPMM,
      sota: pmmState.parameterDriftSOTA + sotaDriftRef.current,
    };

    setEigengapData(prev => [...prev.slice(-(W - 1)), newEigengap] as ChartDataPoint[]);
    setMemoryData(prev => [...prev.slice(-(W - 1)), newMemory] as ChartDataPoint[]);
    setRollbackData(prev => [...prev.slice(-(W - 1)), newRollback] as ChartDataPoint[]);

  }, [tick, isAttacked, modelType, quantizationNoise, activeEigengap, pmmState]);

  return { eigengapData, memoryData, rollbackData };
}
