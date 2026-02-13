"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES - Structured for future real Plaid integration
// =============================================================================

/**
 * Mock account data structure matching Plaid's account schema
 * @see https://plaid.com/docs/api/accounts/
 */
export interface PlaidAccount {
  account_id: string;
  name: string;
  official_name: string | null;
  type: "depository" | "investment" | "credit" | "loan" | "other";
  subtype: string;
  mask: string | null;
  balances: {
    available: number | null;
    current: number;
    limit: number | null;
    iso_currency_code: string;
  };
  institution_id: string;
  institution_name: string;
}

/**
 * Mock institution data
 */
export interface PlaidInstitution {
  institution_id: string;
  name: string;
  logo?: string;
  primary_color?: string;
}

/**
 * Data passed to calculator when accounts are imported
 */
export interface ImportedBalances {
  totalAssets: number;
  totalInvestments: number;
  totalCash: number;
  totalDebt: number;
  accounts: PlaidAccount[];
  importedAt: Date;
}

/**
 * Props for PlaidConnect component
 */
export interface PlaidConnectProps {
  /** Callback when balances are imported to calculator */
  onImport?: (balances: ImportedBalances) => void;
  /** Enable demo mode (bypasses "Coming Soon" overlay) */
  demoMode?: boolean;
  /** Custom class name */
  className?: string;
  /** Button variant */
  variant?: "default" | "outline" | "secondary";
  /** Button size */
  size?: "default" | "sm" | "lg";
}

// =============================================================================
// MOCK DATA - Sample accounts for demo
// =============================================================================

const MOCK_INSTITUTIONS: PlaidInstitution[] = [
  {
    institution_id: "ins_1",
    name: "Chase",
    primary_color: "#117ACA",
  },
  {
    institution_id: "ins_2",
    name: "Fidelity",
    primary_color: "#4AA564",
  },
  {
    institution_id: "ins_3",
    name: "Bank of America",
    primary_color: "#E31837",
  },
  {
    institution_id: "ins_4",
    name: "Vanguard",
    primary_color: "#96151D",
  },
  {
    institution_id: "ins_5",
    name: "Charles Schwab",
    primary_color: "#00A3E0",
  },
];

