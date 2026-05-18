import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulation } from '../../context/SimulationContext';

export function ECFPlane() {
  const groupRef = useRef<THREE.Group>(null);
  const lineMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const { modelType, isAttacked } = useSimulation();

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Rotate the plane to simulate spectral projections
      const rotationSpeed = (isAttacked && modelType !== 'PMM') ? 0.1 : 0.5; // Slow down on collapse
      groupRef.current.rotation.y += delta * rotationSpeed;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
    if (lineMaterialRef.current) {
      // Pulse opacity
      lineMaterialRef.current.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      {/* Main Coordinate Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10, 20, 20]} />
        <meshBasicMaterial 
          color="#8b5cf6" 
          wireframe 
          transparent 
          opacity={0.3} 
          side={THREE.DoubleSide} 
        />
      </mesh>
      
      {/* Glowing boundary */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
         <planeGeometry args={[10.2, 10.2, 1, 1]} />
         <meshBasicMaterial
           color="#a78bfa"
           wireframe
           transparent
           opacity={0.5}
           side={THREE.DoubleSide}
         />
      </mesh>

      {/* Projected principal component lines (W*) */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(8, 8, 4, 4)]} />
        <lineBasicMaterial 
          ref={lineMaterialRef}
          color="#c4b5fd" 
          transparent 
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}
