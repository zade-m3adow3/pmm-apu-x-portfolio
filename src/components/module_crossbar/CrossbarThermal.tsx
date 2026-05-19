import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { InlineMath, BlockMath } from 'react-katex';
import { AlertTriangle, Zap, RotateCcw } from 'lucide-react';

// Preload heavy asset
useGLTF.preload('/Grid.glb');
useGLTF.preload('/base.glb');

// -- Physics Constants
const KAPPA_VERTICAL = 1400;   // W/m·K
const D_LAYER = 0.85e-9;       // 850 nm
const EPSILON_ARITH_NOMINAL = 1e-6;
const EPSILON_ARITH_MAX = 1e-3;
const HISTORY_LEN = 150;
const DIM = 8;

const computeDeltaT = (pDensity: number) =>
  (pDensity * 1e9 * D_LAYER * D_LAYER) / (2 * KAPPA_VERTICAL);

const computeEpsilonArith = (deltaT: number) =>
  EPSILON_ARITH_NOMINAL * Math.exp(deltaT * 12000);

const makeTheta = () => Array.from({ length: DIM }, () => parseFloat((Math.random() * 2 - 1).toFixed(4)));

function dasmRollback(thetaNext: number[], thetaSnap: number[], aWeight: number): number[] {
  return thetaNext.map((v, i) => (1 - aWeight) * v + aWeight * thetaSnap[i]);
}

// -- Instanced Grid Model for High Performance
function InstancedGridModel({ isInterrupt, power }: { isInterrupt: boolean, power: number }) {
  const { scene } = useGLTF('/Grid.glb');
  
  // Convert standard meshes to InstancedMeshes by geometry
  const instancedData = useMemo(() => {
    const meshesByGeo = new Map<string, { geom: THREE.BufferGeometry, mat: THREE.Material, transforms: THREE.Matrix4[] }>();
    
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const geoUuid = mesh.geometry.uuid;
        if (!meshesByGeo.has(geoUuid)) {
           meshesByGeo.set(geoUuid, {
             geom: mesh.geometry.clone(),
             mat: (mesh.material as THREE.Material).clone(),
             transforms: []
           });
        }
        mesh.updateMatrixWorld();
        meshesByGeo.get(geoUuid)!.transforms.push(mesh.matrixWorld.clone());
      }
    });

    const instances: any[] = [];
    meshesByGeo.forEach((data) => {
      if (data.mat instanceof THREE.MeshStandardMaterial) {
        // Ensure standard material for emissive effects
        const mat = new THREE.MeshStandardMaterial({
           color: data.mat.color,
           metalness: 0.8,
           roughness: 0.2,
        });
        instances.push({ geom: data.geom, mat: mat, transforms: data.transforms });
      }
    });
    
    return instances;
  }, [scene]);

  const groupRef = useRef<THREE.Group>(null);
  const flashTimerRef = useRef(0);
  
  // We need refs to all instanced meshes to update their colors
  const instancedMeshRefs = useRef<THREE.InstancedMesh[]>([]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    // Slow orbit
    groupRef.current.rotation.y += delta * 0.1;

    // Thermal animation logic
    const heatFraction = Math.min(power / 12.5, 1);
    
    if (isInterrupt) flashTimerRef.current = 0.8;
    if (flashTimerRef.current > 0) flashTimerRef.current -= delta * 3;
    const flash = Math.max(flashTimerRef.current, 0);

    const dummy = new THREE.Color();

    instancedMeshRefs.current.forEach((iMesh, idx) => {
      if (!iMesh) return;
      const data = instancedData[idx];
      const mat = iMesh.material as THREE.MeshStandardMaterial;
      
      // Update material globally for the instance group
      if (flash > 0) {
        mat.emissive.setRGB(flash, 0, 0);
        mat.emissiveIntensity = flash * 3;
      } else {
        mat.emissive.setRGB(heatFraction * 0.8, heatFraction * 0.2, 0);
        mat.emissiveIntensity = heatFraction * 0.8;
      }
      
      // Optional: Update per-instance color based on distance from center for a hot-spot effect
      for (let i = 0; i < data.transforms.length; i++) {
        const matrix = data.transforms[i];
        const pos = new THREE.Vector3().setFromMatrixPosition(matrix);
        const dist = Math.sqrt(pos.x*pos.x + pos.z*pos.z);
        // Center is hotter
        const localHeat = Math.max(0, 1 - dist/5) * heatFraction;
        
        if (flash > 0) {
          dummy.setRGB(1, 0, 0);
        } else {
          dummy.setRGB(localHeat, localHeat * 0.3, 0);
        }
        iMesh.setColorAt(i, dummy);
      }
      iMesh.instanceColor!.needsUpdate = true;
    });
  });

  return (
    <group ref={groupRef} position={[0, -1, 0]} scale={[1, 1, 1]}>
       {instancedData.map((data, i) => (
         <instancedMesh
           key={i}
           ref={(el) => { if (el) instancedMeshRefs.current[i] = el; }}
           args={[data.geom, data.mat, data.transforms.length]}
         >
           {data.transforms.map((mat: THREE.Matrix4, j: number) => (
             <primitive key={j} object={mat} attachArray="instanceMatrix" />
           ))}
         </instancedMesh>
       ))}
    </group>
  );
}

