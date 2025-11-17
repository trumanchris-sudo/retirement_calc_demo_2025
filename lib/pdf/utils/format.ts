export const formatCurrency = (value: number, opts: { compact?: boolean } = {}) => {
  const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: opts.compact ? 'compact' : 'standard',
    maximumFractionDigits: 0,
  });
  return fmt.format(value);
};
