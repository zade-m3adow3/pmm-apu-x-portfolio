import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { InlineMath, BlockMath } from 'react-katex';

// -- WebGL Shaders
const stiefelVertexShader = `
uniform float uTime;
uniform float uSigma;
uniform float uEtaEff;
attribute float aPhase;
attribute vec3 aTargetDir;

varying vec3 vColor;
varying float vAlpha;

void main() {
    // Current position on the sphere/manifold
    vec3 pos = position;
    
    // Lyapunov flow vector: move towards stable trajectory
    vec3 flow = normalize(cross(pos, vec3(0.0, 1.0, 0.0))) * uEtaEff * 2.0;
    
    // Adversarial noise displacement
    // Pseudo-random noise based on phase and time
    float noise = sin(uTime * 10.0 + aPhase) * cos(uTime * 5.0 - aPhase);
    vec3 scattered = pos + normalize(aTargetDir) * noise * uSigma * 0.5;
    
    // Convergence factor: higher etaEff means we stick closer to the flow
    float convergence = smoothstep(0.0, 0.02, uEtaEff);
    vec3 finalPos = mix(scattered, pos + flow * sin(uTime + aPhase), convergence);
    
    // Project back to manifold surface (approximate by normalizing)
    finalPos = normalize(finalPos) * 2.0;

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_PointSize = (4.0 + convergence * 2.0) * (10.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    
    // Color logic: cyan when stable, amber/red when scattered
    vColor = mix(vec3(1.0, 0.2, 0.2), vec3(0.0, 0.8, 1.0), convergence);
    vAlpha = 0.6 + convergence * 0.4;
}
`;

const stiefelFragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
    // Soft circular particle
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    
    float glow = exp(-r * 3.0);
    gl_FragColor = vec4(vColor, vAlpha * glow);
}
`;

function StiefelStreamlines({ sigma, etaEff }: { sigma: number, etaEff: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const PARTICLE_COUNT = 3000;
  
  const { positions, phases, targetDirs } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const pha = new Float32Array(PARTICLE_COUNT);
    const tgDir = new Float32Array(PARTICLE_COUNT * 3);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Random points on a sphere (Stiefel V_1(R^3))
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);
      
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      
      pha[i] = Math.random() * Math.PI * 2;
      
      tgDir[i * 3] = Math.random() - 0.5;
      tgDir[i * 3 + 1] = Math.random() - 0.5;
      tgDir[i * 3 + 2] = Math.random() - 0.5;
    }
    return { positions: pos, phases: pha, targetDirs: tgDir };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSigma: { value: sigma },
    uEtaEff: { value: etaEff }
  }), []);

  useFrame((state) => {
    if (pointsRef.current) {
      const mat = pointsRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = state.clock.elapsedTime;
      // Smoothly interpolate uniforms
      mat.uniforms.uSigma.value = THREE.MathUtils.lerp(mat.uniforms.uSigma.value, sigma, 0.1);
      mat.uniforms.uEtaEff.value = THREE.MathUtils.lerp(mat.uniforms.uEtaEff.value, etaEff, 0.1);
      
      pointsRef.current.rotation.y += 0.005;
      pointsRef.current.rotation.x += 0.002;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aPhase" count={PARTICLE_COUNT} array={phases} itemSize={1} />
        <bufferAttribute attach="attributes-aTargetDir" count={PARTICLE_COUNT} array={targetDirs} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={stiefelVertexShader}
        fragmentShader={stiefelFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// -- Main Component
export function StiefelTracker() {
  const [sigma, setSigma] = useState(0.0);
  const [history, setHistory] = useState<{ t: number, error: number }[]>([]);
  const tickRef = useRef(0);
  
  // Math constants
  const ETA_BASE = 0.05;
  const DELTA_MIN = 0.2;
  
  // Calculate effective step size
  const etaEff = ETA_BASE / (1 + (sigma * sigma) / DELTA_MIN);
  
  // V_dot logic
  const vDot = -2 * 0.15 * etaEff * (1 + sigma); 

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current++;
      // Tracking error spikes with noise, recovers with low etaEff
      const errorVal = (sigma * 2.5) + (Math.random() * 0.5 * sigma) + (0.1 / Math.max(etaEff, 0.001));
      
      setHistory(prev => {
        const next = [...prev, { t: tickRef.current, error: Math.min(errorVal, 15) }];
        return next.slice(-100);
      });
    }, 100);
    return () => clearInterval(id);
  }, [sigma, etaEff]);

  return (
    <div className="w-full h-full flex flex-col bg-[#08080C] overflow-hidden text-[#E2E8F0]">
      {/* Header */}
      <div className="px-8 pt-7 pb-4 flex-shrink-0 border-b border-white/5 bg-[#08080C]/80 backdrop-blur-md z-10">
        <h2 className="text-2xl font-bold font-mono text-cyan-400 tracking-widest flex items-center gap-3">
          05 ECF STIEFEL MANIFOLD TRACKER
        </h2>
        <p className="text-sm text-slate-400 font-mono mt-1">
          Theorem 2.19 (Lyapunov Stability). Interactive tracking error convergence on <InlineMath math="\mathcal{V}_k(\mathbb{R}^d)" />.
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* WebGL Canvas fills the background */}
        <div className="absolute inset-0 z-0">
          <Canvas camera={{ position: [0, 0, 8], fov: 45 }} gl={{ antialias: false }}>
             <color attach="background" args={['#08080C']} />
             <StiefelStreamlines sigma={sigma} etaEff={etaEff} />
             <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
          </Canvas>
          {/* Decorative Grid Lines Overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(30, 41, 59, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 41, 59, 0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* UI Overlay - Left Panel */}
        <div className="relative z-10 w-[400px] h-full p-6 flex flex-col justify-center gap-6">
          <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-2xl">
            <label className="block font-mono text-xs text-slate-400 mb-3 uppercase tracking-widest">
              Adversarial Noise Injection (<InlineMath math="\hat{\sigma}_t^2" />)
            </label>
            <div className="text-center mb-2 font-mono text-amber-400 font-bold">
              <InlineMath math={`\\hat{\\sigma}_t^2 = ${sigma.toFixed(2)}`} />
            </div>
            <input
              type="range" min="0" max="5" step="0.01"
              value={sigma}
              onChange={e => setSigma(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-800"
              style={{ accentColor: '#38bdf8' }}
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2">
              <span>0.00</span><span>5.00</span>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-2xl space-y-4">
            <h3 className="font-mono text-xs text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2">
              Real-Time Tracking Metrics
            </h3>
            
            <div className="space-y-2">
              <div className="text-[10px] text-slate-500 font-mono uppercase">Effective Step-Size</div>
              <div className="text-cyan-400 font-bold text-lg font-mono">
                <InlineMath math={`\\eta_t^{eff} = ${etaEff.toFixed(4)}`} />
              </div>
              <div className="text-xs text-slate-400 overflow-x-auto pb-2">
                 <BlockMath math={`\\eta_t^{eff} = \\frac{\\eta_t}{1 + \\frac{\\hat{\\sigma}_t^2}{\\delta_{min}}}`} />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="text-[10px] text-slate-500 font-mono uppercase">Lyapunov Dissipation</div>
              <div className="text-emerald-400 font-bold text-lg font-mono">
                <InlineMath math={`\\dot{V} = ${vDot.toFixed(4)}`} />
              </div>
              <div className="text-xs text-slate-400 overflow-x-auto pb-2">
                 <BlockMath math={`\\dot{V}(U_t) \\le -2\\delta_k V(U_t)`} />
              </div>
            </div>
          </div>
        </div>

        {/* Chart Panel - Bottom Right */}
        <div className="absolute bottom-6 right-6 z-10 w-[600px] h-[200px] bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl flex flex-col">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
            <span>Tracking Error Convergence</span>
            <span className={sigma > 2 ? 'text-amber-400' : 'text-emerald-400'}>
              {sigma > 2 ? 'NOISE ADAPTATION ACTIVE' : 'STABLE TRACKING'}
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="t" tick={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="error" 
                  stroke={sigma > 2 ? '#fbbf24' : '#2dd4bf'} 
                  strokeWidth={2} 
                  dot={false} 
                  isAnimationActive={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
