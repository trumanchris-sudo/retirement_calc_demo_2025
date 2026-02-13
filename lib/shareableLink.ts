/**
 * Shareable Link System for Retirement Calculator
 *
 * Creates URL-safe compressed links that encode calculator inputs.
 * No server storage needed - all data is in the URL.
 *
 * Features:
 * - Compress key inputs into URL-safe Base64 string
 * - "Send to your kids" feature with pre-filled young investor scenario
 * - Social sharing with anonymous mode (no personal data)
 * - Demo mode for shared links
 */

import { z } from 'zod';

// ==================== Types ====================

/**
 * Core shareable data structure - only the essential inputs
 * Kept minimal to ensure URLs stay reasonably short
 */
export interface ShareableData {
  // Personal
  age: number;
  spouseAge?: number;
  retirementAge: number;
  isMarried: boolean;

  // Balances (in thousands to save space)
  taxableK: number;    // Taxable balance in $K
  pretaxK: number;     // Pre-tax (401k/IRA) balance in $K
  rothK: number;       // Roth balance in $K

  // Contributions (annual, in thousands)
  annualContribK: number;  // Total annual contributions in $K

  // Key rates
  returnRate: number;      // Expected return %
  withdrawalRate: number;  // Withdrawal rate %

  // Metadata
  version: number;         // Schema version for future migrations
}

/**
 * Social share content (anonymous mode)
 */
export interface SocialShareContent {
  headline: string;
  description: string;
  shareUrl: string;
}

/**
 * "Send to kids" configuration
 */
export interface SendToKidsConfig {
  childName?: string;
  childAge: number;
  customMessage?: string;
  parentScenario: ShareableData;
}

// ==================== Validation Schema ====================

const ShareableDataSchema = z.object({
  age: z.number().int().min(18).max(100),
  spouseAge: z.number().int().min(18).max(100).optional(),
  retirementAge: z.number().int().min(40).max(90),
  isMarried: z.boolean(),
  taxableK: z.number().min(0).max(100000),
  pretaxK: z.number().min(0).max(100000),
  rothK: z.number().min(0).max(100000),
  annualContribK: z.number().min(0).max(1000),
  returnRate: z.number().min(-20).max(30),
  withdrawalRate: z.number().min(0).max(20),
  version: z.number().int().min(1).max(100),
});

// ==================== Constants ====================

const CURRENT_VERSION = 1;
const URL_PARAM_KEY = 's'; // Short key to minimize URL length
const DEMO_PARAM_KEY = 'd'; // Demo mode flag

// Field order for encoding (must stay consistent across versions)
const FIELD_ORDER = [
  'version',
  'age',
  'spouseAge',
  'retirementAge',
  'isMarried',
  'taxableK',
  'pretaxK',
  'rothK',
  'annualContribK',
  'returnRate',
  'withdrawalRate',
] as const;

// ==================== Encoding / Decoding ====================

/**
 * Encode shareable data into a URL-safe string
 * Uses a compact numeric format: values joined by '_'
 */
export function encodeShareableData(data: ShareableData): string {
  const values: (number | string)[] = FIELD_ORDER.map(field => {
    const value = data[field as keyof ShareableData];
    if (field === 'isMarried') {
      return value ? 1 : 0;
    }
    if (field === 'spouseAge' && value === undefined) {
      return -1; // Sentinel for undefined
    }
    if (typeof value === 'number') {
      // Round to 1 decimal place to save space
      return Math.round(value * 10) / 10;
    }
    return value ?? 0;
  });

  // Join with underscores and Base64 encode
  const packed = values.join('_');
  // Use URL-safe Base64 encoding
  const encoded = btoa(packed)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return encoded;
}

/**
 * Decode a URL-safe string back to shareable data
 */
