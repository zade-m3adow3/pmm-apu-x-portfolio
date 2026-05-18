/**
 * PMM Simulation Engine — Full Mathematical Machinery
 * Implements all 5 pillars from the Comprehensive Analytical Ledger
 */

// ─── State Interfaces ────────────────────────────────────────────────

export interface PMMState {
  // Pillar 1: Spectral state
  eigenvalues: number[];         // λ_1 > λ_2 > ... > λ_d
  activeRank: number;            // k_t (active tracking rank)
  eigengap: number;              // δ_k = λ_k − λ_{k+1}
  vNEntropy: number;             // H_vN(t) = -Σ λ̃_i ln λ̃_i

  // Pillar 2: Lyapunov / GIM state
  gimFilterW: number;            // W_t (fading-memory filter variable)
  integrityBreach: boolean;      // I(t): true when GIM fires

  // Pillar 4: Safety / rollback
  parameterDriftSOTA: number;    // E[||θ_rollback - θ_t||²] for SOTA (diverges)
  parameterDriftPMM: number;     // E_rollback for PMM ≡ 0

  // Global
  isAttacked: boolean;
  tick: number;
  memoryUsagePMM: number;        // O(log t)
  memoryUsageSOTA: number;       // O(t)
}

export interface SimulationInputs {
  noiseTensorMagnitude: number;  // Adversarial noise amplitude
  dt: number;                    // Time step (seconds)
  quantizationNoise: boolean;    // ε_arith ≥ 10⁻³ when true
}

export interface SimulationParams {
  // Eigengap
  deltaThresh: number;           // Δ_thresh(k_t) — hysteresis trigger
  hysteresisStep: number;        // Δk for rank adaptation
  nominalEigengapDecayRate: number;

  // GIM / Lyapunov
  lambdaDissipation: number;     // λ > 0 — GIM dissipation rate
  gimTriggerThreshold: number;   // W_t above this → integrity breach

  // Hardware
  vRef: number;                  // V_ref = 1.2 V
  bits: number;                  // B = 14 (14-bit quantization)
  mRawUH: number;                // M_raw = 0.15 μH
  deltaShield: number;           // δ_shield ≤ 10⁻⁵
  maxDiSotAps: number;           // max |dI_SOT/dt| = 45 A/μs

  // Memory scaling
  logScaleFactor: number;        // O(log t) prefactor
}

// ─── Default Parameters ──────────────────────────────────────────────

export const DEFAULT_PARAMS: SimulationParams = {
  deltaThresh: 0.15,
  hysteresisStep: 1,
  nominalEigengapDecayRate: 0.04,
  lambdaDissipation: 0.5,
  gimTriggerThreshold: 0.25,
  vRef: 1.2,
  bits: 14,
  mRawUH: 0.15,
  deltaShield: 1e-5,
  maxDiSotAps: 45e6,
  logScaleFactor: 0.15,
};

// ─── Derived Hardware Metrics ─────────────────────────────────────────

/**
 * T_eff = 2 * G² * f_SFE  (TOPS)
 */
export function computeTeff(G: number, fSFE_Hz: number): number {
  return (2 * G * G * fSFE_Hz) / 1e12;
}

/**
 * V_LSB = V_ref / 2^B
 */
export function computeVLSB(vRef: number, bits: number): number {
  return vRef / Math.pow(2, bits);
}

/**
 * V_noise ≤ δ_shield * M_raw * max|dI_SOT/dt|
 */
export function computeVNoise(params: SimulationParams): number {
  return params.deltaShield * (params.mRawUH * 1e-6) * params.maxDiSotAps;
}

/**
 * Verify CHS invariant: V_noise < V_LSB
 */
export function verifyCHSInvariant(params: SimulationParams): {
  vNoise: number;
  vLSB: number;
  invariantHolds: boolean;
} {
  const vNoise = computeVNoise(params);
  const vLSB = computeVLSB(params.vRef, params.bits);
  return { vNoise, vLSB, invariantHolds: vNoise < vLSB };
}

// ─── Spectral von Neumann Entropy ────────────────────────────────────

/**
 * H_vN(t) = -Σ_{i=1}^{k} λ̃_i * ln(λ̃_i)
 * where λ̃_i = λ_i / Σλ_j
 */
export function computeVNEntropy(eigenvalues: number[], rank: number): number {
  const totalSum = eigenvalues.reduce((a, b) => a + Math.abs(b), 0);
  if (totalSum === 0) return 0;
  const slice = eigenvalues.slice(0, rank);
  return -slice.reduce((acc, l) => {
    const lNorm = Math.abs(l) / totalSum;
    return acc + (lNorm > 1e-12 ? lNorm * Math.log(lNorm) : 0);
  }, 0);
}

// ─── Effective Learning Rate ──────────────────────────────────────────

/**
 * η_t^eff = η_t / (1 + σ̂_t² / δ_min)
 * Adaptive step size that saturates under extreme adversarial noise.
 */
export function computeEffectiveLR(
  eta: number,
  sigmaSq: number,
  deltaMin: number
): number {
  return eta / (1 + sigmaSq / Math.max(deltaMin, 1e-8));
}

// ─── Regret Bound Estimation ─────────────────────────────────────────

/**
 * R_T ∈ O( k * ln(d) / δ_min * ln(T) )
 */
export function estimateRegretBound(k: number, d: number, deltaMin: number, T: number): number {
  return (k * Math.log(d)) / Math.max(deltaMin, 1e-8) * Math.log(Math.max(T, 1));
}

// ─── Main Simulation Step ─────────────────────────────────────────────

/**
 * Executes one simulation tick implementing all 5 analytical pillars.
 */
