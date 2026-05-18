import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function CrossbarLayer({ elevation, isExpanded, isSelected, onSelect }: any) {
  const meshRef = useRef<THREE.Group>(null);
  const targetY = isExpanded ? elevation : 0;
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.1);
      
      // Add slight pulsing if selected
      if (isSelected) {
          const s = 1.0 + Math.sin(state.clock.elapsedTime * 4) * 0.02;
          meshRef.current.scale.set(s, s, s);
      } else {
          meshRef.current.scale.set(1, 1, 1);
      }
    }
  });

  return (
    <group ref={meshRef} onClick={(e) => { e.stopPropagation(); onSelect('crossbar'); }}>
      {/* Main Crossbar Matrix */}
      <mesh>
        <boxGeometry args={[10, 0.6, 10]} />
        <meshStandardMaterial 
          color={isSelected ? "#00f0ff" : "#082f49"} 
          metalness={0.8} 
          roughness={0.3}
          emissive={isSelected ? "#00f0ff" : "#000000"}
          emissiveIntensity={0.2}
        />
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(10.1, 0.7, 10.1)]} />
          <lineBasicMaterial color={isSelected ? "#67e8f9" : "#0ea5e9"} transparent opacity={0.5} />
        </lineSegments>
      </mesh>
      
      {/* Grid overlay */}
      <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9.5, 9.5, 20, 20]} />
        <meshBasicMaterial color="#00f0ff" wireframe transparent opacity={isSelected ? 0.6 : 0.1} />
      </mesh>
    </group>
  );
}
