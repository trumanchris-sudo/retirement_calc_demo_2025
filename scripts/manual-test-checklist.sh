#!/bin/bash

# Interactive Manual Testing Checklist for Retirement Calculator
# Run this script while manually testing the application

echo "========================================"
echo "Retirement Calculator Manual QA"
echo "========================================"
echo ""
echo "Make sure the dev server is running:"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
read -p "Press Enter when ready to start testing..."

# Function to prompt for test completion
check_test() {
    echo ""
    echo "Test: $1"
    echo "────────────────────────────────────────"
    echo "$2"
    echo ""
    read -p "✓ PASS / ✗ FAIL? (p/f/skip): " result
    case $result in
        p|P) echo "✅ PASSED" ;;
        f|F)
            echo "❌ FAILED"
            read -p "  → Notes: " notes
            echo "   $notes" >> test-failures.log
            ;;
        *) echo "⊘ SKIPPED" ;;
    esac
}

# Clear previous failures log
> test-failures.log

echo ""
echo "========================================="
echo "CONFIGURE TAB TESTS"
echo "========================================="

check_test \
    "Configure Tab - Single User" \
    "1. Enter age: 45
2. Enter retirement age: 65
3. Enter salary: 100,000
4. Enter savings (taxable): 50,000
5. Click Calculate
6. Should auto-navigate to Results tab"

check_test \
    "Configure Tab - Married Couple" \
    "1. Click 'Married' radio button
2. Enter age 1: 45
3. Enter age 2: 43
4. Enter retirement age: 65
5. Enter savings values
6. Click Calculate
7. Should see results for both spouses"

check_test \
    "Social Security Default ON" \
    "1. Scroll to Advanced Settings (or Social Security section)
2. Verify Social Security checkbox is CHECKED by default
3. Try unchecking and recalculating
4. Should show different results"

check_test \
    "Generational Wealth Toggle" \
    "1. Find 'Enable Generational Wealth Modeling' checkbox
2. Toggle it ON
3. Should see configuration fields appear
4. Toggle it OFF
5. Fields should disappear"

echo ""
echo "========================================="
echo "RESULTS TAB TESTS"
echo "========================================="

check_test \
    "Results Tab - Accumulation Chart Visible" \
    "1. After calculation, verify you're on Results tab
2. Chart should be visible immediately (no accordion click needed)
3. Chart should show accumulation over time
4. Should NOT see comparison chart here"

check_test \
    "Results Tab - Lifetime Wealth Flow Visible" \
    "1. Scroll down on Results tab
2. Look for 'Lifetime Wealth Flow' section
3. Should be visible (may be in accordion but should be findable)
4. Verify it shows wealth progression"

check_test \
    "Results Tab - Animated Stats" \
    "1. Look at result cards (End of Life Balance, etc.)
2. Numbers should animate when first loaded
3. All key metrics should be visible
4. Format should be readable (commas, decimals)"

echo ""
echo "========================================="
echo "STRESS TESTS TAB TESTS"
echo "========================================="

check_test \
    "Stress Tests - Bear Market Scenario" \
    "1. Navigate to Stress Tests tab
2. Select '2008 Financial Crisis' or bear market scenario
3. Click 'Refresh Comparison'
4. Chart should appear showing:
   - Baseline (from Results)
   - Bear market scenario (lower line)
5. Legend should show both scenarios"

check_test \
    "Stress Tests - Multiple Scenarios" \
    "1. Select bear market scenario
2. Also select inflation shock scenario
3. Click 'Refresh Comparison'
4. Should see 3 lines:
   - Baseline
   - Bear market
   - Inflation shock
5. Can toggle visibility in legend"

echo ""
echo "========================================="
echo "LEGACY PLANNING TESTS"
echo "========================================="

check_test \
    "Legacy Planning - No Checkbox Required" \
    "1. Go to Configure tab
2. Scroll to Legacy Planning section
3. Configuration fields should be VISIBLE immediately
4. Should NOT see 'Enable Legacy Planning' checkbox
5. Can modify values directly"

check_test \
    "Legacy Planning - Results Display" \
    "1. Set legacy amount to $500,000
2. Click Calculate
3. Navigate to Results or All-in-One
4. Should see legacy planning results
5. Verify calculations include legacy provisions"

echo ""
echo "========================================="
echo "MATH TAB TESTS"
echo "========================================="

check_test \
    "Math Tab - Detailed Calculations" \
    "1. After running calculation, navigate to Math tab
2. Should see detailed calculation breakdowns
3. All formulas and intermediate steps visible
4. Can expand/collapse sections if in accordion
5. Numbers should match Results tab"

echo ""
echo "========================================="
echo "ALL-IN-ONE TAB TESTS"
echo "========================================="

check_test \
    "All-in-One - Complete View" \
    "1. Navigate to All-in-One tab
2. Should see ALL sections:
   - Results summary at top
   - Accumulation chart
   - (Comparison chart if stress tests run)
   - Lifetime Wealth Flow
   - Math details
3. Can scroll through entire page
4. All sections are readable and properly formatted"

echo ""
echo "========================================="
echo "EDGE CASES & VALIDATION"
echo "========================================="

check_test \
    "Input Validation - Invalid Age" \
    "1. Try entering age < 18 or > 100
2. Try entering retirement age < current age
3. Should show validation errors
4. Calculate button should be disabled or show error"

check_test \
    "Input Validation - Negative Numbers" \
    "1. Try entering negative salary
2. Try entering negative savings
3. Should either prevent entry or show validation error"

check_test \
    "Large Numbers Handling" \
    "1. Enter very large savings (e.g., 10,000,000)
2. Calculate
3. Results should display properly formatted
4. Charts should scale appropriately
5. No overflow or display issues"

echo ""
echo "========================================="
echo "RETURN MODEL TESTS"
echo "========================================="

check_test \
    "Return Model - Fixed" \
    "1. Select 'Fixed' return model
2. Calculate
3. Results should show single deterministic outcome
4. No P10/P90 options should appear"

check_test \
    "Return Model - Truly Random" \
    "1. Select 'Truly Random' return model
2. Calculate
3. Should see options to show P10/P90 bands
4. Chart should show uncertainty ranges
5. Results may vary slightly on recalculation"

echo ""
echo "========================================="
echo "MOBILE/RESPONSIVE TESTS"
echo "========================================="

check_test \
    "Mobile View (if applicable)" \
    "1. Resize browser to mobile width (375px)
2. Tabs should be usable
3. Forms should be readable
4. Charts should scale down appropriately
5. All functionality accessible"

echo ""
echo "========================================="
echo "PRINT VIEW"
echo "========================================="

check_test \
    "Print Preview" \
    "1. After calculation, press Ctrl+P (or Cmd+P)
2. Print preview should show:
   - User inputs summary
   - Results
   - Charts (if supported)
   - All key information
3. Should be well-formatted for printing"

echo ""
echo "========================================="
echo "TEST SUMMARY"
echo "========================================="
echo ""

if [ -s test-failures.log ]; then
    echo "❌ FAILURES DETECTED"
    echo ""
    echo "Review failures in: test-failures.log"
    echo ""
    cat test-failures.log
    echo ""
    echo "Please investigate and fix these issues before deployment."
else
    echo "✅ ALL TESTS PASSED!"
    echo ""
    echo "The application is ready for deployment."
fi

echo ""
echo "========================================="
echo "Manual testing complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Review any failures logged"
echo "  2. Run automated tests: npm test"
echo "  3. Run health check: ./scripts/qa-health-check.sh"
echo ""