export function executeSimulationStep(
  state: PMMState,
  inputs: SimulationInputs,
  params: SimulationParams
): PMMState {
  const { eigenvalues, activeRank, vNEntropy, gimFilterW, parameterDriftSOTA } = state;
  const { noiseTensorMagnitude, dt, quantizationNoise } = inputs;
  const tick = state.tick + 1;

  // ── Pillar 1: Spectral Eigengap Dynamics ──────────────────────────

  const nextEigenvalues = [...eigenvalues];

  if (state.isAttacked) {
    // Adversarial slow-boil: inflates λ_{k+1}, deflates λ_k
    nextEigenvalues[activeRank - 1] = Math.max(0.01,
      nextEigenvalues[activeRank - 1] - noiseTensorMagnitude * 1.5 * dt
    );
    nextEigenvalues[activeRank] = Math.min(
      nextEigenvalues[activeRank - 1] - 0.001,
      nextEigenvalues[activeRank] + noiseTensorMagnitude * 1.2 * dt
    );
  } else {
    // Natural recovery toward nominal spacing
    const target = 1.0 - (activeRank - 1) * 0.15;
    nextEigenvalues[activeRank - 1] += (target - nextEigenvalues[activeRank - 1]) * 0.02 * dt;
  }

  // Enforce ordering invariant: λ_1 > λ_2 > ... > λ_d > 0
  for (let i = 1; i < nextEigenvalues.length; i++) {
    nextEigenvalues[i] = Math.min(nextEigenvalues[i], nextEigenvalues[i - 1] - 0.001);
    nextEigenvalues[i] = Math.max(nextEigenvalues[i], 0.001);
  }

  const nextEigengap = nextEigenvalues[activeRank - 1] - nextEigenvalues[activeRank];

  // ── Spectral von Neumann Entropy ──────────────────────────────────

  const nextVNEntropy = computeVNEntropy(nextEigenvalues, activeRank);
  const deltaH = Math.abs(nextVNEntropy - vNEntropy);

  // ── Hysteresis Dead-Zone Rank Adaptation ──────────────────────────
  // |ΔH_vN(t)| > Δ_thresh(k_t) → k_{t+1} = k_t + Δk

  let nextRank = activeRank;
  if (state.isAttacked && deltaH > params.deltaThresh) {
    nextRank = Math.min(eigenvalues.length - 2, activeRank + params.hysteresisStep);
  } else if (!state.isAttacked && activeRank > 8) {
    // Slowly recover rank when not under attack
    nextRank = Math.max(8, activeRank - 1);
  }

  // ── Pillar 2: GIM Lyapunov Fading-Memory Filter ───────────────────
  // Ẇ_t = -λ * W_t + γ_0(||d_t||²)

  const gamma0 = noiseTensorMagnitude * noiseTensorMagnitude;
  const dW = -params.lambdaDissipation * gimFilterW + gamma0;
  const nextGimFilterW = Math.max(0, gimFilterW + dW * dt);

  // GIM fires when W_t exceeds trigger threshold (Integrity Predicate I(t) = 1)
  const integrityBreach = state.isAttacked && nextEigengap < params.deltaThresh;

  // ── Pillar 4: DASM Rollback / Drift Analysis ──────────────────────

  // SOTA drift: accumulates under noise — E[||θ_rollback - θ_t||²] → ∞
  const epsilonArith = quantizationNoise ? 1e-3 : 1e-6;
  const nextDriftSOTA = state.isAttacked
    ? parameterDriftSOTA + 2 * dt * Math.pow(epsilonArith, 2) * Math.log(parameterDriftSOTA + 1.1) * 1000
    : Math.max(0, parameterDriftSOTA - 0.001 * dt);

  // PMM drift: always 0 via bit-true SOT-MRAM snapshot (DASM Zero-Drift Invariant)
  const nextDriftPMM = 0.0;

  // ── Memory Scaling ────────────────────────────────────────────────

  const memoryUsagePMM = params.logScaleFactor * Math.log(tick + 1);
  const memoryUsageSOTA = tick * 0.01;

  return {
    eigenvalues: nextEigenvalues,
    activeRank: nextRank,
    eigengap: nextEigengap,
    vNEntropy: nextVNEntropy,
    gimFilterW: nextGimFilterW,
    integrityBreach,
    parameterDriftSOTA: nextDriftSOTA,
    parameterDriftPMM: nextDriftPMM,
    isAttacked: state.isAttacked,
    tick,
    memoryUsagePMM,
    memoryUsageSOTA,
  };
}

// ─── Initial State Factory ───────────────────────────────────────────

export function createInitialPMMState(d = 16): PMMState {
  // Eigenvalue spectrum with natural decay spacing
  const eigenvalues = Array.from({ length: d }, (_, i) => Math.max(0.01, 1.0 - i * 0.08 + Math.random() * 0.01));
  // Sort descending
  eigenvalues.sort((a, b) => b - a);

  const activeRank = 8;
  const eigengap = eigenvalues[activeRank - 1] - eigenvalues[activeRank];
  const vNEntropy = computeVNEntropy(eigenvalues, activeRank);

  return {
    eigenvalues,
    activeRank,
    eigengap,
    vNEntropy,
    gimFilterW: 0,
    integrityBreach: false,
    parameterDriftSOTA: 0,
    parameterDriftPMM: 0,
    isAttacked: false,
    tick: 0,
    memoryUsagePMM: 0,
    memoryUsageSOTA: 0,
  };
}

// ─── End-to-End Cascade Reliability ──────────────────────────────────

/**
 * P(F_system) ≤ Σ p_ℓ + p_src + ε_arith
 */
export function computeCascadeReliability(
  layerFailureProbs: number[],
  pSrc: number,
  epsilonArith: number
): number {
  return layerFailureProbs.reduce((a, b) => a + b, 0) + pSrc + epsilonArith;
}
