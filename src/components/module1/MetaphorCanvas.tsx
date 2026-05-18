import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment, Loader } from '@react-three/drei';
import { NPECloud } from './NPECloud';
import { ECFPlane } from './ECFPlane';
import { DictionaryGrid } from './DictionaryGrid';
import { GIMRing } from './GIMRing';
import { APUXPlatform } from './APUXPlatform';
import * as THREE from 'three';

export function MetaphorCanvas() {
  return (
    <div className="w-full h-full relative bg-slate-950">
      <Canvas
        camera={{ position: [0, 8, 20], fov: 45 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <color attach="background" args={['#020617']} />
        
        {/* Lighting */}
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} color="#00f0ff" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#8b5cf6" />
        <pointLight position={[0, 5, 0]} intensity={0.5} color="#f59e0b" />

        {/* Environment */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Environment preset="city" />

        <Suspense fallback={null}>
          <group position={[0, 0, 0]}>
            <NPECloud />
            <ECFPlane />
            <DictionaryGrid />
            <GIMRing />
            <APUXPlatform />
          </group>
        </Suspense>

        <OrbitControls 
          enablePan={false}
          minDistance={10}
          maxDistance={40}
          maxPolarAngle={Math.PI / 2 + 0.2}
          target={[0, 2, 0]}
        />
      </Canvas>
      <Loader />
      
      {/* Title overlay */}
      <div className="absolute top-8 left-8 pointer-events-none">
        <h2 className="text-2xl font-bold font-mono text-white tracking-widest flex items-center gap-3">
          <span className="text-cyan-400">01</span> COGNITIVE METAPHOR CORE
        </h2>
        <p className="text-sm text-slate-400 font-mono mt-2 max-w-md">
          Real-time interactive architectural visualization of the Neuro-Spectral-Symbolic stack running on APU-X.
        </p>
      </div>
    </div>
  );
}
