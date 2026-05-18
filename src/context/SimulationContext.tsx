import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { SimulationContextType, ModelType } from '../types';
import {
  executeSimulationStep,
  createInitialPMMState,
  DEFAULT_PARAMS,
  computeVNEntropy,
  estimateRegretBound,
  verifyCHSInvariant,
  computeTeff,
} from '../simulation/simulationEngine';
import type { PMMState } from '../simulation/simulationEngine';

// ─── Exported derived CHS & hardware metrics (computed once) ─────────
export const HW_METRICS = {
  tEffTOPS: computeTeff(16384, 77e6),
  chs: verifyCHSInvariant(DEFAULT_PARAMS),
};

// ─── Extended context type ────────────────────────────────────────────
export interface FullSimulationContextType extends SimulationContextType {
  pmmState: PMMState;
  // Pillar 2
  gimFilterW: number;
  // Pillar 1
  vNEntropy: number;
  eigenvalues: number[];
  // Regret
  regretBound: number;
}

const SimulationContext = createContext<FullSimulationContextType | null>(null);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [modelType, setModelTypeState] = useState<ModelType>('PMM');
  const [isAttacked, setIsAttackedState] = useState(false);
  const [quantizationNoise, setQuantizationNoiseState] = useState(false);
  const [isRunning, setIsRunning] = useState(true);
  const [pmmState, setPMMState] = useState<PMMState>(createInitialPMMState(16));

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const modelTypeRef = useRef<ModelType>('PMM');
  const isAttackedRef = useRef(false);
  const quantizationNoiseRef = useRef(false);
  const isRunningRef = useRef(true);

  const setIsAttacked = useCallback((v: boolean) => {
    isAttackedRef.current = v;
    setIsAttackedState(v);
    setPMMState(s => ({ ...s, isAttacked: v }));
  }, []);

  const setModelType = useCallback((v: ModelType) => {
    modelTypeRef.current = v;
    setModelTypeState(v);
  }, []);

  const setQuantizationNoise = useCallback((v: boolean) => {
    quantizationNoiseRef.current = v;
    setQuantizationNoiseState(v);
  }, []);

  const toggleSimulation = useCallback(() => {
    isRunningRef.current = !isRunningRef.current;
    setIsRunning(prev => !prev);
  }, []);

  const resetSimulation = useCallback(() => {
    const fresh = createInitialPMMState(16);
    fresh.isAttacked = isAttackedRef.current;
    setPMMState(fresh);
    setIsRunning(true);
    isRunningRef.current = true;
  }, []);

  const advanceTick = useCallback(() => {
    setPMMState(prev => {
      const noiseMag = isAttackedRef.current ? 0.08 : 0.005;
      return executeSimulationStep(
        { ...prev, isAttacked: isAttackedRef.current },
        { noiseTensorMagnitude: noiseMag, dt: 0.05, quantizationNoise: quantizationNoiseRef.current },
        DEFAULT_PARAMS
      );
    });
  }, []);

  // ── Main RAF loop ─────────────────────────────────────────────────
  useEffect(() => {
    const loop = (time: number) => {
      if (isRunningRef.current && time - lastTimeRef.current >= 50) {
        lastTimeRef.current = time;
        const noiseMag = isAttackedRef.current ? 0.08 : 0.005;
        setPMMState(prev => executeSimulationStep(
          { ...prev, isAttacked: isAttackedRef.current },
          { noiseTensorMagnitude: noiseMag, dt: 0.05, quantizationNoise: quantizationNoiseRef.current },
          DEFAULT_PARAMS
        ));
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Derived values ────────────────────────────────────────────────
  const activeEigengap = pmmState.eigengap;
  const integrityPredicate = pmmState.integrityBreach ? 1 : 0;
  const memoryLogCount = pmmState.memoryUsagePMM;
  const vNEntropy = pmmState.vNEntropy;
  const regretBound = estimateRegretBound(pmmState.activeRank, 512, Math.max(activeEigengap, 0.001), pmmState.tick);

  const ctx: FullSimulationContextType = {
    isAttacked,
    modelType,
    quantizationNoise,
    activeEigengap,
    integrityPredicate,
    memoryLogCount,
    tick: pmmState.tick,
    isRunning,
    pmmState,
    gimFilterW: pmmState.gimFilterW,
    vNEntropy,
    eigenvalues: pmmState.eigenvalues,
    regretBound,
    setIsAttacked,
    setModelType,
    setQuantizationNoise,
    toggleSimulation,
    resetSimulation,
    advanceTick,
  };

  return (
    <SimulationContext.Provider value={ctx}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation(): FullSimulationContextType {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider');
  return ctx;
}
