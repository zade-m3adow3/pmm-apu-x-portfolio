import type { SubstrateLayerSpec, ModuleNavItem } from '../types';

// ─── Physical & Mathematical Constants ──────────────────────────────
export const CONSTANTS = {
  // Crossbar Matrix
  CROSSBAR_DIM: 16_384,
  BASE_CLOCK_MHZ: 77,
  TEFF_TOPS: 41.34,        // 2 × G² × f_SFE
  SFE_FREQ: 77e6,

  // M3D ILVs
  ILV_PATH_LENGTH_NM: 850,
  INTRA_DIE_BW_TBS: 1.1,

  // SOT-MRAM
  WRITE_ENDURANCE: 1e15,

  // Thermal
  KAPPA_VERTICAL: 1400,     // W/m·K (CNT pillars)
  V_NOISE_UV: 67.5,         // μV — max inductive noise
  V_LSB_UV: 73.24,          // μV — 14-bit LSB floor

  // Eigengap thresholds
  DELTA_THRESH_DEFAULT: 0.15,
  DELTA_K_NOMINAL: 1.0,
  DELTA_K_DECAY_RATE: 0.04,
  HYSTERESIS_RECOVERY: 0.02,

  // Quantization
  EPSILON_ARITH_HIGH: 1e-3,
  EPSILON_ARITH_LOW: 1e-6,

  // Memory scaling
  LOG_SCALE_FACTOR: 0.15,
  LINEAR_SCALE_FACTOR: 1.0,

  // Chart window
  CHART_WINDOW_SIZE: 200,
  CHART_UPDATE_INTERVAL_MS: 50,
};

// ─── Module Navigation Items ────────────────────────────────────────
export const MODULE_NAV: ModuleNavItem[] = [
  {
    id: 'metaphor',
    label: 'Cognitive Metaphor Core',
    shortLabel: 'Metaphor',
    icon: 'Brain',
    description: '3D Interactive Architecture',
  },
  {
    id: 'sandbox',
    label: 'Adversarial Sandbox',
    shortLabel: 'Sandbox',
    icon: 'Swords',
    description: 'PMM vs. SOTA Dashboard',
  },
  {
    id: 'substrate',
    label: 'APU-X Substrate',
    shortLabel: 'APU-X',
    icon: 'Cpu',
    description: 'Neuromorphic Deep-Dive',
  },
  {
    id: 'proofs',
    label: 'Formal Invariants',
    shortLabel: 'Proofs',
    icon: 'ScrollText',
    description: 'Analytical Proofs Ledger',
  },
];

// ─── APU-X Substrate Layer Specs ────────────────────────────────────
export const SUBSTRATE_LAYERS: SubstrateLayerSpec[] = [
  {
    id: 'crossbar',
    name: 'Switched-Capacitor Crossbar Matrix Array',
    shortName: 'SC Crossbar',
    color: '#00f0ff',
    description: 'High-density mesh grid performing O(1) combinational vector-matrix multiplications via Kirchhoff\'s Current Law.',
    specs: {
      'Mesh Dimensions': '16,384 × 16,384',
      'Effective Throughput': '𝒯_eff = 2G²f_SFE ≈ 41.34 TOPS',
      'Base Clock': '77 MHz',
      'Latency': 'O(1) combinational',
      'Compute Paradigm': 'Analog charge redistribution',
    },
  },
  {
    id: 'm3d-ilvs',
    name: 'Monolithic 3D Inter-Layer Vias (ILVs)',
    shortName: 'M3D ILVs',
    color: '#a78bfa',
    description: 'Vertical metallic interconnect pillars piercing the memory-logic plane with sub-micron path lengths.',
    specs: {
      'Path Length': 'l_path ≤ 850 nm',
      'Parasitic RC Delay': '→ 0 (negligible)',
      'Intra-Die Bandwidth': '1.1 TB/s',
      'Via Density': 'Monolithic 3D stacking',
      'Material': 'Tungsten / Copper hybrid',
    },
  },
  {
    id: 'sot-mram',
    name: 'SOT-MRAM & Graded Buffer Plane',
    shortName: 'SOT-MRAM',
    color: '#f59e0b',
    description: 'Non-volatile magnetic memory with graded SiGe buffer absorbing interfacial shear stresses.',
    specs: {
      'Write Endurance': '𝓔_endure ≥ 10¹⁵ cycles',
      'Frequency Bound': 'f_SOT < 1/τ_phonon',
      'Buffer Material': 'Si₁₋ₓGeₓ (graded)',
      'Stress Constraint': 'max σ_shear < σ_yield',
      'Purpose': 'Single-cycle snapshot storage',
    },
  },
  {
    id: 'thermal',
    name: 'Thermal Dissipation & EM Shielding',
    shortName: 'Thermal/CHS',
    color: '#10b981',
    description: 'Graphene/h-BN heat shunts with vertical CNT pillars and coaxial heterogeneous shielding.',
    specs: {
      'Vertical κ': '≥ 1,400 W/m·K (CNT pillars)',
      'Lateral Shunts': 'Graphene / h-BN interleaved',
      'V_noise': '≤ 67.5 μV',
      'V_LSB (14-bit)': '≈ 73.24 μV',
      'Shielding': 'Coaxial Heterogeneous (CHS)',
    },
  },
];
