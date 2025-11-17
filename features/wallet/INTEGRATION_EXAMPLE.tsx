/**
 * INTEGRATION EXAMPLE
 *
 * This file shows how to integrate the AddToWalletButton into your
 * retirement calculator results display.
 *
 * Copy the relevant sections into your app/page.tsx file.
 */

import AddToWalletButton from '@/components/AddToWalletButton';
import { LegacyResult } from '@/lib/walletPass';

// Example: Add to your results section where you display the EOL (End of Life) wealth

function ExampleIntegration() {
  // Assume you have these from your calculator:
  // - res: CalculationResult
  // - fmt: (n: number) => string (formatter function)
  // - wdRate: withdrawal rate as decimal (e.g., 0.035 for 3.5%)

  // Example thresholds for determining "Perpetual Legacy"
  const PERPETUAL_THRESHOLD = 10000000; // $10M+ is considered perpetual

  // Build the LegacyResult object from your calculation
  const legacyResult: LegacyResult = {
    legacyAmount: res.eol, // End of life wealth (nominal)
    legacyAmountDisplay: fmt(res.eol), // Formatted (e.g., "$14.8M")

    // Determine if legacy is perpetual based on wealth
    legacyType: res.eol >= PERPETUAL_THRESHOLD
      ? "Perpetual Legacy"
      : "Finite Legacy",

    // Withdrawal rate (already in decimal form)
    withdrawalRate: wdRate,

    // Success probability (1 - probability of ruin)
    successProbability: 1 - res.probRuin,

    // Explanation text for the back of the card
    explanationText: res.eol >= PERPETUAL_THRESHOLD
      ? `Your retirement plan projects perpetual wealth that extends beyond your lifetime. With an end-of-life balance of ${fmt(res.eol)} (${fmt(res.finReal)} in today's dollars), your estate is positioned to provide for future generations. This assumes a ${(wdRate * 100).toFixed(2)}% annual withdrawal rate with ${(100 - res.probRuin * 100).toFixed(1)}% probability of success.`
      : `Your retirement plan projects a finite legacy of ${fmt(res.eol)} at end of life (${fmt(res.finReal)} in today's dollars). While this provides a meaningful inheritance, the wealth may not sustain multiple generations at current withdrawal rates. Consider adjusting your strategy if generational wealth is a priority.`
  };

  return (
    <div>
      {/* Your existing results display */}

      {/* Add the Wallet button after calculation completes */}
      {res && (
        <div className="mt-6 flex justify-center">
          <AddToWalletButton result={legacyResult} />
        </div>
      )}
    </div>
  );
}

/**
 * Alternative: Conditional rendering based on result quality
 */
function ConditionalExample() {
  // Only show for "good" results
  const shouldShowWalletButton =
    res &&
    res.eol > 0 &&
    res.probRuin < 0.5; // Less than 50% chance of ruin

  const legacyResult: LegacyResult = {
    // ... same as above
  };

  return (
    <div>
      {shouldShowWalletButton && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-center mb-3 text-gray-700 dark:text-gray-300">
            Save your legacy projection to Apple Wallet
          </p>
          <AddToWalletButton result={legacyResult} />
        </div>
      )}
    </div>
  );
}

/**
 * Example: Inside a modal or expandable section
 */
function ModalExample() {
  const [showWalletOption, setShowWalletOption] = useState(false);

  return (
    <div>
      <button onClick={() => setShowWalletOption(true)}>
        Share Results
      </button>

      {showWalletOption && (
        <div className="modal">
          <h3>Share Your Legacy Plan</h3>
          <div className="space-y-4">
            <div>
              <h4>Apple Wallet</h4>
              <p>Add to Wallet for quick access on iPhone</p>
              <AddToWalletButton result={legacyResult} />
            </div>
            {/* Other sharing options... */}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example: Extracting net estate for the card
 */
function WithNetEstate() {
  // If you want to show net-to-heirs instead of gross EOL
  const netEstate = res.netEstate || res.eol;

  const legacyResult: LegacyResult = {
    legacyAmount: netEstate,
    legacyAmountDisplay: fmt(netEstate),
    legacyType: netEstate >= PERPETUAL_THRESHOLD
      ? "Perpetual Legacy"
      : "Finite Legacy",
    withdrawalRate: wdRate,
    successProbability: 1 - res.probRuin,
    explanationText: `After estate taxes, your heirs will receive approximately ${fmt(netEstate)}. ${
      res.estateTax && res.estateTax > 0
        ? `Estate taxes are estimated at ${fmt(res.estateTax)}.`
        : 'Your estate is below the federal exemption threshold.'
    }`
  };

  return <AddToWalletButton result={legacyResult} />;
}

export { ExampleIntegration, ConditionalExample, ModalExample, WithNetEstate };
