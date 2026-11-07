import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Tv, Download, X, Check, Smartphone, Monitor } from 'lucide-react';
import { playSelectSound } from '../utils/sound';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isTVBrowser, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already running standalone as an installed app or dismissed
  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-indigo-950/70 border-b border-indigo-900/60 px-6 py-2.5 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
            <Tv className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-slate-300">
            <strong className="text-white font-semibold mr-1">
              {isTVBrowser ? 'Run as Native Android TV App' : 'Install SnapTV'}
            </strong>
            — Experience borderless 10-foot TV mode without browser bars or URL inputs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isInstallable ? (
            <button
              onClick={() => {
                playSelectSound();
                install();
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-sm transition tv-btn-focus"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install Native App</span>
            </button>
          ) : (
            <button
              onClick={() => {
                playSelectSound();
                setShowGuideModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition tv-btn-focus"
            >
              <Monitor className="w-3.5 h-3.5 text-indigo-400" />
              <span>TV Install Guide</span>
            </button>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Android TV & PWA Installation Modal Guide */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono uppercase tracking-wider mb-2">
              <Tv className="w-4 h-4" />
              <span>Native Standalone Installation</span>
            </div>

            <h3 className="text-xl font-display font-bold text-white mb-2">
              How to Install as an App on Android TV
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              You can run SnapTV as a borderless full-screen application on your TV launcher:
            </p>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-semibold text-white block mb-1">
                  1. On Android TV / Google TV / Fire TV Browser:
                </span>
                <p className="text-slate-400">
                  Open browser menu (the 3 dots icon) and select <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>.
                  SnapTV will appear directly in your TV apps row alongside Netflix and YouTube!
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-semibold text-white block mb-1">
                  2. On Desktop / Chrome / Edge / Chromebook:
                </span>
                <p className="text-slate-400">
                  Click the <strong>Install icon</strong> in your browser address bar (top right) to launch in dedicated standalone window mode.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-semibold text-white block mb-1">
                  3. PWA Builder / APK Sideloading:
                </span>
                <p className="text-slate-400">
                  Because this app implements full Web App Manifest standards with 10-foot landscape orientation, it can be wrapped into a native Android TV APK via Google's PWABuilder with 1 click.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
