import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function DictionaryGrid() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Create a 5x5x5 grid of small cubes
  const gridSize = 5;
  const count = gridSize * gridSize * gridSize;
  const spacing = 1.2;

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useMemo(() => {
    if (!meshRef.current) return;
    let i = 0;
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          dummy.position.set(
            (x - gridSize / 2) * spacing,
            (y - gridSize / 2) * spacing,
            (z - gridSize / 2) * spacing
          );
          // Add some organic jitter
          dummy.position.x += (Math.random() - 0.5) * 0.2;
          dummy.position.y += (Math.random() - 0.5) * 0.2;
          dummy.position.z += (Math.random() - 0.5) * 0.2;
          
          dummy.scale.setScalar(0.2 + Math.random() * 0.2);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i++, dummy.matrix);
        }
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  useFrame((state, delta) => {
    if (meshRef.current) {
        // Slow constant rotation
        meshRef.current.rotation.y += delta * 0.05;
        meshRef.current.rotation.x += delta * 0.02;
    }
  });

  return (
    <group position={[8, 2, -4]}> {/* Positioned to the side/back */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial 
          color="#0ea5e9" // Sky blue
          transparent 
          opacity={0.6}
          roughness={0.1}
          transmission={0.9}
          thickness={0.5}
          wireframe
        />
      </instancedMesh>
    </group>
  );
}
