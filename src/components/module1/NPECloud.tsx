import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { npeVertexShader, npeFragmentShader } from './shaders/npe';
import { useSimulation } from '../../context/SimulationContext';

export function NPECloud() {
  const { modelType, isAttacked } = useSimulation();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const particleCount = 2000;

  // Generate particle positions within a sphere
  const [positions, randoms] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const rand = new Float32Array(particleCount);
    const radius = 2.5;

    for (let i = 0; i < particleCount; i++) {
      // Spherical distribution
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * Math.cbrt(Math.random()); // uniform density

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      rand[i] = Math.random();
    }
    return [pos, rand];
  }, [particleCount]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      // Faster pulse under attack
      materialRef.current.uniforms.uPulseSpeed.value = isAttacked ? 5.0 : 1.5;
      
      // If SOTA and attacked, simulate collapse by modifying color or behavior (simplified here via color dimming)
      if (modelType !== 'PMM' && isAttacked) {
         materialRef.current.uniforms.uColor.value.lerp(new THREE.Color('#475569'), 0.05); // Dim to grey
      } else {
         materialRef.current.uniforms.uColor.value.lerp(new THREE.Color('#00f0ff'), 0.1); // Cyan
      }
    }
  });

  return (
    <points position={[0, 2, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aRandomMultiplier"
          args={[randoms, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={npeVertexShader}
        fragmentShader={npeFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uPulseSpeed: { value: 1.5 },
          uColor: { value: new THREE.Color('#00f0ff') }
        }}
      />
    </points>
  );
}
