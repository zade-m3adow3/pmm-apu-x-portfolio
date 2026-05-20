import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { InlineMath } from 'react-katex';
import { AlertTriangle, Zap, RotateCcw } from 'lucide-react';

useGLTF.preload('/base.glb');
useGLTF.preload('/Grid.glb');

// ─── Physical constants (from thesis) ───────────────────────────────────────
const KAPPA_VERTICAL = 1400;   // W/m·K — CNT pillar thermal conductivity
const D_LAYER = 0.85e-9;       // 850 nm layer thickness in metres
const EPSILON_ARITH_NOMINAL = 1e-6;
const EPSILON_ARITH_MAX = 1e-3;
const HISTORY_LEN = 150;

// ΔT_max = P_density * d_layer² / (2 * κ_vertical)
const computeDeltaT = (pDensity: number) =>
  (pDensity * 1e9 * D_LAYER * D_LAYER) / (2 * KAPPA_VERTICAL); // in K — scale for display

// Arithmetic precision degrades with heat
const computeEpsilonArith = (deltaT: number) =>
  EPSILON_ARITH_NOMINAL * Math.exp(deltaT * 12000);

// ─── APU-X GLB Model ─────────────────────────────────────────────────────────
interface APUXModelProps {
  isInterrupt: boolean;
  power: number;
}

function APUXModel({ isInterrupt, power }: APUXModelProps) {
  const { scene: baseScene } = useGLTF('/base.glb');
  const { scene: gridScene } = useGLTF('/Grid.glb');
  const groupRef = useRef<THREE.Group>(null);
  const flashTimerRef = useRef(0);
  const matPairsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  // Clone scene + all materials upfront — stored in ref for useFrame
  const { clonedBase, clonedGrid } = React.useMemo(() => {
    const cBase = baseScene.clone(true);
    const cGrid = gridScene.clone(true);
    const mats: THREE.MeshStandardMaterial[] = [];

    const processNode = (node: any) => {
      if (!node.isMesh) return;
      const mesh = node as THREE.Mesh;
      const orig = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;

      let stdMat: THREE.MeshStandardMaterial;
      if (orig && (orig as any).isMeshStandardMaterial) {
        stdMat = (orig as THREE.MeshStandardMaterial).clone();
      } else if (orig && (orig as any).isMeshPhysicalMaterial) {
        stdMat = (orig as THREE.MeshStandardMaterial).clone();
      } else {
        stdMat = new THREE.MeshStandardMaterial({
          color: (orig as any)?.color ?? new THREE.Color('#aaaaaa'),
          metalness: 0.8,
          roughness: 0.2,
        });
      }
      stdMat.emissiveIntensity = 0;
      mesh.material = stdMat;
      mats.push(stdMat);
    };

    cBase.traverse(processNode);
    cGrid.traverse(processNode);

    matPairsRef.current = mats;
    return { clonedBase: cBase, clonedGrid: cGrid };
  }, [baseScene, gridScene]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.25;

    const heatFraction = Math.min(power / 12.5, 1);

    if (isInterrupt) flashTimerRef.current = 0.8;
    if (flashTimerRef.current > 0) flashTimerRef.current -= delta * 3;
    const flash = Math.max(flashTimerRef.current, 0);

    for (const mat of matPairsRef.current) {
      if (flash > 0) {
        mat.emissive.setRGB(flash * 0.9, 0, 0);
        mat.emissiveIntensity = flash * 3;
      } else {
        mat.emissive.setRGB(heatFraction * 0.8, heatFraction * 0.1, 0);
        mat.emissiveIntensity = heatFraction * 0.6;
      }
    }
  });

  return (
    <group ref={groupRef} scale={[0.65, 0.65, 0.65]} position={[0, -0.5, 0]}>
      <primitive object={clonedBase} scale={[1.25, 1.25, 1.25]} position={[0, -0.6, 0]} />
      <primitive object={clonedGrid} position={[0, 0.2, 0]} />
    </group>
  );
}


// ─── DASM Rollback State Vector ───────────────────────────────────────────────
const DIM = 8;
const makeTheta = () => Array.from({ length: DIM }, () => parseFloat((Math.random() * 2 - 1).toFixed(4)));

