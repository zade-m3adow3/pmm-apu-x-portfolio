import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { InlineMath, BlockMath } from '../Math';

function BanachPoints() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const NUM_POINTS = 40;
  
  // Base scatter positions and target canonical point (fixed point)
  const { initialPositions, colors, targetPoint } = useMemo(() => {
    const pos = [];
    const col = [];
    const target = new THREE.Vector3(0, 0, 0); // Canonical cluster center
    
    const colorChoices = [
      new THREE.Color('#38bdf8'), // cyan
      new THREE.Color('#a855f7'), // purple
      new THREE.Color('#f472b6'), // pink
      new THREE.Color('#fcd34d'), // amber
      new THREE.Color('#10b981'), // emerald
    ];

    for (let i = 0; i < NUM_POINTS; i++) {
      pos.push(new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      ));
      col.push(colorChoices[Math.floor(Math.random() * colorChoices.length)]);
    }
    return { initialPositions: pos, colors: col, targetPoint: target };
  }, []);

  const [contractionFactor, setContractionFactor] = useState(0.99); // Start nearly 1
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Animate contraction over time, slowly pulling towards targetPoint
    // Simulates Phi(x, y) = w_x x + w_y y
    // For visualization: points shrink towards 0
    const time = state.clock.elapsedTime;
    
    // Cycle between spreading and contracting every 8 seconds
    const cycle = (time % 8) / 8; 
    let factor = 1;
    if (cycle < 0.2) {
      // Scatter
      factor = 1;
    } else if (cycle < 0.8) {
      // Contract
      const progress = (cycle - 0.2) / 0.6;
      factor = 1 - Math.pow(progress, 3) * 0.95; // Non-linear contraction
    } else {
      // Hold fixed point
      factor = 0.05;
    }
    
    setContractionFactor(factor);

    const dummy = new THREE.Object3D();
    const linePositions = new Float32Array(NUM_POINTS * 2 * 3);
    let lineIdx = 0;

    for (let i = 0; i < NUM_POINTS; i++) {
      // Current position is lerped between initial and target based on factor
      const currentPos = initialPositions[i].clone().lerp(targetPoint, 1 - factor);
      
      // Add slight noise based on distance
      if (factor > 0.1) {
         currentPos.x += Math.sin(time * 2 + i) * factor * 0.2;
         currentPos.y += Math.cos(time * 2 + i) * factor * 0.2;
         currentPos.z += Math.sin(time * 3 + i) * factor * 0.2;
      }

      dummy.position.copy(currentPos);
      
      // Scale down points slightly as they cluster
      const scale = 0.5 + factor * 0.5;
      dummy.scale.setScalar(scale);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, colors[i]);
      
      // Line connects point to target
      linePositions[lineIdx++] = currentPos.x;
      linePositions[lineIdx++] = currentPos.y;
      linePositions[lineIdx++] = currentPos.z;
      
      linePositions[lineIdx++] = targetPoint.x;
      linePositions[lineIdx++] = targetPoint.y;
      linePositions[lineIdx++] = targetPoint.z;
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
       meshRef.current.instanceColor.needsUpdate = true;
    }

    if (linesRef.current) {
      linesRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      // Fade lines out when clustered
      (linesRef.current.material as THREE.LineBasicMaterial).opacity = factor * 0.4;
    }
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, NUM_POINTS]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial metalness={0.8} roughness={0.2} />
      </instancedMesh>
      
      <lineSegments ref={linesRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#ffffff" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </lineSegments>
      
      {/* Target fixed point glow */}
      <mesh position={targetPoint}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8 - contractionFactor * 0.5} />
      </mesh>
    </group>
  );
}

