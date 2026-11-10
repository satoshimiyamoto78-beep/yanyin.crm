"use client";

import { Flashlight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

/**
 * Table QR scanner for the waiter app. Uses the phone camera and the
 * browser's BarcodeDetector when available; table QR codes carry `?table=N`.
 * Where the camera is not available (desktop, demo frame) it shows the same
 * scanning screen and lets you pick a table, so the flow can be tried.
 */
export function Scanner({ tables, onClose, onTable }: { tables: number[]; onClose: () => void; onTable: (no: number) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<"starting" | "on" | "off">("starting");
  const [found, setFound] = useState<number | null>(null);
  const onTableRef = useRef(onTable);
  useEffect(() => {
    onTableRef.current = onTable;
  }, [onTable]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const finish = (no: number) => {
      if (stopped) return;
      stopped = true;
      haptic("success");
      setFound(no);
      setTimeout(() => onTableRef.current(no), 650);
    };
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        setCamera("on");
        const Ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
        if (!Ctor) return;
        const detector = new Ctor({ formats: ["qr_code"] });
        const scan = async () => {
          if (stopped || !video.current) return;
          const codes = await detector.detect(video.current).catch(() => []);
          const hit = codes.map((c) => /table=(\d+)/.exec(c.rawValue)?.[1]).find(Boolean);
          if (hit) finish(Number(hit));
          else raf = requestAnimationFrame(scan);
        };
        raf = requestAnimationFrame(scan);
      } catch {
        setCamera("off");
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  return (
    <div className="animate-fade fixed inset-0 z-[60] flex flex-col bg-[#05070c] text-white" role="dialog" aria-label="Scan table QR">
      <video ref={video} muted playsInline className={`absolute inset-0 h-full w-full object-cover ${camera === "on" ? "opacity-100" : "opacity-0"}`} />
      <div className="relative flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))]">
        <button onClick={onClose} aria-label="Close" className="press grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur-md">
          <X size={20} strokeWidth={2} />
        </button>
        <p className="text-[16px] font-semibold">Scan table QR</p>
        <button aria-label="Torch" className="press grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur-md">
          <Flashlight size={19} strokeWidth={2} />
        </button>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center">
        {/* The frame: four corners, a sweeping line, the rest dimmed. */}
        <div className="relative size-[250px]">
          <div className="absolute inset-0 rounded-[28px] shadow-[0_0_0_2000px_rgba(5,7,12,0.55)]" />
          {[
            "top-0 left-0 border-t-4 border-l-4 rounded-tl-[28px]",
            "top-0 right-0 border-t-4 border-r-4 rounded-tr-[28px]",
            "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-[28px]",
            "bottom-0 right-0 border-b-4 border-r-4 rounded-br-[28px]",
          ].map((c) => (
            <span key={c} className={`absolute size-12 ${found ? "border-[#22c55e]" : "border-white"} transition-colors ${c}`} />
          ))}
          {!found && <span className="scan-line absolute inset-x-4 h-0.5 rounded-full bg-[linear-gradient(90deg,transparent,#8fb2ff,transparent)]" />}
          {found && (
            <span className="animate-pop absolute inset-0 grid place-items-center">
              <span className="rounded-full bg-[#22c55e] px-4 py-2 text-[16px] font-semibold">Table {found}</span>
            </span>
          )}
        </div>
        <p className="mt-6 max-w-[260px] text-center text-[14px] text-white/70">
          {camera === "off" ? "Camera is off here. Pick the table to try the flow." : "Point at the QR code on the table"}
        </p>
      </div>

      <div className="relative px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        <p className="mb-2 text-[12px] font-semibold tracking-[0.06em] text-white/50 uppercase">Or pick a table</p>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {tables.map((no) => (
            <button
              key={no}
              onClick={() => {
                haptic("success");
                setFound(no);
                setTimeout(() => onTable(no), 450);
              }}
              className="press grid h-12 min-w-12 shrink-0 place-items-center rounded-full bg-white/12 px-3 text-[16px] font-semibold backdrop-blur-md tabular-nums"
            >
              {no}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