// Robust model: clones all materials upfront, handles all material types
function DirectGridModel({ isInterrupt, power }: { isInterrupt: boolean, power: number }) {
  const { scene } = useGLTF('/Grid.glb');
  const groupRef = useRef<THREE.Group>(null);
  const flashTimerRef = useRef(0);
  // Store [mesh, clonedMaterial] pairs so we never re-traverse in useFrame
  const matPairsRef = useRef<Array<{ mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }>>([]);

  const cloned = React.useMemo(() => {
    const c = scene.clone(true);
    const pairs: Array<{ mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }> = [];

    c.traverse((node: any) => {
      if (!node.isMesh) return;
      const mesh = node as THREE.Mesh;

      // Ensure we always get a MeshStandardMaterial (upgrade if needed)
      let stdMat: THREE.MeshStandardMaterial;
      const orig = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (orig && (orig as any).isMeshStandardMaterial) {
        stdMat = (orig as THREE.MeshStandardMaterial).clone();
      } else if (orig && (orig as any).isMeshPhysicalMaterial) {
        stdMat = (orig as THREE.MeshStandardMaterial).clone();
      } else {
        // Fallback: create a standard material preserving base colour
        const baseColor = (orig as any)?.color ?? new THREE.Color('#888888');
        stdMat = new THREE.MeshStandardMaterial({
          color: baseColor,
          metalness: 0.7,
          roughness: 0.3,
        });
      }
      stdMat.emissiveIntensity = 0;
      mesh.material = stdMat;
      pairs.push({ mesh, mat: stdMat });
    });

    matPairsRef.current = pairs;
    return c;
  }, [scene]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.05;

    const heatFraction = Math.min(power / 12.5, 1);

    if (isInterrupt) flashTimerRef.current = 0.8;
    if (flashTimerRef.current > 0) flashTimerRef.current -= delta * 3;
    const flash = Math.max(flashTimerRef.current, 0);

    // Cold  = blue-ish tint (low heatFraction)
    // Hot   = amber (mid) → red (high)
    for (const { mat } of matPairsRef.current) {
      if (flash > 0) {
        mat.emissive.setRGB(flash * 0.8, 0, 0);
        mat.emissiveIntensity = flash * 2.5;
      } else if (heatFraction < 0.01) {
        mat.emissive.set(0x000000);
        mat.emissiveIntensity = 0;
      } else {
        // Blue → Amber → Red ramp
        const r = Math.min(heatFraction * 1.4, 1.0);
        const g = Math.max(0, heatFraction * 0.6 - 0.1);
        const b = Math.max(0, 0.5 - heatFraction * 1.2);
        mat.emissive.setRGB(r, g, b);
        mat.emissiveIntensity = 0.3 + heatFraction * 0.7;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, -1, 0]} scale={[0.8, 0.8, 0.8]}>
      <primitive object={cloned} />
      <primitive object={useGLTF('/base.glb').scene.clone()} position={[0, -0.5, 0]} scale={[1.2, 1.2, 1.2]} />
    </group>
  );
}


