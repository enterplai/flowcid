'use client';

import { useEffect, useRef } from 'react';

export default function QRCodeDisplay({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function renderQR() {
      const QRCode = (await import('qrcode')).default;
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, url, {
          width: 256,
          margin: 2,
          color: { dark: '#1e293b', light: '#ffffff' },
        });
      }
    }
    renderQR();
  }, [url]);

  return (
    <div className="p-4 bg-white border-2 border-slate-200 rounded-xl inline-block">
      <canvas ref={canvasRef} />
    </div>
  );
}
