import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Bounds } from '@react-three/drei';
import { ThermalLayer } from './ThermalLayer';
import { SOTMRAMLayer } from './SOTMRAMLayer';
import { M3DViasLayer } from './M3DViasLayer';
import { CrossbarLayer } from './CrossbarLayer';
import { LayerTooltip } from './LayerTooltip';
import { Maximize2, Minimize2 } from 'lucide-react';

export function SubstrateExplorer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedLayer(id === selectedLayer ? null : id);
  };

  return (
    <div className="w-full h-full relative bg-[#08080C] flex">
      
      {/* Overlay UI */}
      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        <h2 className="text-2xl font-bold font-mono text-white tracking-widest flex items-center gap-3">
          <span className="text-purple-400">03</span> APU-X NEUROMORPHIC SUBSTRATE
        </h2>
        <p className="text-sm text-slate-400 font-mono mt-2 max-w-md">
          Interactive exploded-view diagram of the physical hardware co-designed for the PMM.
        </p>
      </div>

      <div className="absolute bottom-8 left-8 z-10">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors font-mono text-sm shadow-xl"
        >
          {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          {isExpanded ? 'COLLAPSE STACK' : 'EXPAND STACK'}
        </button>
      </div>

      <LayerTooltip layerId={selectedLayer} onClose={() => setSelectedLayer(null)} />

      {/* 3D Canvas */}
      <div className="flex-1 w-full h-full">
        <Canvas camera={{ position: [15, 10, 15], fov: 40 }}>
          <color attach="background" args={['#08080C']} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />
          <Environment preset="city" />

          <Suspense fallback={null}>
            <Bounds fit margin={1.2}>
              <group position={[0, -2, 0]}>
                <ThermalLayer 
                  elevation={0} 
                  isExpanded={isExpanded} 
                  isSelected={selectedLayer === 'thermal'} 
                  onSelect={handleSelect} 
                />
                <SOTMRAMLayer 
                  elevation={2} 
                  isExpanded={isExpanded} 
                  isSelected={selectedLayer === 'sot-mram'} 
                  onSelect={handleSelect} 
                />
                <M3DViasLayer 
                  elevation={4} 
                  isExpanded={isExpanded} 
                  isSelected={selectedLayer === 'm3d-ilvs'} 
                  onSelect={handleSelect} 
                />
                <CrossbarLayer 
                  elevation={6} 
                  isExpanded={isExpanded} 
                  isSelected={selectedLayer === 'crossbar'} 
                  onSelect={handleSelect} 
                />
              </group>
            </Bounds>
          </Suspense>

          <OrbitControls makeDefault minPolarAngle={Math.PI/6} maxPolarAngle={Math.PI/2 - 0.1} />
        </Canvas>
      </div>
    </div>
  );
}