export function decodeShareableData(encoded: string): ShareableData | null {
  try {
    // Restore Base64 padding and decode
    const padded = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const paddedWithEquals = padded + '==='.slice(0, (4 - (padded.length % 4)) % 4);
    const packed = atob(paddedWithEquals);

    // Parse values
    const values = packed.split('_');
    if (values.length !== FIELD_ORDER.length) {
      console.warn('[ShareableLink] Invalid field count:', values.length);
      return null;
    }

    // Reconstruct object
    const data: Record<string, unknown> = {};
    FIELD_ORDER.forEach((field, index) => {
      const rawValue = values[index];
      if (field === 'isMarried') {
        data[field] = rawValue === '1';
      } else if (field === 'spouseAge') {
        const num = parseFloat(rawValue);
        data[field] = num === -1 ? undefined : num;
      } else {
        data[field] = parseFloat(rawValue);
      }
    });

    // Validate with Zod
    const result = ShareableDataSchema.safeParse(data);
    if (!result.success) {
      console.warn('[ShareableLink] Validation failed:', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    console.warn('[ShareableLink] Decode failed:', error);
    return null;
  }
}

// ==================== URL Generation ====================

/**
 * Generate a shareable URL from calculator inputs
 */
export function generateShareableUrl(
  data: ShareableData,
  baseUrl?: string,
  demoMode = false
): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const encoded = encodeShareableData(data);
  const url = new URL(base);
  url.searchParams.set(URL_PARAM_KEY, encoded);
  if (demoMode) {
    url.searchParams.set(DEMO_PARAM_KEY, '1');
  }
  return url.toString();
}

/**
 * Parse shareable data from current URL
 */
export function parseShareableFromUrl(): {
  data: ShareableData | null;
  isDemoMode: boolean;
} {
  if (typeof window === 'undefined') {
    return { data: null, isDemoMode: false };
  }

  const params = new URLSearchParams(window.location.search);
  const encoded = params.get(URL_PARAM_KEY);
  const isDemoMode = params.get(DEMO_PARAM_KEY) === '1';

  if (!encoded) {
    return { data: null, isDemoMode: false };
  }

  return {
    data: decodeShareableData(encoded),
    isDemoMode,
  };
}

// ==================== "Send to Kids" Feature ====================

/**
 * Create a "Send to your kids" shareable link
 * Pre-fills the calculator for a young investor starting fresh
 */
export function createSendToKidsLink(config: SendToKidsConfig): {
  url: string;
  message: string;
  subject: string;
} {
  const childAge = config.childAge || 25;
  const childName = config.childName || 'You';

  // Create optimized scenario for young investor
  const kidsData: ShareableData = {
    version: CURRENT_VERSION,
    age: childAge,
    retirementAge: 65,
    isMarried: false,
    taxableK: 0,     // Starting fresh
    pretaxK: 0,
    rothK: 0,
    annualContribK: Math.round(config.parentScenario.annualContribK * 0.3), // Suggest 30% of parent's contrib
    returnRate: config.parentScenario.returnRate,
    withdrawalRate: config.parentScenario.withdrawalRate,
  };

  const url = generateShareableUrl(kidsData);

  // Calculate what parent would have had if they started at kid's age
  const yearsHeadStart = config.parentScenario.age - childAge;

  const message = config.customMessage ||
    `Hey ${childName}! I just ran a retirement projection and realized something powerful. ` +
    `If I had started at age ${childAge} (${yearsHeadStart} years earlier), ` +
    `I'd have significantly more by retirement. Check out this calculator to see your potential: ${url}`;

  const subject = `${childName}, Your Future Self Will Thank You`;

  return { url, message, subject };
}

/**
 * Generate email link for sending to kids
 */
export function createSendToKidsEmailLink(config: SendToKidsConfig): string {
  const { url, message, subject } = createSendToKidsLink(config);

  const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  return mailtoLink;
}

// ==================== Social Sharing ====================

/**
 * Create anonymous social share content
 * No personal financial data is included - only the emotional hook
 */
export function createSocialShare(
  gapAmount: number,
  yearsLate: number,
  baseUrl?: string
): SocialShareContent {
  // Format the gap amount nicely
  const formattedGap = gapAmount >= 1_000_000
    ? `$${(gapAmount / 1_000_000).toFixed(1)}M`
    : `$${Math.round(gapAmount / 1000)}K`;

  // Create a demo-mode URL (doesn't include personal data)
  const demoData: ShareableData = {
    version: CURRENT_VERSION,
    age: 35,
    retirementAge: 65,
    isMarried: false,
    taxableK: 50,
    pretaxK: 100,
    rothK: 25,
    annualContribK: 30,
    returnRate: 9.8,
    withdrawalRate: 3.5,
  };

  const shareUrl = generateShareableUrl(demoData, baseUrl, true);

  return {
    headline: `I just discovered I could have ${formattedGap} more by retirement`,
    description: `Starting ${yearsLate} years earlier would have made all the difference. Time is the most valuable investment. See your own projection:`,
    shareUrl,
  };
}

/**
 * Generate Twitter/X share link
 */
export function createTwitterShareLink(content: SocialShareContent): string {
  const text = `${content.headline}\n\n${content.description}`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(content.shareUrl)}`;
}

/**
 * Generate LinkedIn share link
 */
export function createLinkedInShareLink(content: SocialShareContent): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(content.shareUrl)}`;
}

