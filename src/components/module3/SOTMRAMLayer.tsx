import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function SOTMRAMLayer({ elevation, isExpanded, isSelected, onSelect }: any) {
  const meshRef = useRef<THREE.Group>(null);
  const targetY = isExpanded ? elevation : 0;
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.1);
    }
  });

  return (
    <group ref={meshRef} onClick={(e) => { e.stopPropagation(); onSelect('sot-mram'); }}>
      {/* Graded Buffer Plane */}
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[10, 0.2, 10]} />
        <meshStandardMaterial 
          color={isSelected ? "#f59e0b" : "#b45309"} 
          roughness={0.5} 
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Memory Arrays */}
      <group>
        {Array.from({ length: 4 }).map((_, x) => (
          Array.from({ length: 4 }).map((_, z) => (
            <mesh key={`${x}-${z}`} position={[(x - 1.5) * 2.2, 0.2, (z - 1.5) * 2.2]}>
              <boxGeometry args={[1.8, 0.4, 1.8]} />
              <meshStandardMaterial color={isSelected ? "#fbbf24" : "#451a03"} metalness={0.8} roughness={0.2} />
            </mesh>
          ))
        ))}
      </group>
    </group>
  );
}