const MOCK_ACCOUNTS: PlaidAccount[] = [
  {
    account_id: "acc_1",
    name: "Checking",
    official_name: "Total Checking",
    type: "depository",
    subtype: "checking",
    mask: "4521",
    balances: {
      available: 15420.5,
      current: 15420.5,
      limit: null,
      iso_currency_code: "USD",
    },
    institution_id: "ins_1",
    institution_name: "Chase",
  },
  {
    account_id: "acc_2",
    name: "Savings",
    official_name: "Premier Savings",
    type: "depository",
    subtype: "savings",
    mask: "8834",
    balances: {
      available: 52000.0,
      current: 52000.0,
      limit: null,
      iso_currency_code: "USD",
    },
    institution_id: "ins_1",
    institution_name: "Chase",
  },
  {
    account_id: "acc_3",
    name: "401(k)",
    official_name: "Workplace Retirement Account",
    type: "investment",
    subtype: "401k",
    mask: "9012",
    balances: {
      available: null,
      current: 485000.0,
      limit: null,
      iso_currency_code: "USD",
    },
    institution_id: "ins_2",
    institution_name: "Fidelity",
  },
  {
    account_id: "acc_4",
    name: "Roth IRA",
    official_name: "Roth Individual Retirement Account",
    type: "investment",
    subtype: "roth",
    mask: "3456",
    balances: {
      available: null,
      current: 125000.0,
      limit: null,
      iso_currency_code: "USD",
    },
    institution_id: "ins_2",
    institution_name: "Fidelity",
  },
  {
    account_id: "acc_5",
    name: "Brokerage",
    official_name: "Individual Investment Account",
    type: "investment",
    subtype: "brokerage",
    mask: "7890",
    balances: {
      available: null,
      current: 234500.0,
      limit: null,
      iso_currency_code: "USD",
    },
    institution_id: "ins_4",
    institution_name: "Vanguard",
  },
  {
    account_id: "acc_6",
    name: "Credit Card",
    official_name: "Sapphire Reserve",
    type: "credit",
    subtype: "credit card",
    mask: "1234",
    balances: {
      available: 26500.0,
      current: 3500.0,
      limit: 30000.0,
      iso_currency_code: "USD",
    },
    institution_id: "ins_1",
    institution_name: "Chase",
  },
  {
    account_id: "acc_7",
    name: "Mortgage",
    official_name: "Home Mortgage Loan",
    type: "loan",
    subtype: "mortgage",
    mask: "5678",
    balances: {
      available: null,
      current: 320000.0,
      limit: null,
      iso_currency_code: "USD",
    },
    institution_id: "ins_3",
    institution_name: "Bank of America",
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getAccountTypeIcon = (type: PlaidAccount["type"]): string => {
  switch (type) {
    case "depository":
      return "bank";
    case "investment":
      return "trending-up";
    case "credit":
      return "credit-card";
    case "loan":
      return "home";
    default:
      return "wallet";
  }
};

const getAccountTypeLabel = (type: PlaidAccount["type"]): string => {
  switch (type) {
    case "depository":
      return "Cash";
    case "investment":
      return "Investment";
    case "credit":
      return "Credit";
    case "loan":
      return "Loan";
    default:
      return "Other";
  }
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ComingSoonOverlayProps {
  onJoinWaitlist: (email: string) => void;
  onTryDemo: () => void;
}

function ComingSoonOverlay({ onJoinWaitlist, onTryDemo }: ComingSoonOverlayProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    onJoinWaitlist(email);
    setSubmitted(true);
    setError(null);
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm rounded-lg">
      <div className="text-center space-y-4 p-6 max-w-sm">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          Coming Soon
        </Badge>
        <h3 className="text-xl font-semibold">Bank Connection</h3>
        <p className="text-sm text-muted-foreground">
          Securely connect your bank accounts to automatically import your balances.
          Powered by Plaid.
        </p>

        {submitted ? (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-700 dark:text-green-300">
              Thanks! We will notify you when bank connections are available.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-center"
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full">
              Join Waitlist
            </Button>
          </form>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              or
            </span>
          </div>
        </div>

        <Button variant="outline" onClick={onTryDemo} className="w-full">
          Try Demo Mode
        </Button>
      </div>
    </div>
  );
}

interface InstitutionSelectorProps {
  institutions: PlaidInstitution[];
  onSelect: (institution: PlaidInstitution) => void;
  onSearch: (query: string) => void;
}

function InstitutionSelector({
  institutions,
  onSelect,
  onSearch,
}: InstitutionSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredInstitutions = institutions.filter((inst) =>
    inst.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="Search for your bank..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          onSearch(e.target.value);
        }}
      />
      <div className="grid gap-2 max-h-[300px] overflow-y-auto">
        {filteredInstitutions.map((institution) => (
          <button
            key={institution.institution_id}
            onClick={() => onSelect(institution)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border",
              "hover:bg-accent hover:border-accent-foreground/20",
              "transition-colors text-left w-full"
            )}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: institution.primary_color || "#6B7280" }}
            >
              {institution.name.charAt(0)}
            </div>
            <span className="font-medium">{institution.name}</span>
          </button>
        ))}
        {filteredInstitutions.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No institutions found. Try a different search.
          </p>
        )}
      </div>
    </div>
  );
}

interface MockLoginFormProps {
  institution: PlaidInstitution;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
}

function MockLoginForm({
  institution,
  onSubmit,
  onBack,
  isLoading,
}: MockLoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back
      </button>

      <div className="flex items-center gap-3 pb-4 border-b">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: institution.primary_color || "#6B7280" }}
        >
          {institution.name.charAt(0)}
        </div>
        <div>
          <h3 className="font-semibold">{institution.name}</h3>
          <p className="text-sm text-muted-foreground">Enter your credentials</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Username</label>
          <Input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <strong>Demo Mode:</strong> Enter any credentials. This is a simulation
            and no real connection will be made.
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Connecting...
            </span>
          ) : (
            "Connect"
          )}
        </Button>
      </form>

      <p className="text-xs text-center text-muted-foreground">
        Your credentials are encrypted and never stored.
      </p>
    </div>
  );
}

