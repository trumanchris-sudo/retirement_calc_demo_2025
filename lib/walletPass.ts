// lib/walletPass.ts

export interface LegacyResult {
  legacyAmount: number;              // in base currency units
  legacyAmountDisplay: string;       // formatted, e.g. "$14.8M"
  legacyType: "Perpetual Legacy" | "Finite Legacy" | string;
  withdrawalRate: number;            // e.g. 0.035 (3.5%)
  successProbability: number;        // 0–1 (e.g. 0.95)
  explanationText: string;
}

export interface WalletPassRequest {
  serialNumber: string;
  legacyAmount: number;
  legacyAmountDisplay: string;
  legacyType: string;
  withdrawalRate: number;
  successProbability: number;
  withdrawalRateDisplay: string;
  successProbabilityDisplay: string;
  explanationText: string;
  barcodeMessage: string;
}

/**
 * Generates a unique serial number for the pass
 */
function generateSerialNumber(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `LEGACY-${timestamp}-${random}`.toUpperCase();
}

/**
 * Formats withdrawal rate as percentage
 */
function formatWithdrawalRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

/**
 * Formats success probability as percentage
 */
function formatSuccessProbability(prob: number): string {
  return `${(prob * 100).toFixed(1)}%`;
}

/**
 * Builds the request payload to send to the backend for pass generation
 */
export function buildWalletPassRequest(result: LegacyResult): WalletPassRequest {
  const serialNumber = generateSerialNumber();

  // Clamp values to valid ranges
  const withdrawalRate = Math.max(0, Math.min(1, result.withdrawalRate));
  const successProbability = Math.max(0, Math.min(1, result.successProbability));

  // Build barcode message with key data (can be used to verify/reload the calculation)
  const barcodeMessage = JSON.stringify({
    serial: serialNumber,
    amount: result.legacyAmount,
    type: result.legacyType,
    date: new Date().toISOString(),
  });

  return {
    serialNumber,
    legacyAmount: result.legacyAmount,
    legacyAmountDisplay: result.legacyAmountDisplay,
    legacyType: result.legacyType,
    withdrawalRate,
    successProbability,
    withdrawalRateDisplay: formatWithdrawalRate(withdrawalRate),
    successProbabilityDisplay: formatSuccessProbability(successProbability),
    explanationText: result.explanationText,
    barcodeMessage,
  };
}

/**
 * Calls the backend to generate the pass and triggers download
 */
export async function requestLegacyPass(req: WalletPassRequest): Promise<void> {
  const res = await fetch("/api/wallet/legacy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to generate pass: ${res.status} - ${errorText}`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "LegacyCard.pkpass";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
