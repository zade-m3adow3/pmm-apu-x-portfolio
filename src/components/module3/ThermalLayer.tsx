import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulation } from '../../context/SimulationContext';

export function ThermalLayer({ elevation, isExpanded, isSelected, onSelect }: any) {
  const meshRef = useRef<THREE.Group>(null);
  const { isAttacked, modelType } = useSimulation();

  const targetY = isExpanded ? elevation : 0;
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.1);
    }
  });

  const showShielding = isAttacked && modelType === 'PMM';

  return (
    <group ref={meshRef} onClick={(e) => { e.stopPropagation(); onSelect('thermal'); }}>
      {/* Base thermal plate */}
      <mesh>
        <boxGeometry args={[10, 0.4, 10]} />
        <meshStandardMaterial 
          color={isSelected ? "#10b981" : "#0f172a"} 
          roughness={0.7} 
          metalness={0.8}
        />
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(10.1, 0.5, 10.1)]} />
          <lineBasicMaterial color={isSelected ? "#34d399" : "#334155"} />
        </lineSegments>
      </mesh>

      {/* CNT Pillars */}
      <group position={[0, 0.5, 0]}>
        {Array.from({ length: 16 }).map((_, i) => (
          <mesh key={i} position={[(i % 4 - 1.5) * 2, 0, (Math.floor(i / 4) - 1.5) * 2]}>
            <cylinderGeometry args={[0.1, 0.1, 0.6, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={1} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {/* CHS Shielding active animation */}
      {showShielding && (
        <mesh>
          <cylinderGeometry args={[7, 7, 1.5, 32]} />
          <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}
