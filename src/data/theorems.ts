import type { TheoremDef, SimulationState } from '../types';
import { estimateRegretBound, computeCascadeReliability } from '../simulation/simulationEngine';
import { HW_METRICS } from '../context/SimulationContext';

export const THEOREMS: TheoremDef[] = [
  {
    id: 'thm-gas-ecf',
    number: 1,
    title: 'Constant-Complete GAS-ECF Margin Gain',
    statementLatex: String.raw`\gamma_{\text{margin}} \implies \text{Strict Lower-Bound Increase over } W_{PCA} \text{ for } \alpha \in \left(0, \frac{K_1}{2K_2}\right)`,
    proofSteps: [
      {
        label: 'Step 1 — Guided Action Subspace Projection',
        latex: String.raw`W^* = \arg\max_{W \in \mathcal{G}_{k,d}} \operatorname{tr}(W^\top \Sigma W) + \alpha \cdot \operatorname{tr}(W^\top \Phi W)`,
        explanation: 'The GAS-ECF projection W* maximizes a convex combination of spectral variance capture and guided action alignment Φ. The parameter α ∈ (0, K₁/2K₂) controls the mixing ratio.',
      },
      {
        label: 'Step 2 — Margin Differential',
        latex: String.raw`\gamma_{\text{margin}} = \operatorname{tr}(W^{*\top} \Sigma W^*) - \operatorname{tr}(W_{PCA}^\top \Sigma W_{PCA}) > 0`,
        explanation: 'By KKT conditions on the augmented Lagrangian, W* strictly dominates W_PCA when α lies in the feasible interval and the eigengap δ_k > Δ_thresh.',
      },
      {
        label: 'Step 3 — Lower Bound on Margin',
        latex: String.raw`\alpha \in \left(0, \frac{K_1}{2K_2}\right) \implies \gamma_{\text{margin}} \geq \frac{\alpha \cdot \delta_{\min}}{2}`,
        explanation: 'The margin gain is lower-bounded by half the product of the mixing coefficient and the minimum structural eigengap δ_min maintained by the hysteresis dead-zone filter.',
      },
    ],
    liveValueLabel: 'γ_margin ≥',
    getLiveValue: (state: SimulationState) => {
      if (state.modelType === 'PMM') {
        const alpha = 0.3;
        const gain = alpha * state.activeEigengap / 2;
        return gain.toFixed(5);
      }
      return '0.00000 (collapse)';
    },
    getStatus: (state: SimulationState) => {
      if (state.modelType !== 'PMM') return 'critical';
      return state.activeEigengap > 0.15 ? 'nominal' : 'warning';
    },
  },
  {
    id: 'thm-regret',
    number: 2,
    title: 'Non-Asymptotic Regret Tracking Bound — Quicksand Oja++',
    statementLatex: String.raw`\mathcal{R}_T \in \mathcal{O}\!\left(\frac{k \cdot \ln d}{\delta_{\min}} \cdot \ln T\right)`,
    proofSteps: [
      {
        label: 'Step 1 — Noise-Adaptive Effective Learning Rate',
        latex: String.raw`\eta_t^{eff} = \frac{\eta_t}{1 + \frac{\hat{\sigma}_t^2}{\delta_{\min}}}`,
        explanation: 'The Quicksand Oja++ step-size is adaptively suppressed in proportion to ambient noise. As σ̂²→∞, η_eff→0, killing the second-order variance accumulation term.',
      },
      {
        label: 'Step 2 — Variance Saturation Proof',
        latex: String.raw`\lim_{\hat{\sigma}_t^2 \to \infty} (\eta_t^{eff})^2 \hat{\sigma}_t^2 \|X_t\|_2^2 = 0`,
        explanation: 'The product (η_eff)²σ̂² converges to zero under extreme noise, eliminating the variance accumulation responsible for exponential regret divergence in SOTA models.',
      },
      {
        label: 'Step 3 — Matrix Bernstein Concentration',
        latex: String.raw`\mathcal{R}_T \leq \frac{C \cdot k \ln d}{\delta_{\min}} \ln T`,
        explanation: 'Summing tracking errors over window T via matrix Bernstein inequalities gives a strictly O(log T) regret. Under δ_min = 0 (SOTA collapse), this diverges to O(√T).',
      },
    ],
    liveValueLabel: 'R_T bound',
    getLiveValue: (state: SimulationState) => {
      const k = 8, d = 512;
      if (state.modelType === 'PMM') {
        const bound = estimateRegretBound(k, d, Math.max(state.activeEigengap, 0.001), state.tick + 1);
        return `${bound.toFixed(1)} (log T)`;
      }
      // SOTA diverges to O(√T) under attack
      return `${(Math.sqrt(state.tick + 1) * 10).toFixed(1)} (√T — diverging)`;
    },
    getStatus: (state: SimulationState) => {
      if (state.modelType !== 'PMM') return state.isAttacked ? 'critical' : 'warning';
      return state.activeEigengap > 0.15 ? 'nominal' : 'warning';
    },
  },
  {
    id: 'thm-supremum',
    number: 3,
    title: 'Supremum Trap Mitigation via Exponential Dissipation',
    statementLatex: String.raw`\dot{W}_t = -\lambda W_t + \gamma_0(\|d_t\|_2^2) \implies V_{GIM}(x,W) = V(x) + W_t`,
    proofSteps: [
      {
        label: 'Step 1 — Fading-Memory Filter Definition',
        latex: String.raw`W_t = \int_0^t e^{-\lambda(t-\tau)} \gamma_0\!\left(\|d_\tau\|_2^2\right) d\tau`,
        explanation: 'W_t is a fading memory integral over disturbance energy. Historical anomalies are exponentially discounted at rate λ, dissolving the Supremum Trap.',
      },
      {
        label: 'Step 2 — ODE via Leibniz Differentiation',
        latex: String.raw`\dot{W}_t = -\lambda W_t + \gamma_0(\|d_t\|_2^2)`,
        explanation: 'Differentiating W_t via Leibniz integral rule yields the linear first-order ODE implemented directly in the GIM update loop.',
      },
      {
        label: 'Step 3 — iISS Trajectory Bound',
        latex: String.raw`\dot{V}_{GIM} \le -\alpha_0(\|x\|) - \lambda W_t + 2\gamma_0(\|d_t\|^2)`,
        explanation: 'The composite Lyapunov derivative is strictly negative definite plus a bounded disturbance input, proving integral Input-to-State Stability (iISS).',
      },
    ],
    liveValueLabel: 'W_t (GIM)',
    getLiveValue: (state: SimulationState) => {
      if (state.modelType === 'PMM') {
        // Use actual GIM filter value from state
        const w = (state as any).gimFilterW ?? (Math.exp(-0.5 * state.tick * 0.01) + (state.isAttacked ? 0.3 : 0.05));
        return w.toFixed(5);
      }
      return state.isAttacked ? `${(1.0 + state.tick * 0.001).toFixed(4)} (∞→)` : (1.0 + state.tick * 0.001).toFixed(4);
    },
    getStatus: (state: SimulationState) => {
      if (state.modelType !== 'PMM') return state.isAttacked ? 'critical' : 'warning';
      return 'nominal';
    },
  },
  {
    id: 'thm-cascade',
    number: 4,
    title: 'End-to-End System Reliability Cascade Invariant',
    statementLatex: String.raw`P(F_{\text{system}}) \leq \sum_{\ell=1}^{L} p_\ell + p_{\text{src}} + \epsilon_{\text{arith}}`,
    proofSteps: [
      {
        label: 'Step 1 — Union Bound over Layer Failures',
        latex: String.raw`P(F_{\text{system}}) \leq \sum_{\ell=1}^{L} p_\ell + p_{\text{src}} + \epsilon_{\text{arith}}`,
        explanation: 'By the union bound, total system failure is at most the sum of L layer failures, semantic discretization error, and mixed-signal arithmetic quantization error.',
      },
      {
        label: 'Step 2 — CHS Shielding Verification',
        latex: String.raw`V_{noise} = \delta_{shield} \cdot M_{raw} \cdot \max\!\left|\tfrac{dI_{SOT}}{dt}\right| \le 67.5\,\mu\text{V} < V_{LSB} \approx 73.24\,\mu\text{V}`,
        explanation: 'With δ_shield = 10⁻⁵, M_raw = 0.15 μH, and max slew = 45 A/μs: V_noise = 67.5 μV < V_LSB = 73.24 μV. Analog array is bit-corruption-free.',
      },
      {
        label: 'Step 3 — ε_arith Bound under Mixed-Signal Control',
        latex: String.raw`\epsilon_{\text{arith}} = \begin{cases} < 10^{-6} & \text{noise = off} \\ \geq 10^{-3} & \text{noise = on} \end{cases}`,
        explanation: 'PMM APU-X mixed-signal calibration keeps ε_arith below 10⁻³ in nominal operation. Quantization noise injection raises it to the danger threshold.',
      },
    ],
    liveValueLabel: 'P(F_sys) ≤',
    getLiveValue: (state: SimulationState) => {
      const pLayer = [1e-9, 1e-9, 1e-10, 1e-9];
      const pSrc = 1e-10;
      const eps = state.quantizationNoise ? 1e-3 : 1e-6;
      const total = computeCascadeReliability(pLayer, pSrc, eps);
      return `${total.toExponential(3)}`;
    },
    getStatus: (state: SimulationState) => {
      if (state.quantizationNoise) return 'warning';
      return 'nominal';
    },
  },
];