interface AccountSelectorProps {
  accounts: PlaidAccount[];
  selectedAccounts: Set<string>;
  onToggleAccount: (accountId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

function AccountSelector({
  accounts,
  selectedAccounts,
  onToggleAccount,
  onSelectAll,
  onDeselectAll,
}: AccountSelectorProps) {
  const groupedAccounts = accounts.reduce(
    (groups, account) => {
      const group = account.institution_name;
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(account);
      return groups;
    },
    {} as Record<string, PlaidAccount[]>
  );

  const allSelected = accounts.every((acc) => selectedAccounts.has(acc.account_id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedAccounts.size} of {accounts.length} accounts selected
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={allSelected ? onDeselectAll : onSelectAll}
        >
          {allSelected ? "Deselect All" : "Select All"}
        </Button>
      </div>

      <div className="space-y-4 max-h-[350px] overflow-y-auto">
        {Object.entries(groupedAccounts).map(([institutionName, institutionAccounts]) => (
          <div key={institutionName} className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">
              {institutionName}
            </h4>
            {institutionAccounts.map((account) => (
              <label
                key={account.account_id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer",
                  "hover:bg-accent transition-colors",
                  selectedAccounts.has(account.account_id) &&
                    "border-primary bg-primary/5"
                )}
              >
                <Checkbox
                  checked={selectedAccounts.has(account.account_id)}
                  onCheckedChange={() => onToggleAccount(account.account_id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{account.name}</span>
                    {account.mask && (
                      <span className="text-xs text-muted-foreground">
                        ...{account.mask}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getAccountTypeLabel(account.type)}
                    </Badge>
                    {account.subtype && (
                      <span className="text-xs text-muted-foreground capitalize">
                        {account.subtype}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "font-semibold",
                      account.type === "credit" || account.type === "loan"
                        ? "text-destructive"
                        : "text-foreground"
                    )}
                  >
                    {account.type === "credit" || account.type === "loan"
                      ? `-${formatCurrency(account.balances.current)}`
                      : formatCurrency(account.balances.current)}
                  </p>
                </div>
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ImportSummaryProps {
  balances: ImportedBalances;
}

function ImportSummary({ balances }: ImportSummaryProps) {
  const netWorth = balances.totalAssets - balances.totalDebt;

  return (
    <div className="space-y-4">
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-green-600 dark:text-green-400"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span className="font-semibold text-green-700 dark:text-green-300">
            Accounts Connected Successfully
          </span>
        </div>
        <p className="text-sm text-green-600 dark:text-green-400">
          {balances.accounts.length} accounts imported to your calculator
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Cash</p>
            <p className="text-lg font-bold">{formatCurrency(balances.totalCash)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Investments</p>
            <p className="text-lg font-bold">
              {formatCurrency(balances.totalInvestments)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Debt</p>
            <p className="text-lg font-bold text-destructive">
              -{formatCurrency(balances.totalDebt)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Net Worth</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(netWorth)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

type ModalStep = "institutions" | "login" | "accounts" | "summary";

/**
 * PlaidConnect - Mock Plaid bank connection component
 *
 * This component simulates the Plaid Link flow for demo purposes.
 * It is structured to allow easy replacement with the real Plaid SDK
 * when ready for production integration.
 *
 * @example
 * ```tsx
 * // Demo mode (for testing)
 * <PlaidConnect
 *   demoMode
 *   onImport={(balances) => {
 *     setCurrentSavings(balances.totalAssets);
 *     setInvestments(balances.totalInvestments);
 *   }}
 * />
 *
 * // Production mode (shows "Coming Soon" overlay)
 * <PlaidConnect
 *   onImport={(balances) => updateCalculatorInputs(balances)}
 * />
 * ```
 *
 * @future Integration with real Plaid SDK
 * When ready to integrate with real Plaid:
 * 1. Install @plaid/react-plaid-link
 * 2. Replace MockPlaidLink with usePlaidLink hook
 * 3. Set up Plaid Link token exchange on backend
 * 4. Replace mock accounts with real account data from /accounts/get
 */
export function PlaidConnect({
  onImport,
  demoMode = false,
  className,
  variant = "default",
  size = "default",
}: PlaidConnectProps) {
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(!demoMode);
  const [step, setStep] = useState<ModalStep>("institutions");

  // Flow state
  const [selectedInstitution, setSelectedInstitution] =
    useState<PlaidInstitution | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [importedBalances, setImportedBalances] = useState<ImportedBalances | null>(
    null
  );

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Reset after animation completes
    setTimeout(() => {
      setStep("institutions");
      setSelectedInstitution(null);
      setAccounts([]);
      setSelectedAccounts(new Set());
      setImportedBalances(null);
      if (!demoMode) {
        setShowComingSoon(true);
      }
    }, 200);
  }, [demoMode]);

  // Institution selection
  const handleSelectInstitution = useCallback((institution: PlaidInstitution) => {
    setSelectedInstitution(institution);
    setStep("login");
  }, []);

  // Mock login
  const handleLogin = useCallback(() => {
    setIsConnecting(true);
    // Simulate API delay
    setTimeout(() => {
      // Filter mock accounts to ones from this "institution"
      // In reality, we'd fetch real accounts from Plaid
      const institutionAccounts = MOCK_ACCOUNTS.filter(
        (acc) => acc.institution_id === selectedInstitution?.institution_id
      );

      // If the selected institution doesn't have mock data, show all accounts
      const accountsToShow =
        institutionAccounts.length > 0 ? institutionAccounts : MOCK_ACCOUNTS;

      setAccounts(accountsToShow);
      setSelectedAccounts(new Set(accountsToShow.map((acc) => acc.account_id)));
      setIsConnecting(false);
      setStep("accounts");
    }, 1500);
  }, [selectedInstitution]);

  // Account selection
  const handleToggleAccount = useCallback((accountId: string) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedAccounts(new Set(accounts.map((acc) => acc.account_id)));
  }, [accounts]);

  const handleDeselectAll = useCallback(() => {
    setSelectedAccounts(new Set());
  }, []);

  // Import accounts
  const handleImport = useCallback(() => {
    const selectedAccountsList = accounts.filter((acc) =>
      selectedAccounts.has(acc.account_id)
    );

    let totalCash = 0;
    let totalInvestments = 0;
    let totalDebt = 0;

    selectedAccountsList.forEach((acc) => {
      if (acc.type === "depository") {
        totalCash += acc.balances.current;
      } else if (acc.type === "investment") {
        totalInvestments += acc.balances.current;
      } else if (acc.type === "credit" || acc.type === "loan") {
        totalDebt += acc.balances.current;
      }
    });

    const balances: ImportedBalances = {
      totalAssets: totalCash + totalInvestments,
      totalInvestments,
      totalCash,
      totalDebt,
      accounts: selectedAccountsList,
      importedAt: new Date(),
    };

    setImportedBalances(balances);
    setStep("summary");

    // Call onImport callback
    onImport?.(balances);
  }, [accounts, selectedAccounts, onImport]);

  // Waitlist signup
  const handleJoinWaitlist = useCallback((email: string) => {
    // In production, this would call an API to save the email
    console.log("Waitlist signup:", email);
    // Could integrate with analytics or email service here
  }, []);

  // Enter demo mode
  const handleTryDemo = useCallback(() => {
    setShowComingSoon(false);
  }, []);

  // Quick demo import (bypass modal flow)
  const handleQuickDemo = useCallback(() => {
    const balances: ImportedBalances = {
      totalAssets: 911920.5,
      totalInvestments: 844500,
      totalCash: 67420.5,
      totalDebt: 323500,
      accounts: MOCK_ACCOUNTS,
      importedAt: new Date(),
    };

    onImport?.(balances);
    setImportedBalances(balances);
    setStep("summary");
  }, [onImport]);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={cn("gap-2", className)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
        Connect Your Accounts
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <div className="relative">
            {/* Coming Soon Overlay */}
            {showComingSoon && (
              <ComingSoonOverlay
                onJoinWaitlist={handleJoinWaitlist}
                onTryDemo={handleTryDemo}
              />
            )}

            {/* Modal Header */}
            <DialogHeader className="pb-4">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
                <DialogTitle>
                  {step === "institutions" && "Connect Your Accounts"}
                  {step === "login" && "Sign In"}
                  {step === "accounts" && "Select Accounts"}
                  {step === "summary" && "Import Complete"}
                </DialogTitle>
              </div>
              <DialogDescription>
                {step === "institutions" &&
                  "Securely connect your bank and investment accounts"}
                {step === "login" &&
                  "Enter your credentials to connect your accounts"}
                {step === "accounts" &&
                  "Choose which accounts to import into the calculator"}
                {step === "summary" &&
                  "Your account balances have been imported"}
              </DialogDescription>
            </DialogHeader>

            {/* Modal Content */}
            <div className="min-h-[300px]">
              {step === "institutions" && (
                <InstitutionSelector
                  institutions={MOCK_INSTITUTIONS}
                  onSelect={handleSelectInstitution}
                  onSearch={() => {}}
                />
              )}

              {step === "login" && selectedInstitution && (
                <MockLoginForm
                  institution={selectedInstitution}
                  onSubmit={handleLogin}
                  onBack={() => setStep("institutions")}
                  isLoading={isConnecting}
                />
              )}

              {step === "accounts" && (
                <AccountSelector
                  accounts={accounts}
                  selectedAccounts={selectedAccounts}
                  onToggleAccount={handleToggleAccount}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                />
              )}

              {step === "summary" && importedBalances && (
                <ImportSummary balances={importedBalances} />
              )}
            </div>

            {/* Modal Footer */}
            <DialogFooter className="pt-4">
              {step === "institutions" && (
                <div className="w-full flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={handleQuickDemo}
                    className="w-full"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                    Quick Import Sample Data
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Or select a bank above to try the full demo flow
                  </p>
                </div>
              )}

              {step === "accounts" && (
                <div className="w-full flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep("institutions")}
                    className="flex-1"
                  >
                    Add More Accounts
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={selectedAccounts.size === 0}
                    className="flex-1"
                  >
                    Import {selectedAccounts.size} Account
                    {selectedAccounts.size !== 1 ? "s" : ""}
                  </Button>
                </div>
              )}

              {step === "summary" && (
                <Button onClick={handleClose} className="w-full">
                  Done
                </Button>
              )}
            </DialogFooter>
          </div>

          {/* Plaid branding */}
          <div className="pt-2 border-t mt-4">
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Bank-level security powered by Plaid
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default PlaidConnect;

// Types are exported at their definitions above

// Export mock data for testing
export { MOCK_ACCOUNTS, MOCK_INSTITUTIONS };