// -- Main Component
export function CrossbarThermal() {
  const [power, setPower] = useState(2.0);
  const [isInterrupt, setIsInterrupt] = useState(false);
  const [history, setHistory] = useState<{ t: number; deltaT: number; epsilon: number; threshold: number }[]>([]);
  const tickRef = useRef(0);

  const [snapshot]  = useState<number[]>(() => makeTheta());
  const [thetaCurr, setThetaCurr] = useState<number[]>(() => makeTheta());
  const [thetaRoll, setThetaRoll] = useState<number[] | null>(null);
  const [rollbackFlash, setRollbackFlash] = useState(false);

  const deltaT    = computeDeltaT(power);
  const epsilon   = computeEpsilonArith(deltaT);
  const isWarning = epsilon >= EPSILON_ARITH_MAX;

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
      setThetaCurr(prev => prev.map(v => parseFloat((v + (Math.random() - 0.5) * 0.02).toFixed(4))));
    }, 150);
    return () => clearInterval(id);
  }, [deltaT, epsilon]);

  const handleInterrupt = () => {
    setIsInterrupt(true);
    setRollbackFlash(true);
    const rolled = dasmRollback(thetaCurr, snapshot, 0.92);
    setThetaRoll(rolled);
    setTimeout(() => {
      setIsInterrupt(false);
      setRollbackFlash(false);
      setThetaRoll(null);
    }, 1800);
  };

  const displayTheta = thetaRoll ?? thetaCurr;

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 overflow-hidden text-[#E2E8F0]">
      {/* Header */}
      <div className="px-8 pt-7 pb-4 flex-shrink-0 border-b border-white/5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold font-mono text-cyan-400 tracking-widest">
              APU-X NEUROMORPHIC CROSSBAR SUBSTRATE
            </h2>
            <p className="text-sm text-slate-400 font-mono mt-1 max-w-2xl">
              Boundary Condition 2 (Thermal Dissipation) & Lemma 6.1 (DASM). Interactive hardware invariant verification on <span className="text-white">Grid.glb</span>.
            </p>
          </div>
          {isWarning && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/50 bg-red-500/10 text-red-400 font-mono text-sm animate-pulse">
              <AlertTriangle size={16} />
              ε_arith BREACH
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 3D Model Panel */}
        <div className="w-[450px] flex-shrink-0 relative border-r border-white/5 bg-[#08080C]">
          <Canvas camera={{ position: [5, 4, 10], fov: 60 }}>
            <color attach="background" args={['#08080C']} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} color="#e0f2fe" />
            <pointLight position={[0, 5, 0]} intensity={isWarning ? 3 : 1} color={isWarning ? '#ef4444' : '#f59e0b'} />
            <Environment preset="city" />
            
            <React.Suspense fallback={null}>
              <DirectGridModel isInterrupt={isInterrupt} power={power} />
            </React.Suspense>
            
            <OrbitControls enablePan={false} minDistance={3} maxDistance={20} />
          </Canvas>

          {/* Overlays */}
          <div className="absolute top-6 left-6 right-6">
            <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-2xl">
              <label className="block font-mono text-xs text-slate-400 mb-3 uppercase tracking-widest">
                Computational Power Density (<InlineMath math="P_{density}" />)
              </label>
              <div className="text-center mb-2 font-bold text-amber-400 text-lg">
                <InlineMath math={`P_{density} = ${power.toFixed(2)}\\,\\text{W/mm}^3`} />
              </div>
              <input
                type="range" min="0.1" max="12.5" step="0.1"
                value={power}
                onChange={e => setPower(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-800"
                style={{ accentColor: '#f59e0b' }}
              />
            </div>
          </div>

          <div className={`absolute bottom-6 left-6 right-6 bg-slate-900/80 backdrop-blur-md rounded-xl p-4 transition-all duration-300 shadow-2xl ${isWarning ? 'border-2 border-red-500/50' : 'border border-white/10'}`}>
            <h3 className="font-mono text-xs text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2 mb-3">
              Thermal Profile
            </h3>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-xs font-mono">Max ΔT:</span>
              <span className="text-amber-400 font-bold font-mono text-sm">{(deltaT * 1e6).toExponential(3)} μK</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs font-mono">Arith Precision:</span>
              <span className={`font-bold font-mono text-sm ${isWarning ? 'text-red-400' : 'text-emerald-400'}`}>
                {epsilon.toExponential(2)}
                {isWarning ? ' ⚠ ≥ 10⁻³' : ' < 10⁻³ ✓'}
              </span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/50 p-8 gap-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900/60 backdrop-blur-md rounded-xl p-6 border border-white/10 flex flex-col justify-center">
              <div className="text-center overflow-x-auto text-amber-400">
                <BlockMath math={`\\Delta T_{max} = \\frac{P_{density}\\,d_{layer}^2}{2\\kappa_{vertical}}`} />
              </div>
              <p className="text-xs text-slate-400 text-center font-mono mt-4">
                Vertical CNT pillars maintain <span className="text-emerald-400 text-sm"><InlineMath math="\kappa_{vertical} \ge 1400" /></span> W/m·K.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 bg-slate-900/60 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <button
                onClick={handleInterrupt}
                disabled={isInterrupt}
                className={`w-full py-4 px-4 rounded-xl font-mono font-bold text-sm uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 shadow-lg border-2
                  ${isInterrupt
                    ? 'bg-red-900/40 border-red-500/40 text-red-300 cursor-not-allowed'
                    : 'bg-red-600/20 border-red-500/50 text-red-400 hover:bg-red-600 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                  }`}
              >
                <Zap size={18} />
                {isInterrupt ? 'ROLLING BACK...' : 'Trigger GIM Interrupt'}
              </button>
              <div className="text-[10px] font-mono text-slate-500 text-center">
                Executes DASM rollback in <span className="text-cyan-400 font-bold">𝒪(1)</span> time
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-6 font-mono text-xs border transition-all duration-500 shadow-xl ${rollbackFlash ? 'border-red-500/50 bg-red-500/10' : 'bg-slate-900/60 backdrop-blur-md border-white/10'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-slate-400 uppercase tracking-widest">
                {rollbackFlash ? (
                  <span className="text-red-400 flex items-center gap-2 font-bold text-sm">
                    <RotateCcw size={14} className="animate-spin" /> DASM ROLLBACK — θ RESTORED
                  </span>
                ) : 'Parameter State Vector θ_t'}
              </div>
              <div className="text-slate-500">dim = {DIM}</div>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {displayTheta.map((v, i) => (
                <div key={i} className={`rounded-lg px-2 py-3 text-center transition-all duration-500 ${rollbackFlash ? 'bg-red-500/20 text-white' : 'bg-white/5 text-cyan-300'}`}>
                  <div className="text-[10px] text-slate-500 mb-1">θ[{i}]</div>
                  <div className="font-bold text-sm">{v.toFixed(4)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-slate-900/60 backdrop-blur-md rounded-xl border border-white/10 p-5 flex flex-col">
            <div className="font-mono text-xs text-slate-400 uppercase tracking-widest mb-4">
              Thermal Invariant Live Stream
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="epsilonGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isWarning ? '#ef4444' : '#10b981'} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={isWarning ? '#ef4444' : '#10b981'} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={v => v.toExponential(0)} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11 }} />
                  <ReferenceLine y={EPSILON_ARITH_MAX} stroke="#ef4444" strokeDasharray="6 3" />
                  <Area type="monotone" dataKey="epsilon" stroke={isWarning ? '#ef4444' : '#10b981'} strokeWidth={2} fill="url(#epsilonGrad)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
