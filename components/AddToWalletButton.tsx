// components/AddToWalletButton.tsx

"use client";

import { useState } from "react";
import {
  LegacyResult,
  buildWalletPassRequest,
  requestLegacyPass,
} from "../lib/walletPass";

interface AddToWalletButtonProps {
  result: LegacyResult | null;
}

export default function AddToWalletButton({ result }: AddToWalletButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAddToWallet = async () => {
    if (!result) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const request = buildWalletPassRequest(result);
      await requestLegacyPass(request);
      setSuccess(true);

      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to generate wallet pass:", err);
      setError(err instanceof Error ? err.message : "Failed to generate pass");
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !result || loading;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleAddToWallet}
        disabled={isDisabled}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-black text-yellow-400 px-4 py-2.5 text-sm font-medium hover:bg-black/90 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 transition-colors h-10 w-full sm:w-auto"
        title={!result ? "Run the calculator first" : "Add to Apple Wallet"}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 mr-2"
        >
          <path
            d="M11.5 1.5C11.2 1.5 10.9 1.6 10.7 1.8L9.8 2.7C9.4 3.1 9.4 3.7 9.8 4.1C10.2 4.5 10.8 4.5 11.2 4.1L12.1 3.2C12.5 2.8 12.5 2.2 12.1 1.8C11.9 1.6 11.7 1.5 11.5 1.5Z"
            fill="currentColor"
          />
          <path
            d="M4 4H3C2.4 4 2 4.4 2 5V13C2 13.6 2.4 14 3 14H13C13.6 14 14 13.6 14 13V5C14 4.4 13.6 4 13 4H12V6H4V4Z"
            fill="currentColor"
          />
        </svg>
        {loading ? "Generating..." : "Add to Apple Wallet"}
      </button>

      {/* Status messages */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 max-w-xs text-center">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Pass downloaded! Open the file to add to Wallet.
        </p>
      )}
      {!result && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Run the calculator first to generate your legacy card
        </p>
      )}
    </div>
  );
}
