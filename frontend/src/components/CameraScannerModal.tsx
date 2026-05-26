"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function CameraScannerModal({
  onClose,
  onScan,
}: {
  onClose: () => void;
  onScan: (code: string) => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scannerId = "meestock-camera-scanner-view";
    const html5Qrcode = new Html5Qrcode(scannerId);
    scannerRef.current = html5Qrcode;

    setLoading(true);
    html5Qrcode
      .start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size * 0.6 };
          },
        },
        (decodedText) => {
          // Success scan synthesized chime
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          } catch (e) {
            console.error("Audio chime error:", e);
          }

          onScan(decodedText);
          onClose();
        },
        () => {}
      )
      .then(() => {
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to start camera scanner:", err);
        setError("ไม่สามารถเปิดใช้งานกล้องถ่ายภาพได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้อง");
        setLoading(false);
      });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((e) => console.error("Error stopping scanner:", e));
      }
    };
  }, [onClose, onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />

      {/* Modal Box */}
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 z-10">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
              กล้องสแกนบาร์โค้ด / QR Code
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">ถือกล้องนิ่งๆ ส่องช่องสแกนให้ตรงกับบาร์โค้ด</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative aspect-video w-full rounded-2xl bg-black border border-slate-200 overflow-hidden flex items-center justify-center">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white bg-black z-10">
              <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-[10px] text-slate-400">กำลังเริ่มต้นการทำงานของกล้อง...</p>
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center gap-3 text-slate-400 z-10">
              <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs font-semibold text-rose-600">{error}</p>
            </div>
          ) : (
            <>
              {/* Main Video Stream Container */}
              <div id="meestock-camera-scanner-view" className="w-full h-full object-cover" />

              {/* Viewfinder Overlays */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-64 h-36 border border-white/20 rounded-xl overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                  {/* Glowing Laser Scanline */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_#6366f1] animate-[scan_2s_infinite_linear]" />
                  
                  {/* Viewfinder bracket corners */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-500 rounded-tl" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-500 rounded-tr" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-500 rounded-bl" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-500 rounded-br" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer"
        >
          ยกเลิกและปิดหน้าต่าง
        </button>
      </div>

      <style jsx global>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(144px);
          }
          100% {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