export function MemoryContraction() {
  const [eps] = useState(0.18);
  const wx = parseFloat((1 - eps).toFixed(2));
  
  // State for UI tracking to avoid heavy lifting in render loop
  const [phase, setPhase] = useState('scattering');
  const [dist, setDist] = useState(1.0);
  
  useEffect(() => {
    const id = setInterval(() => {
      const time = Date.now() / 1000;
      const cycle = (time % 8) / 8;
      
      let newPhase = 'scattering';
      let newDist = 1.0;
      
      if (cycle < 0.2) {
        newPhase = 'scattering';
        newDist = 1.0;
      } else if (cycle < 0.8) {
        newPhase = 'contracting';
        const progress = (cycle - 0.2) / 0.6;
        newDist = 1 - Math.pow(progress, 3) * 0.95;
      } else {
        newPhase = 'fixed';
        newDist = 0.05;
      }
      
      setPhase(newPhase);
      setDist(newDist);
    }, 100);
    return () => clearInterval(id);
  }, []);

  const getStatusColor = () => {
    if (phase === 'fixed') return 'text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] bg-emerald-500/10';
    if (phase === 'contracting') return 'text-cyan-400 border-cyan-500/50 bg-cyan-500/10';
    return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
  };

  return (
    <div className="w-full h-full flex bg-[#08080C] overflow-hidden text-[#E2E8F0]">
      {/* 3D Canvas Background */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [5, 3, 8], fov: 45 }}>
          <color attach="background" args={['#08080C']} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} color="#e0f2fe" />
          <pointLight position={[-5, -5, -5]} intensity={1} color="#a855f7" />
          <Environment preset="city" />
          <React.Suspense fallback={null}>
            <BanachPoints />
          </React.Suspense>
          <OrbitControls enablePan={true} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
        
        {/* Decorative Grid Lines Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{
            backgroundImage: 'linear-gradient(rgba(30, 41, 59, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 41, 59, 0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Foreground UI */}
      <div className="relative z-10 w-full h-full p-8 flex flex-col justify-between pointer-events-none">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold font-mono text-emerald-400 tracking-widest flex items-center gap-3 bg-[#08080C]/80 inline-block px-4 py-2 rounded-lg border border-white/5 backdrop-blur-md">
            07 MEMORY CONTRACTION MAPPING
          </h2>
          <div className="text-sm text-slate-400 font-mono mt-2 bg-[#08080C]/80 inline-block px-4 py-2 rounded-lg border border-white/5 backdrop-blur-md max-w-xl">
            Theorem 2.13 — Strict Contraction of Memory Refinement. Banach Fixed-Point convergence of hierarchical prototype operator <InlineMath math={String.raw`\Phi`} />.
          </div>
        </div>

        {/* Info Panel Right */}
        <div className="self-end w-[450px] space-y-4">
           {/* Status Readout */}
           <div className={`p-4 rounded-xl border backdrop-blur-md transition-all duration-300 font-mono flex items-center justify-between ${getStatusColor()}`}>
             <div className="font-bold tracking-widest uppercase flex items-center gap-2">
               {phase === 'scattering' && 'Noise Injection Phase'}
               {phase === 'contracting' && 'Applying Refinement Operator Φ'}
               {phase === 'fixed' && 'Fixed Point Achieved'}
             </div>
             <div className="text-xs">
                Distance: {dist.toFixed(3)}
             </div>
           </div>

           {/* Math Proof Panel */}
           <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-2xl pointer-events-auto">
             <h3 className="font-mono text-xs text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2 mb-4">
               Banach Fixed-Point Theorem
             </h3>
             <div className="text-center overflow-x-auto text-emerald-300 mb-6 font-bold">
               <BlockMath math={String.raw`\|\Phi(x, y) - \Phi(x_2, y)\|_2 \le (1 - \epsilon_0)\|x_1 - x_2\|_2`} />
             </div>
             
             <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1">w_x = (1 - ε_0)</div>
                  <div className="text-cyan-400 font-bold font-mono text-lg">{wx.toFixed(2)}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1">ε_0 (contraction factor)</div>
                  <div className="text-purple-400 font-bold font-mono text-lg">{eps.toFixed(2)}</div>
                </div>
             </div>

             <h3 className="font-mono text-xs text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2 mb-4">
               Refinement Operator
             </h3>
             <div className="text-center overflow-x-auto text-white mb-4">
               <BlockMath math={String.raw`\Phi(x, y) = w_x x + w_y y`} />
             </div>
             <p className="text-xs text-slate-400 font-mono text-center">
               Points collapse towards a canonical cluster at the fixed point, ensuring bounded long-term memory stability.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}
