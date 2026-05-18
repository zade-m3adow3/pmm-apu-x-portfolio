import React from 'react';
import * as THREE from 'three';

export function APUXPlatform() {
  return (
    <group position={[0, -4, 0]}>
      {/* Base Layer */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[16, 1, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
        <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(16.1, 1.1, 16.1)]} />
            <lineBasicMaterial color="#334155" />
        </lineSegments>
      </mesh>
      
      {/* Middle Layer (Crossbar Matrix Representation) */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[14, 0.5, 14]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
         <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(14.1, 0.6, 14.1)]} />
            <lineBasicMaterial color="#0ea5e9" transparent opacity={0.3} />
        </lineSegments>
      </mesh>

      {/* Top Layer (Interconnects) */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[12, 0.2, 12]} />
        <meshStandardMaterial color="#00f0ff" transparent opacity={0.1} emissive="#00f0ff" emissiveIntensity={0.2} />
      </mesh>
      
      {/* Pillar supports connecting to ECF/NPE */}
      <group position={[0, 1.5, 0]}>
        {[-4, 4].map(x => (
          [-4, 4].map(z => (
            <mesh key={`${x}-${z}`} position={[x, 0, z]}>
              <cylinderGeometry args={[0.2, 0.4, 3, 8]} />
              <meshStandardMaterial color="#334155" metalness={0.8} />
            </mesh>
          ))
        ))}
      </group>
    </group>
  );
}
