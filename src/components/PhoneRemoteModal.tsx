import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Smartphone, QrCode, Tv, Copy, Check, Sparkles, X, ExternalLink } from 'lucide-react';
import { playFocusSound, playSelectSound, playBackSound } from '../utils/sound';

interface PhoneRemoteModalProps {
  pairingCode: string;
  onClose: () => void;
  onOpenSimulator: () => void;
}

export const PhoneRemoteModal: React.FC<PhoneRemoteModalProps> = ({
  pairingCode,
  onClose,
  onOpenSimulator,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Compute full companion URL
  const companionUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?pair=${pairingCode}`
    : `https://app.local/?pair=${pairingCode}`;

  useEffect(() => {
    if (companionUrl) {
      QRCode.toDataURL(companionUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#030712',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation failed:', err));
    }
  }, [companionUrl]);

  const handleCopy = () => {
    playSelectSound();
    navigator.clipboard.writeText(companionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative">
        <button
          onClick={() => {
            playBackSound();
            onClose();
          }}
          className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 text-xs text-indigo-400 font-mono uppercase tracking-wider mb-2">
          <Smartphone className="w-4 h-4" />
          <span>Android TV Couch Companion</span>
        </div>

        <h2 className="text-2xl font-display font-bold text-white">
          Control TV & Cast Web Links from Your Phone
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          Typing URLs with a TV remote is painful. Use your phone to paste any web link, browse streams, and navigate with a smooth virtual D-pad.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* QR Code Container */}
          <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-xl">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Scan with phone"
                className="w-48 h-48 rounded-lg"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-slate-100 text-slate-400">
                <QrCode className="w-12 h-12 animate-pulse" />
              </div>
            )}
            <span className="text-slate-800 text-xs font-semibold mt-2">
              Scan with your phone camera
            </span>
          </div>

          {/* Pairing Code & Direct Instructions */}
          <div className="space-y-4">
            <div>
              <span className="text-slate-400 text-xs block mb-1">Your TV Connect Code</span>
              <div className="font-mono text-3xl font-extrabold text-white tracking-widest bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span>{pairingCode}</span>
                <span className="text-xs font-normal text-emerald-400 font-sans flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Ready
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied Companion URL!' : 'Copy Direct Companion Link'}</span>
              </button>

              <button
                onClick={() => {
                  playSelectSound();
                  onOpenSimulator();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Test Phone Remote in This Window</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feature bullets */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-3 gap-3 text-center text-[11px] text-slate-400">
          <div>
            <span className="font-semibold text-white block">No App Install</span>
            <span>Runs directly in mobile browser</span>
          </div>
          <div>
            <span className="font-semibold text-white block">Instant Link Beam</span>
            <span>Send web URLs in 1 tap</span>
          </div>
          <div>
            <span className="font-semibold text-white block">Zero Config</span>
            <span>Pairs instantly via code</span>
          </div>
        </div>
      </div>
    </div>
  );
};
