import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function M3DViasLayer({ elevation, isExpanded, isSelected, onSelect }: any) {
  const meshRef = useRef<THREE.Group>(null);
  const targetY = isExpanded ? elevation : 0;
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.1);
    }
  });

  return (
    <group ref={meshRef} onClick={(e) => { e.stopPropagation(); onSelect('m3d-ilvs'); }}>
      {/* Vias (Interconnect Pillars) */}
      <group>
        {Array.from({ length: 64 }).map((_, i) => (
          <mesh key={i} position={[(i % 8 - 3.5) * 1.1, 0, (Math.floor(i / 8) - 3.5) * 1.1]}>
            <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
            <meshStandardMaterial color={isSelected ? "#a78bfa" : "#4c1d95"} metalness={0.9} roughness={0.1} emissive={isSelected ? "#8b5cf6" : "#000000"} emissiveIntensity={0.5} />
          </mesh>
        ))}
      </group>
      
      {/* Invisible interaction plane to make clicking easier */}
      <mesh visible={false}>
          <boxGeometry args={[10, 1.2, 10]} />
      </mesh>
    </group>
  );
}
