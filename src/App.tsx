import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { ControlPanel } from './components/layout/ControlPanel';
import { StatusBar } from './components/layout/StatusBar';
import { SimulationProvider } from './context/SimulationContext';
import type { ModuleId } from './types';
import { AnimatePresence, motion } from 'framer-motion';

// Module imports
import { MetaphorCanvas } from './components/module1/MetaphorCanvas';
import { SandboxDashboard } from './components/module2/SandboxDashboard';
import { SubstrateExplorer } from './components/module3/SubstrateExplorer';
import { ProofsLedger } from './components/module4/ProofsLedger';
import { StiefelTracker } from './components/module5/StiefelTracker';
import { ThermalDASM } from './components/module6/ThermalDASM';
import { MemoryContraction } from './components/module7/MemoryContraction';
import { HeroPanel } from './components/module_hero/HeroPanel';
import { CoaxialDissector } from './components/module_coaxial/CoaxialDissector';
import { ErrataLedger } from './components/module_errata/ErrataLedger';

// Modules that use the SIMULATION_CTRL panel (it renders INSIDE their container)
const CONTROL_PANEL_MODULES: ModuleId[] = ['metaphor', 'sandbox', 'substrate', 'proofs'];

function AppContent() {
  const [activeModule, setActiveModule] = useState<ModuleId>('hero');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const showControlPanel = CONTROL_PANEL_MODULES.includes(activeModule);

  const renderModule = () => {
    switch (activeModule) {
      case 'metaphor':    return <MetaphorCanvas key="metaphor" />;
      case 'sandbox':     return <SandboxDashboard key="sandbox" />;
      case 'substrate':   return <SubstrateExplorer key="substrate" />;
      case 'proofs':      return <ProofsLedger key="proofs" />;
      case 'stiefel':     return <StiefelTracker key="stiefel" />;
      case 'thermal':     return <ThermalDASM key="thermal" />;
      case 'contraction': return <MemoryContraction key="contraction" />;
      case 'hero':        return <HeroPanel key="hero" />;
      case 'coaxial':     return <CoaxialDissector key="coaxial" />;
      case 'errata':      return <ErrataLedger key="errata" />;
      default:            return null;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#08080C] text-slate-200">
      {/* Sidebar — fixed, but we track its expanded state to shift main content */}
      <Sidebar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        onHoverChange={setSidebarExpanded}
      />

      {/* Main content column — shifts right when sidebar expands to prevent overlap */}
      <main
        className="flex flex-col h-full overflow-hidden transition-all duration-300 flex-1 min-w-0"
        style={{ marginLeft: sidebarExpanded ? '16rem' : '5rem' }}
      >
        {/* Background decorative grid — behind everything */}
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none z-0" />

        {/* Module area — flex-1 so it fills all space above the StatusBar */}
        <div className="flex-1 min-h-0 relative z-10 p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              // relative so ControlPanel (absolute) is scoped to this container
              className="w-full h-full rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-sm overflow-hidden relative shadow-2xl"
            >
              {/* ControlPanel is absolute inside this container — no viewport overlay */}
              {showControlPanel && <ControlPanel />}
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* StatusBar flows inline at the bottom — never overlaps module content */}
        <StatusBar />
      </main>
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
