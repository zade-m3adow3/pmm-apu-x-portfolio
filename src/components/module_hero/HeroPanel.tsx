import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { InlineMath, BlockMath } from '../Math';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Preload the model
useGLTF.preload('/base.glb');

// -- Post-processing Wrapper
function BloomPass() {
  const { gl, scene, camera, size } = useThree();
  const composer = useRef<EffectComposer | null>(null);

  useMemo(() => {
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      1.5, // strength
      0.4, // radius
      0.85 // threshold
    );

    composer.current = new EffectComposer(gl);
    composer.current.addPass(renderScene);
    composer.current.addPass(bloomPass);
  }, [gl, scene, camera, size]);

  useFrame(() => {
    if (composer.current) {
      composer.current.render();
    }
  }, 1); // priority 1 ensures it renders after everything else

  return null;
}

// -- The 3D Model
function BaseArchitecture({ targetPart }: { targetPart: string | null }) {
  const { scene } = useGLTF('/base.glb');
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    // Setup initial materials if needed
    c.traverse((node: any) => {
      if (node.isMesh) {
        node.material = node.material.clone();
      }
    });
    return c;
  }, [scene]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Slow rotation unless focusing
      if (!targetPart) {
        groupRef.current.rotation.y += delta * 0.02;
      }
    }

    // Camera animation logic based on targetPart
    const targetPos = new THREE.Vector3(0, 2, 7);
    const targetLook = new THREE.Vector3(0, 0, 0);

    if (targetPart === 'pmm') {
      targetPos.set(0, 4, 5);
      targetLook.set(0, 2, 0);
    } else if (targetPart === 'chs') {
      targetPos.set(3, 1, 4);
      targetLook.set(2, 0, 0);
    } else if (targetPart === 'stiefel') {
      targetPos.set(-3, 3, 4);
      targetLook.set(-2, 1, 0);
    }

    camera.position.lerp(targetPos, 0.05);
    // Smooth lookAt requires spherical interpolation or a dummy target
    camera.lookAt(targetLook);
  });

  return (
    <group ref={groupRef} scale={[1.2, 1.2, 1.2]} position={[0, -1, 0]}>
      <primitive object={cloned} />
    </group>
  );
}