// S_rollback(θ_{t+1}) = (I - A_t)θ_{t+1} + A_t θ_snapshot
function dasmRollback(thetaNext: number[], thetaSnap: number[], aWeight: number): number[] {
  return thetaNext.map((v, i) => (1 - aWeight) * v + aWeight * thetaSnap[i]);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ThermalDASM() {
  const [power, setPower] = useState(2.0);            // W/mm³
  const [isInterrupt, setIsInterrupt] = useState(false);
  const [history, setHistory] = useState<{ t: number; deltaT: number; epsilon: number; threshold: number }[]>([]);
  const tickRef = useRef(0);

  // DASM state
  const [snapshot]  = useState<number[]>(() => makeTheta());
  const [thetaCurr, setThetaCurr] = useState<number[]>(() => makeTheta());
  const [thetaRoll, setThetaRoll] = useState<number[] | null>(null);
  const [rollbackFlash, setRollbackFlash] = useState(false);

  // Derived
  const deltaT    = computeDeltaT(power);
  const epsilon   = computeEpsilonArith(deltaT);
  const isWarning = epsilon >= EPSILON_ARITH_MAX;

  // Temperature history stream
  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1;
      const noise = (Math.random() - 0.5) * 0.02 * deltaT;
      setHistory(prev => {
        const next = [...prev, {
          t: tickRef.current,
          deltaT: parseFloat((deltaT + noise).toFixed(6)),
          epsilon: parseFloat(Math.min(epsilon, 2e-3).toFixed(8)),
          threshold: EPSILON_ARITH_MAX,
        }];
        return next.slice(-HISTORY_LEN);
      });
      // Drift theta over time
      setThetaCurr(prev => prev.map(v => parseFloat((v + (Math.random() - 0.5) * 0.02).toFixed(4))));
    }, 150);
    return () => clearInterval(id);
  }, [deltaT, epsilon]);

  const handleInterrupt = useCallback(() => {
    setIsInterrupt(true);
    setRollbackFlash(true);
    // O(1) rollback — instantly restore snapshot
    const rolled = dasmRollback(thetaCurr, snapshot, 0.92);
    setThetaRoll(rolled);
    setTimeout(() => {
      setIsInterrupt(false);
      setRollbackFlash(false);
      setThetaRoll(null);
    }, 1800);
  }, [thetaCurr, snapshot]);

  const displayTheta = thetaRoll ?? thetaCurr;

  return (
    <div className="w-full h-full flex flex-col bg-[#08080C] overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-7 pb-4 flex-shrink-0 border-b border-white/5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold font-mono text-white tracking-widest flex items-center gap-3">
              <span className="text-amber-400">06</span> APU-X THERMAL THROTTLING & DASM ROLLBACK
            </h2>
            <p className="text-sm text-slate-400 font-mono mt-1 max-w-2xl">
              Boundary Condition 2 (Thermal Dissipation) & Lemma 6.1 (DASM). Interactive hardware invariant verification.
            </p>
          </div>
          {isWarning && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/50 bg-red-500/10 text-red-400 font-mono text-sm animate-pulse flex-shrink-0">
              <AlertTriangle size={16} />
              ε_arith BREACH
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 3D Model Panel */}
        <div className="w-[450px] flex-shrink-0 relative border-r border-white/5">
          <Canvas camera={{ position: [6, 4, 10], fov: 50 }}>
            <color attach="background" args={['#08080C']} />
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 10, 5]} intensity={1.5} />
            <pointLight position={[0, 5, 0]} intensity={isWarning ? 2 : 0.5} color={isWarning ? '#ef4444' : '#f59e0b'} />
            <Environment preset="city" />
            <React.Suspense fallback={null}>
              <APUXModel isInterrupt={isInterrupt} power={power} />
            </React.Suspense>
            <OrbitControls enablePan={false} minDistance={3} maxDistance={20} />
          </Canvas>

          {/* Power readout overlay */}
          <div className="absolute top-4 left-4 glass rounded-xl p-3 font-mono text-xs">
            <div className="text-slate-400 mb-1">Power Density</div>
            <div className="text-2xl font-bold text-amber-400">{power.toFixed(2)}</div>
            <div className="text-slate-500">W/mm³</div>
          </div>

          <div className={`absolute bottom-4 left-4 right-4 glass rounded-xl p-3 font-mono text-xs transition-all duration-300 ${isWarning ? 'border border-red-500/30' : ''}`}>
            <div className="flex justify-between mb-1">
              <span className="text-slate-400">ΔT_max</span>
              <span className="text-amber-400 font-bold">{(deltaT * 1e6).toExponential(3)} μK</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ε_arith</span>
              <span className={`font-bold ${isWarning ? 'text-red-400' : 'text-emerald-400'}`}>
                {epsilon.toExponential(2)}
                {isWarning ? ' ⚠ ≥ 10⁻³' : ' < 10⁻³ ✓'}
              </span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top: controls + DASM state vector */}
          <div className="flex gap-4 p-5 border-b border-white/5">
            {/* Power slider */}
            <div className="flex-1 glass rounded-xl p-4">
              <label className="block font-mono text-xs text-slate-400 mb-3 uppercase tracking-widest">
                Computational Power Density
              </label>
              <div className="text-center mb-2">
                <InlineMath math={String.raw`P_{density} = ${power.toFixed(2)}\,\text{W/mm}^3`} />
              </div>
              <input
                type="range" min="0.1" max="12.5" step="0.1"
                value={power}
                onChange={e => setPower(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: '#f59e0b' }}
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>0.1 W/mm³</span><span>12.5 W/mm³ (max)</span>
              </div>
              <div className="mt-3 text-center overflow-x-auto">
                <InlineMath math={String.raw`\Delta T_{max} = \frac{P_{density}\,d_{layer}^2}{2\kappa_{vertical}}`} />
              </div>
            </div>

            {/* GIM Interrupt Button */}
            <div className="flex flex-col items-center justify-center gap-3 glass rounded-xl p-5 min-w-[160px]">
              <div className="font-mono text-xs text-slate-400 uppercase tracking-widest text-center">GIM Interrupt</div>
              <button
                id="gim-interrupt-btn"
                onClick={handleInterrupt}
                disabled={isInterrupt}
                className={`w-full py-4 px-4 rounded-xl font-mono font-bold text-sm uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 shadow-2xl border-2
                  ${isInterrupt
                    ? 'bg-red-900/40 border-red-500/40 text-red-300 cursor-not-allowed'
                    : 'bg-red-600 border-red-500 text-white hover:bg-red-500 hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] active:scale-95'
                  }`}
              >
                <Zap size={18} />
                {isInterrupt ? 'ROLLING BACK...' : 'Trigger GIM\nInterrupt'}
              </button>
              <div className="text-[10px] font-mono text-slate-500 text-center">
                Executes DASM rollback<br />in <span className="text-cyan-400">𝒪(1)</span> time
              </div>
            </div>
          </div>

          {/* DASM State Vector */}
          <div className={`mx-5 mt-4 rounded-xl p-4 font-mono text-xs border transition-all duration-500 ${rollbackFlash ? 'border-red-500/50 bg-red-500/5' : 'glass border-white/5'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-slate-400 uppercase tracking-widest">
                {rollbackFlash ? (
                  <span className="text-red-400 flex items-center gap-2">
                    <RotateCcw size={12} className="animate-spin" /> DASM ROLLBACK — θ restored to snapshot
                  </span>
                ) : 'Parameter State Vector θ_t'}
              </div>
              <div className="text-slate-500">dim = {DIM}</div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {displayTheta.map((v, i) => (
                <div key={i} className={`rounded-lg px-2 py-1.5 text-center transition-all duration-500 ${rollbackFlash ? 'bg-red-500/15 text-red-300' : 'bg-white/5 text-cyan-300'}`}>
                  <div className="text-[9px] text-slate-500 mb-0.5">θ[{i}]</div>
                  <div className="font-bold">{v.toFixed(4)}</div>
                </div>
              ))}
            </div>
            {rollbackFlash && (
              <div className="mt-3 text-center overflow-x-auto">
                <InlineMath math={String.raw`\mathcal{S}_{rollback}(\theta_{t+1}) = (I_d - \mathcal{A}_t)\theta_{t+1} + \mathcal{A}_t\theta_{snapshot}`} />
              </div>
            )}
          </div>

          {/* Thermal Chart */}
          <div className="flex-1 min-h-0 px-5 pt-4 pb-4">
            <div className="font-mono text-xs text-slate-400 uppercase tracking-widest mb-2">
              Thermal Invariant Live Stream — ε_arith must remain &lt; 10⁻³
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="epsilonGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isWarning ? '#ef4444' : '#10b981'} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={isWarning ? '#ef4444' : '#10b981'} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={v => v.toExponential(0)} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11 }}
                />
                <ReferenceLine y={EPSILON_ARITH_MAX} stroke="#ef4444" strokeDasharray="6 3" label={{ value: 'ε_arith = 10⁻³ limit', fill: '#ef4444', fontSize: 10, fontFamily: 'monospace' }} />
                <Area type="monotone" dataKey="epsilon" name="ε_arith" stroke={isWarning ? '#ef4444' : '#10b981'} strokeWidth={2} fill="url(#epsilonGrad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
