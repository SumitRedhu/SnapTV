import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Tv,
  Volume2,
  VolumeX,
  Maximize,
  X,
  Power,
  RotateCcw,
  RotateCw
} from 'lucide-react';
import { playFocusSound, playSelectSound, playBackSound } from '../utils/sound';

interface VirtualTVRemoteHUDProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onSelect: () => void;
  onBack: () => void;
  onHome: () => void;
  onToggleMute?: () => void;
}

export const VirtualTVRemoteHUD: React.FC<VirtualTVRemoteHUDProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelect,
  onBack,
  onHome,
  onToggleMute,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 bg-slate-900/95 border border-slate-700/80 rounded-3xl p-5 shadow-2xl backdrop-blur-xl w-64 select-none animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Remote Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
        <span className="font-mono text-slate-400 font-semibold tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          ATV REMOTE
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          title="Close remote simulator"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* D-Pad Circular Controller */}
      <div className="my-5 flex flex-col items-center">
        <div className="relative w-44 h-44 rounded-full bg-slate-950 border-2 border-slate-800 shadow-inner flex items-center justify-center p-2">
          {/* Up */}
          <button
            onClick={() => {
              playFocusSound();
              onNavigate('up');
            }}
            className="absolute top-1.5 w-12 h-10 flex items-center justify-center text-slate-300 hover:text-white active:bg-indigo-600/30 rounded-t-full transition"
            title="Up"
          >
            <ChevronUp className="w-6 h-6" />
          </button>

          {/* Down */}
          <button
            onClick={() => {
              playFocusSound();
              onNavigate('down');
            }}
            className="absolute bottom-1.5 w-12 h-10 flex items-center justify-center text-slate-300 hover:text-white active:bg-indigo-600/30 rounded-b-full transition"
            title="Down"
          >
            <ChevronDown className="w-6 h-6" />
          </button>

          {/* Left */}
          <button
            onClick={() => {
              playFocusSound();
              onNavigate('left');
            }}
            className="absolute left-1.5 w-10 h-12 flex items-center justify-center text-slate-300 hover:text-white active:bg-indigo-600/30 rounded-l-full transition"
            title="Left"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Right */}
          <button
            onClick={() => {
              playFocusSound();
              onNavigate('right');
            }}
            className="absolute right-1.5 w-10 h-12 flex items-center justify-center text-slate-300 hover:text-white active:bg-indigo-600/30 rounded-r-full transition"
            title="Right"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Center OK Button */}
          <button
            onClick={() => {
              playSelectSound();
              onSelect();
            }}
            className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-indigo-600/40 flex items-center justify-center transition-all"
            title="OK / Select"
          >
            OK
          </button>
        </div>
      </div>

      {/* TV Function Row (Back, Home) */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => {
            playBackSound();
            onBack();
          }}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 transition active:scale-95"
          title="Back (Esc / Backspace)"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={() => {
            playSelectSound();
            onHome();
          }}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 transition active:scale-95"
          title="Home"
        >
          <Tv className="w-4 h-4" />
          <span>Home</span>
        </button>
      </div>

      {/* Bottom utility info */}
      <div className="pt-2 text-[10px] text-slate-500 text-center font-mono">
        Keyboard: Arrow keys + Enter + Esc
      </div>
    </div>
  );
};
