'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onError, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const startScanning = async () => {
      try {
        const scanner = new Html5Qrcode('barcode-scanner');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' }, // Use back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Successfully scanned
            onScan(decodedText);
            stopScanning();
          },
          (errorMessage) => {
            // Ignore continuous scanning errors
          }
        );
        setIsScanning(true);
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to start camera';
        setError(errorMsg);
        if (onError) {
          onError(errorMsg);
        }
        console.error('Scanner error:', err);
      }
    };

    startScanning();

    return () => {
      stopScanning();
    };
  }, []);

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const handleClose = async () => {
    await stopScanning();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative w-full max-w-md rounded-lg bg-white dark:bg-zinc-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50">Scan Barcode</h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-300">
              Make sure you have granted camera permissions and are using HTTPS or localhost.
            </p>
          </div>
        )}

        <div id="barcode-scanner" className="w-full rounded-lg overflow-hidden" style={{ minHeight: '300px' }}></div>

        <div className="mt-4 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Point your camera at a barcode to scan
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleClose}
            className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}




