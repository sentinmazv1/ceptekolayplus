// Utility function to format large numbers
export function formatLargeNumber(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;

    if (isNaN(num)) return '0';

    if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1)}M`;
    } else if (num >= 1_000) {
        return `${(num / 1_000).toFixed(1)}K`;
    }

    return num.toLocaleString('tr-TR');
}

// Format currency with abbreviation
export function formatCurrencyCompact(value: number): string {
    if (value >= 1_000_000) {
        return `₺${(value / 1_000_000).toFixed(1)}M`;
    } else if (value >= 1_000) {
        return `₺${(value / 1_000).toFixed(1)}K`;
    }

    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        maximumFractionDigits: 0
    }).format(value);
}
