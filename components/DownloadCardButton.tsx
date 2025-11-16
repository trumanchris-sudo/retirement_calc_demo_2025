// components/DownloadCardButton.tsx

"use client";

import { useState, useRef } from "react";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";

interface DownloadCardButtonProps {
  enabled: boolean;
  cardRef: React.RefObject<HTMLDivElement>;
  filename?: string;
}

export default function DownloadCardButton({
  enabled,
  cardRef,
  filename = "legacy-card.png"
}: DownloadCardButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current || !enabled) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Capture the card as a high-quality PNG (2x scale for retina)
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
      });

      // Create download link
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to download card image:", err);
      setError(err instanceof Error ? err.message : "Failed to download image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleDownload}
        disabled={!enabled || loading}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2.5 text-sm font-medium hover:from-purple-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 transition-all h-10 w-full sm:w-auto shadow-lg hover:shadow-xl"
        title={!enabled ? "Run the calculator first" : "Download card as image"}
      >
        <Download className="w-4 h-4" />
        {loading ? "Generating..." : "Download Card Image"}
      </button>

      {/* Status messages */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 max-w-xs text-center">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Card downloaded successfully!
        </p>
      )}
      {!enabled && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Run the calculator first to generate your card
        </p>
      )}
    </div>
  );
}
