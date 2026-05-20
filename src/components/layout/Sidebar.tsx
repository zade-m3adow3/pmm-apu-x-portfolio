import React, { useState } from 'react';
import { MODULE_NAV } from '../../data/constants';
import type { ModuleId } from '../../types';
import * as Icons from 'lucide-react';

interface SidebarProps {
  activeModule: ModuleId;
  setActiveModule: (id: ModuleId) => void;
  onHoverChange?: (hovered: boolean) => void;
}

export function Sidebar({ activeModule, setActiveModule, onHoverChange }: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleEnter = () => { setIsHovered(true);  onHoverChange?.(true); };
  const handleLeave = () => { setIsHovered(false); onHoverChange?.(false); };

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 bg-[#08080C]/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex flex-col items-center py-8 ${isHovered ? 'w-64' : 'w-20'}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="mb-12 flex items-center justify-center w-full relative">
        <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full w-12 h-12 mx-auto"></div>
        <Icons.Hexagon className="w-8 h-8 text-cyan-400 relative z-10" />
        {isHovered && (
          <span className="ml-3 font-mono font-bold text-white tracking-widest text-lg whitespace-nowrap opacity-100 transition-opacity delay-100">
            APU-X
          </span>
        )}
      </div>

      <nav className="flex-1 w-full flex flex-col gap-4 px-3">
        {MODULE_NAV.map((item: any) => {
          const Icon = Icons[item.icon as keyof typeof Icons] as any;
          const isActive = activeModule === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`
                group flex items-center p-3 rounded-xl transition-all duration-300 relative
                ${isActive ? 'bg-white/10 shadow-[0_0_15px_rgba(0,240,255,0.2)] border border-cyan-500/30' : 'hover:bg-white/5 border border-transparent'}
              `}
              title={isHovered ? '' : item.label}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r-md blur-[1px]"></div>
              )}
              <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-300'}`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              
              {isHovered && (
                <div className="ml-4 flex flex-col items-start whitespace-nowrap overflow-hidden">
                  <span className={`text-sm font-semibold transition-colors ${isActive ? 'text-white' : 'text-slate-300'}`}>
                    {item.shortLabel}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {item.id.toUpperCase()}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-4 w-full text-center">
        {isHovered ? (
           <div className="text-[10px] font-mono text-slate-500 border-t border-white/10 pt-4 w-full">
             PMM v2.4.1 <br/> NEUROMORPHIC
           </div>
        ) : (
          <div className="w-1 h-1 bg-slate-500 rounded-full mx-auto"></div>
        )}
      </div>
    </aside>
  );
}
