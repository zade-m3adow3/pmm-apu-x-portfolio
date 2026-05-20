import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';
import { InlineMath, BlockMath } from 'react-katex';

useGLTF.preload('/Coaxial.glb');

// We don't know exact node names, so we heuristically identify them
// Inner = smallest radius, Middle = medium, Outer = largest
function analyzeCoaxialLayers(scene: THREE.Group) {
  const meshes: THREE.Mesh[] = [];
  scene.traverse(node => {
    if ((node as THREE.Mesh).isMesh) meshes.push(node as THREE.Mesh);
  });
  
  meshes.forEach(m => {
    m.geometry.computeBoundingBox();
  });
  
  // Sort by bounding box max X (radius roughly)
  meshes.sort((a, b) => {
    const rA = a.geometry.boundingBox!.max.x;
    const rB = b.geometry.boundingBox!.max.x;
    return rA - rB;
  });
  
  return {
    inner: meshes[0],
    middle: meshes[Math.floor(meshes.length / 2)],
    outer: meshes[meshes.length - 1],
  };
}

// Particle stream for inner core
function DataStream({ active, length = 10 }: { active: boolean, length?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const { positions, phases } = useMemo(() => {
    const count = 500;
    const pos = new Float32Array(count * 3);
    const pha = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // distribute along Z axis
      pos[i * 3 + 2] = (Math.random() - 0.5) * length;
      pha[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, phases: pha, count };
  }, [length]);

  useFrame(({ clock }) => {
    if (!pointsRef.current || !active) return;
    const t = clock.elapsedTime;
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length / 3; i++) {
      const z = pos[i * 3 + 2];
      const p = phases[i];
      // Rapid sine wave around Z axis
      pos[i * 3] = Math.sin(z * 10 - t * 20 + p) * 0.1;
      pos[i * 3 + 1] = Math.cos(z * 10 - t * 20 + p) * 0.1;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#00f0ff" size={0.05} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

// Electric field lines for middle dielectric
function ElectricFieldLines({ active, radius }: { active: boolean, radius: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (groupRef.current && active) {
      groupRef.current.rotation.z = clock.elapsedTime * 0.5;
    }
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
           <torusGeometry args={[radius, 0.02, 8, 32, Math.PI]} />
           <meshBasicMaterial color="#a855f7" transparent opacity={0.4} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function CoaxialModel({ hoveredLayer, setHoveredLayer }: { hoveredLayer: 'inner' | 'middle' | 'outer' | null, setHoveredLayer: (l: any) => void }) {
  const { scene } = useGLTF('/Coaxial.glb');
  const groupRef = useRef<THREE.Group>(null);
  
  const { inner, middle, outer, clonedScene } = useMemo(() => {
    const cloned = scene.clone(true);
    const layers = analyzeCoaxialLayers(cloned);
    
    // Ensure materials are unique and transparent ready
    [layers.inner, layers.middle, layers.outer].forEach((mesh) => {
      if (mesh) {
         mesh.material = (mesh.material as THREE.Material).clone();
         mesh.material.transparent = true;
      }
    });
    
    return { ...layers, clonedScene: cloned };
  }, [scene]);

  // Animate opacity based on hover state
  useFrame(() => {
    if (outer && outer.material) {
      const mat = outer.material as THREE.MeshStandardMaterial;
      const targetOpacity = hoveredLayer === 'outer' ? 0.2 : 1.0;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.1);
    }
    
    if (groupRef.current) {
      // Slight idle rotation
      groupRef.current.rotation.y += 0.002;
    }
  });
  
  // Calculate approximate bounds for effects
  const innerRadius = inner ? inner.geometry.boundingBox!.max.x : 0.5;
  const middleRadius = middle ? middle.geometry.boundingBox!.max.x : 1.5;
  const length = outer ? outer.geometry.boundingBox!.max.z - outer.geometry.boundingBox!.min.z : 10;

  return (
    <group ref={groupRef} scale={[2, 2, 2]} rotation={[Math.PI / 6, -Math.PI / 4, 0]}>
      {/* Invisible hover catchers since the complex GLB might have weird bounding geometry */}
      <mesh 
        position={[0,0,0]} 
        onPointerOver={(e) => { e.stopPropagation(); setHoveredLayer('inner'); }}
        onPointerOut={() => setHoveredLayer(null)}
        visible={false}
      >
        <cylinderGeometry args={[innerRadius * 1.5, innerRadius * 1.5, length, 16]} />
        <meshBasicMaterial />
      </mesh>
      
      <mesh 
        position={[0,0,0]} 
        onPointerOver={(e) => { e.stopPropagation(); setHoveredLayer('outer'); }}
        onPointerOut={() => setHoveredLayer(null)}
        visible={false}
      >
        <cylinderGeometry args={[middleRadius * 1.5, middleRadius * 1.5, length, 32]} />
        <meshBasicMaterial />
      </mesh>

      <primitive object={clonedScene} />
      
      {/* 3D Label */}
      <Text
        position={[0, middleRadius + 1, 0]}
        rotation={[0, Math.PI/4, 0]}
        fontSize={0.4}
        color="#c084fc"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        n × E = 0
      </Text>

      {/* Dynamic Effects */}
      <DataStream active={hoveredLayer === 'inner'} length={length} />
      <ElectricFieldLines active={hoveredLayer === 'outer'} radius={middleRadius * 0.8} />
    </group>
  );
}

export function CoaxialDissector() {
  const [hoveredLayer, setHoveredLayer] = useState<'inner' | 'middle' | 'outer' | null>(null);

  return (
    <div className="w-full h-full flex bg-[#08080C] overflow-hidden">
      {/* Left Panel */}
      <div className="w-[400px] flex-shrink-0 border-r border-white/5 bg-[#08080C]/80 backdrop-blur-md p-8 flex flex-col z-10 relative">
        <h2 className="text-2xl font-bold font-mono text-purple-400 tracking-widest mb-2">
          COAXIAL INTERCONNECT DISSECTOR
        </h2>
        <p className="text-sm text-slate-400 font-mono mb-8">
          Interactive proof of perfect electromagnetic containment in dense 3D neuromorphic matrices.
        </p>

        <div className="flex-1 space-y-6">
          <div 
            className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer ${hoveredLayer === 'outer' ? 'bg-purple-500/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
            onMouseEnter={() => setHoveredLayer('outer')}
            onMouseLeave={() => setHoveredLayer(null)}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 rounded-full border-2 border-slate-400 flex items-center justify-center">
                 <div className="w-2 h-2 rounded-full border border-slate-400"></div>
              </div>
              <h3 className="font-mono text-sm font-bold text-white tracking-widest">Outer Graphene Shield</h3>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Hover to adjust opacity to 0.2. Reveals internal trapped electric fields ensuring zero crosstalk.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-white/5 bg-white/5 opacity-70">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center">
                 <div className="w-1 h-1 rounded-full bg-slate-500"></div>
              </div>
              <h3 className="font-mono text-sm font-bold text-slate-300 tracking-widest">Middle h-BN Dielectric</h3>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Hexagonal Boron Nitride jacket. Acts as an ideal dielectric boundary.
            </p>
          </div>

          <div 
            className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer ${hoveredLayer === 'inner' ? 'bg-cyan-500/20 border-cyan-500 shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
            onMouseEnter={() => setHoveredLayer('inner')}
            onMouseLeave={() => setHoveredLayer(null)}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 ml-1"></div>
              <h3 className="font-mono text-sm font-bold text-white tracking-widest ml-1">Inner Copper Core</h3>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Hover to trigger active data transit. Visualizes high-frequency signal propagation.
            </p>
          </div>
        </div>

        <div className="mt-auto bg-slate-900/80 p-5 rounded-xl border border-white/10 shadow-inner">
          <div className="text-center text-purple-300 mb-2">
            <BlockMath math={String.raw`n \times E = 0`} />
          </div>
          <div className="text-[10px] text-slate-400 font-mono text-center uppercase tracking-widest">
            Perfect Faraday Invariant
          </div>
        </div>
        
        {/* Decorative background grid in panel */}
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{
            backgroundImage: 'linear-gradient(rgba(168, 85, 247, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.5) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
        }}></div>
      </div>

      {/* Right 3D Canvas */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [5, 5, 10], fov: 45 }}>
          <color attach="background" args={['#08080C']} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
          <pointLight position={[-5, -5, -5]} intensity={1} color="#a855f7" />
          <Environment preset="city" />
          
          <React.Suspense fallback={null}>
            <CoaxialModel hoveredLayer={hoveredLayer} setHoveredLayer={setHoveredLayer} />
          </React.Suspense>
          
          <OrbitControls enablePan={true} enableZoom={true} />
        </Canvas>
      </div>
    </div>
  );
}
