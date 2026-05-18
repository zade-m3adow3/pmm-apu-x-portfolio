import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { ControlPanel } from './components/layout/ControlPanel';
import { StatusBar } from './components/layout/StatusBar';
import { SimulationProvider } from './context/SimulationContext';
import type { ModuleId } from './types';
import { AnimatePresence, motion } from 'framer-motion';

// Imports
import { MetaphorCanvas } from './components/module1/MetaphorCanvas';
import { SandboxDashboard } from './components/module2/SandboxDashboard';
import { SubstrateExplorer } from './components/module3/SubstrateExplorer';
import { ProofsLedger } from './components/module4/ProofsLedger';

function AppContent() {
  const [activeModule, setActiveModule] = useState<ModuleId>('metaphor');

  const renderModule = () => {
    switch (activeModule) {
      case 'metaphor': return <MetaphorCanvas key="metaphor" />;
      case 'sandbox': return <SandboxDashboard key="sandbox" />;
      case 'substrate': return <SubstrateExplorer key="substrate" />;
      case 'proofs': return <ProofsLedger key="proofs" />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-200">
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
      
      {/* Main Content Area */}
      <main className="flex-1 relative ml-20 h-full pb-10"> {/* pb-10 for status bar */}
        <ControlPanel />
        
        {/* Background Grid */}
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none z-0"></div>
        
        {/* Module Container with Framer Motion transitions */}
        <div className="relative w-full h-full z-10 pt-6 px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="w-full h-full rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-sm overflow-hidden relative shadow-2xl"
            >
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <StatusBar />
    </div>
  );
}

export default function App() {
  return (
    <SimulationProvider>
      <AppContent />
    </SimulationProvider>
  );
}
