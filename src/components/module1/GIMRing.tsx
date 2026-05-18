import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulation } from '../../context/SimulationContext';
import { gimFragmentShader } from './shaders/gim';

// Simple passthrough vertex shader for GIM
const gimVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export function GIMRing() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const laserRef = useRef<THREE.Mesh>(null);
  const { integrityPredicate, isAttacked, modelType } = useSimulation();

  // Create geometry once
  const geometry = useMemo(() => new THREE.TorusGeometry(6, 0.15, 16, 100), []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Slow rotation
      meshRef.current.rotation.x = Math.PI / 2;
      meshRef.current.rotation.z -= delta * 0.2;
    }
    
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      // Smoothly transition the integrity value
      const targetIntegrity = integrityPredicate;
      materialRef.current.uniforms.uIntegrity.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uIntegrity.value,
        targetIntegrity,
        0.1
      );
    }

    // Laser pulse logic
    if (laserRef.current) {
      if (integrityPredicate === 1 && modelType === 'PMM') {
        // Fire laser downwards
        laserRef.current.position.y -= delta * 20;
        laserRef.current.scale.y = 20; // Stretch it
        (laserRef.current.material as THREE.Material).opacity = 0.8;
        
        // Reset if it goes too far down
        if (laserRef.current.position.y < -10) {
            laserRef.current.position.y = 5;
        }
      } else {
        laserRef.current.scale.y = 0.01;
        (laserRef.current.material as THREE.Material).opacity = 0;
        laserRef.current.position.y = 5;
      }
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <primitive object={geometry} attach="geometry" />
        <shaderMaterial
          ref={materialRef}
          transparent
          blending={THREE.AdditiveBlending}
          vertexShader={gimVertexShader}
          fragmentShader={gimFragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uIntegrity: { value: 0 }
          }}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Rollback Laser Pulse */}
      <mesh ref={laserRef} position={[0, 5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}
