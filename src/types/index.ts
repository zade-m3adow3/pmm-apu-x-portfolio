// ─── Simulation State ────────────────────────────────────────────────
export type ModelType = 'PMM' | 'SOTA_Transformer' | 'Legacy_Streaming_PCA';

export interface SimulationState {
  isAttacked: boolean;
  modelType: ModelType;
  quantizationNoise: boolean;
  activeEigengap: number;       // δ_k = λ_k − λ_{k+1}
  integrityPredicate: number;   // I(t): 0 = safe, 1 = breach
  memoryLogCount: number;       // O(log t) tracking
  tick: number;                 // Global time step
  isRunning: boolean;           // Simulation active
  gimFilterW?: number;          // W_t — Lyapunov fading-memory filter
  regretBound?: number;         // R_T — current regret bound estimate
}

export interface SimulationActions {
  setIsAttacked: (v: boolean) => void;
  setModelType: (v: ModelType) => void;
  setQuantizationNoise: (v: boolean) => void;
  toggleSimulation: () => void;
  resetSimulation: () => void;
  advanceTick: () => void;
}

export interface SimulationContextType extends SimulationState, SimulationActions {}

// ─── Chart Data ──────────────────────────────────────────────────────
export interface ChartDataPoint {
  t: number;
  pmm: number;
  sota: number;
  legacy?: number;
}

// ─── Module Navigation ──────────────────────────────────────────────
export type ModuleId = 'metaphor' | 'sandbox' | 'substrate' | 'proofs';

export interface ModuleNavItem {
  id: ModuleId;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

// ─── APU-X Substrate Layers ─────────────────────────────────────────
export interface SubstrateLayerProps {
  id: string;
  name: string;
  elevation: number;
  isExpanded: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export interface SubstrateLayerSpec {
  id: string;
  name: string;
  shortName: string;
  color: string;
  specs: Record<string, string>;
  description: string;
}

// ─── Theorem / Proof ────────────────────────────────────────────────
export interface TheoremDef {
  id: string;
  number: number;
  title: string;
  statementLatex: string;
  proofSteps: ProofStep[];
  liveValueLabel: string;
  getLiveValue: (state: SimulationState) => string;
  getStatus: (state: SimulationState) => 'nominal' | 'warning' | 'critical';
}

export interface ProofStep {
  label: string;
  latex: string;
  explanation: string;
}