/**
 * Generate Facebook share link
 */
export function createFacebookShareLink(content: SocialShareContent): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(content.shareUrl)}&quote=${encodeURIComponent(content.headline)}`;
}

// ==================== Copy to Clipboard ====================

/**
 * Copy shareable link to clipboard
 */
export async function copyShareableLinkToClipboard(
  data: ShareableData,
  demoMode = false
): Promise<boolean> {
  try {
    const url = generateShareableUrl(data, undefined, demoMode);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('[ShareableLink] Failed to copy to clipboard:', error);
    return false;
  }
}

// ==================== Conversion Helpers ====================

/**
 * Convert full calculator inputs to shareable data
 * This extracts only the essential fields needed for sharing
 */
export function toShareableData(inputs: {
  age1: number;
  age2?: number;
  retirementAge: number;
  marital: 'single' | 'married' | 'mfs' | 'hoh';
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;
  cTax1: number;
  cPre1: number;
  cPost1: number;
  cTax2?: number;
  cPre2?: number;
  cPost2?: number;
  retRate: number;
  wdRate: number;
}): ShareableData {
  const isMarried = inputs.marital === 'married';

  // Sum all contributions
  const annualContrib = inputs.cTax1 + inputs.cPre1 + inputs.cPost1 +
    (isMarried ? (inputs.cTax2 || 0) + (inputs.cPre2 || 0) + (inputs.cPost2 || 0) : 0);

  return {
    version: CURRENT_VERSION,
    age: inputs.age1,
    spouseAge: isMarried ? inputs.age2 : undefined,
    retirementAge: inputs.retirementAge,
    isMarried,
    taxableK: Math.round(inputs.taxableBalance / 1000),
    pretaxK: Math.round(inputs.pretaxBalance / 1000),
    rothK: Math.round(inputs.rothBalance / 1000),
    annualContribK: Math.round(annualContrib / 1000),
    returnRate: inputs.retRate,
    withdrawalRate: inputs.wdRate,
  };
}

/**
 * Convert shareable data back to partial calculator inputs
 */
export function fromShareableData(data: ShareableData): {
  age1: number;
  age2: number;
  retirementAge: number;
  marital: 'single' | 'married';
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;
  cPre1: number; // Put most into pre-tax as default
  cPost1: number;
  cTax1: number;
  retRate: number;
  wdRate: number;
} {
  // Distribute annual contribution across account types
  // Assume 60% pre-tax, 30% Roth, 10% taxable as reasonable defaults
  const totalContrib = data.annualContribK * 1000;

  return {
    age1: data.age,
    age2: data.spouseAge || data.age,
    retirementAge: data.retirementAge,
    marital: data.isMarried ? 'married' : 'single',
    taxableBalance: data.taxableK * 1000,
    pretaxBalance: data.pretaxK * 1000,
    rothBalance: data.rothK * 1000,
    cPre1: Math.round(totalContrib * 0.6),
    cPost1: Math.round(totalContrib * 0.3),
    cTax1: Math.round(totalContrib * 0.1),
    retRate: data.returnRate,
    wdRate: data.withdrawalRate,
  };
}
