#!/bin/bash

# Retirement Calculator - QA Health Check Script
# This script runs comprehensive health checks on the codebase

set -e  # Exit on error

echo "========================================="
echo "Retirement Calculator QA Health Check"
echo "========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print section headers
print_section() {
    echo ""
    echo "========================================="
    echo "$1"
    echo "========================================="
}

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}: $2"
    else
        echo -e "${RED}✗ FAILED${NC}: $2"
    fi
}

# Track overall status
OVERALL_STATUS=0

# 1. Check for TypeScript errors
print_section "1. TypeScript Check"
if npx tsc --noEmit 2>&1 | tee /tmp/tsc-output.txt; then
    print_status 0 "TypeScript compilation"
else
    print_status 1 "TypeScript compilation - see errors above"
    OVERALL_STATUS=1
fi

# 2. Run linter
print_section "2. ESLint Check"
if npm run lint 2>&1 | tee /tmp/lint-output.txt; then
    print_status 0 "ESLint"
else
    print_status 1 "ESLint - see warnings/errors above"
    OVERALL_STATUS=1
fi

# 3. Check for console.log statements (exclude node_modules and allowed files)
print_section "3. Console.log Detection"
CONSOLE_LOGS=$(grep -rn "console\.log" app/ components/ lib/ 2>/dev/null | grep -v "node_modules" | grep -v ".next" || true)
if [ -z "$CONSOLE_LOGS" ]; then
    print_status 0 "No console.log statements found in main code"
else
    echo -e "${YELLOW}⚠ WARNING${NC}: Found console.log statements:"
    echo "$CONSOLE_LOGS"
    echo ""
fi

# 4. Check for TODO/FIXME comments
print_section "4. TODO/FIXME Detection"
TODOS=$(grep -rn "TODO\|FIXME" app/ components/ lib/ 2>/dev/null | grep -v "node_modules" | grep -v ".next" | wc -l || echo "0")
if [ "$TODOS" -eq 0 ]; then
    print_status 0 "No TODO/FIXME comments found"
else
    echo -e "${YELLOW}⚠ INFO${NC}: Found $TODOS TODO/FIXME comments"
fi

# 5. Check for unused imports (from build warnings)
print_section "5. Build Check"
if npm run build 2>&1 | tee /tmp/build-output.txt; then
    print_status 0 "Production build"

    # Check for "defined but never used" warnings
    UNUSED=$(grep "defined but never used" /tmp/build-output.txt | wc -l || echo "0")
    if [ "$UNUSED" -gt 0 ]; then
        echo -e "${YELLOW}⚠ WARNING${NC}: Found $UNUSED unused variable(s)"
        grep "defined but never used" /tmp/build-output.txt
    fi
else
    print_status 1 "Production build - see errors above"
    OVERALL_STATUS=1
fi

# 6. Check bundle size
print_section "6. Bundle Size Analysis"
if [ -d ".next" ]; then
    echo "Build output summary:"
    du -sh .next/ 2>/dev/null || echo "Could not determine bundle size"
fi

# 7. Check for large commented code blocks
print_section "7. Commented Code Detection"
COMMENTED_LINES=$(grep -rn "^[ \t]*\/\/" app/page.tsx | wc -l || echo "0")
echo "Found $COMMENTED_LINES commented lines in app/page.tsx"
if [ "$COMMENTED_LINES" -gt 100 ]; then
    echo -e "${YELLOW}⚠ WARNING${NC}: Large number of commented lines detected - consider cleanup"
fi

# 8. Dependency audit
print_section "8. Dependency Security Audit"
if npm audit --production 2>&1 | tee /tmp/audit-output.txt; then
    print_status 0 "No security vulnerabilities found"
else
    VULNERABILITIES=$(grep "vulnerabilities" /tmp/audit-output.txt | tail -1)
    echo -e "${YELLOW}⚠ WARNING${NC}: $VULNERABILITIES"
fi

# 9. Check package.json for outdated packages
print_section "9. Outdated Packages Check"
echo "Checking for outdated packages..."
npm outdated || echo "Some packages may be outdated - review above"

# Final Summary
print_section "SUMMARY"
if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run 'npm run dev' to test locally"
    echo "  2. Run manual QA tests (see QA-FINDINGS.md)"
    echo "  3. Run E2E tests with 'npm test' (if configured)"
else
    echo -e "${RED}✗ Some checks failed - please review errors above${NC}"
    exit 1
fi

echo ""
echo "========================================="
echo "Health check complete!"
echo "========================================="