// -- Main Component
export function HeroPanel() {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  
  // Dummy data for the Hero chart
  const [chartData, setChartData] = useState<{t: number, pmm: number, sota: number}[]>([]);
  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      tick++;
      setChartData(prev => {
        const pmm = 0.95 + Math.sin(tick * 0.1) * 0.05 + Math.random() * 0.02;
        const sota = Math.max(0.1, 0.9 - tick * 0.02 + Math.random() * 0.1);
        const next = [...prev, { t: tick, pmm, sota }];
        return next.slice(-100);
      });
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full h-full flex bg-[#08080C] overflow-hidden relative">
      {/* Left Side: Clinical Abstract */}
      <div className="w-1/2 h-full overflow-y-auto border-r border-white/5 p-8 custom-scrollbar">
        <h1 className="text-3xl font-bold font-mono tracking-widest text-cyan-400 mb-8">
          THE POST-MITIGATED ABRAXAS MODEL (PMM)
        </h1>
        
        <div className="space-y-12">
          {/* Section 1 */}
          <div 
            className="group relative p-6 rounded-xl border border-white/5 bg-white/5 transition-all duration-300 hover:bg-white/10 hover:border-cyan-500/50 cursor-crosshair"
            onMouseEnter={() => setHoveredSection('pmm')}
            onMouseLeave={() => setHoveredSection(null)}
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/0 group-hover:bg-cyan-500 transition-colors"></div>
            <h2 className="text-lg font-mono text-slate-300 mb-4 tracking-widest">DEFINITION 1.1: PMM ARCHITECTURE</h2>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed font-mono">
              The Post-Mitigated Abraxas Model is defined as a non-stationary Markov Decision Process embedded within a continuous-time neuromorphic substrate, optimized under structural adversarial streams.
            </p>
            <div className="bg-slate-900/80 p-4 rounded-lg font-mono text-sm overflow-x-auto text-cyan-300 shadow-inner">
              <BlockMath math={String.raw`\mathcal{M}_{PMM} = \left( \mathcal{S}, \mathcal{A}, P_t, R_t, \gamma, \mathcal{E}_{DASM} \right)`} />
            </div>
          </div>

          {/* Section 2 */}
          <div 
            className="group relative p-6 rounded-xl border border-white/5 bg-white/5 transition-all duration-300 hover:bg-white/10 hover:border-emerald-500/50 cursor-crosshair"
            onMouseEnter={() => setHoveredSection('stiefel')}
            onMouseLeave={() => setHoveredSection(null)}
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/0 group-hover:bg-emerald-500 transition-colors"></div>
            <h2 className="text-lg font-mono text-slate-300 mb-4 tracking-widest">THEOREM 2.19: LYAPUNOV STABILITY</h2>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed font-mono">
              Under adaptive step-size compression <InlineMath math={String.raw`\eta_t^{eff}`} />, the system maintains strict asymptotic stability on the Stiefel manifold.
            </p>
            <div className="bg-slate-900/80 p-4 rounded-lg font-mono text-sm overflow-x-auto text-emerald-300 shadow-inner flex flex-col gap-4">
              <BlockMath math={String.raw`\eta_t^{eff} = \frac{\eta_t}{1 + \frac{\hat{\sigma}_t^2}{\delta_{min}}}`} />
              <BlockMath math={String.raw`\dot{V}(U_t) \le -2\delta_k V(U_t)`} />
            </div>
          </div>

          {/* Section 3 */}
          <div 
            className="group relative p-6 rounded-xl border border-white/5 bg-white/5 transition-all duration-300 hover:bg-white/10 hover:border-amber-500/50 cursor-crosshair"
            onMouseEnter={() => setHoveredSection('chs')}
            onMouseLeave={() => setHoveredSection(null)}
          >
             <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/0 group-hover:bg-amber-500 transition-colors"></div>
            <h2 className="text-lg font-mono text-slate-300 mb-4 tracking-widest">BOUNDARY CONDITION 2: THERMAL INVARIANT</h2>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed font-mono">
              Ensures computational integrity by constraining the maximum thermal drift across the monolithic 3D crossbar matrix.
            </p>
            <div className="bg-slate-900/80 p-4 rounded-lg font-mono text-sm overflow-x-auto text-amber-300 shadow-inner">
              <BlockMath math={String.raw`\Delta T_{max} = \frac{P_{density} d_{layer}^2}{2\kappa_{vertical}}`} />
            </div>
          </div>
          
           {/* Section 4 */}
           <div 
            className="group relative p-6 rounded-xl border border-white/5 bg-white/5 transition-all duration-300 hover:bg-white/10 hover:border-purple-500/50 cursor-crosshair"
            onMouseEnter={() => setHoveredSection('chs')}
            onMouseLeave={() => setHoveredSection(null)}
          >
             <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/0 group-hover:bg-purple-500 transition-colors"></div>
            <h2 className="text-lg font-mono text-slate-300 mb-4 tracking-widest">PERFECT FARADAY INVARIANT</h2>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed font-mono">
              Electromagnetic containment achieved via Coaxial Heterogeneous Shielding (CHS).
            </p>
            <div className="bg-slate-900/80 p-4 rounded-lg font-mono text-sm overflow-x-auto text-purple-300 shadow-inner">
              <BlockMath math={String.raw`n \times E = 0`} />
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: 3D Orbit Viewport */}
      <div className="w-1/2 h-full relative">
        <Canvas camera={{ position: [0, 2, 7], fov: 45 }} gl={{ antialias: true, alpha: false }}>
          <color attach="background" args={['#08080C']} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} color="#e0f2fe" />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#38bdf8" />
          <Environment preset="city" />
          
          <React.Suspense fallback={null}>
            <BaseArchitecture targetPart={hoveredSection} />
          </React.Suspense>
          
          {/* Post-processing */}
          <BloomPass />
        </Canvas>
        
        {/* Decorative Grid Lines Overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(30, 41, 59, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 41, 59, 0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}></div>

        {/* Dynamic Trajectory Graph overlay */}
        <div className="absolute bottom-8 right-8 z-10 w-[400px] h-[220px] bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-2xl flex flex-col pointer-events-auto">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-3 flex justify-between">
            <span>Global Stability Trajectory</span>
            <span className="text-cyan-400">Real-Time</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="t" tick={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} domain={[0, 1.2]} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11 }}
                />
                <Line type="monotone" dataKey="pmm" name="PMM (Stable)" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="sota" name="SOTA (Collapse)" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
