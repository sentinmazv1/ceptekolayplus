function parseSheetDate(dateStr) {
    if (!dateStr) return null;
    let cleanStr = dateStr.trim();
    if (!cleanStr) return null;

    console.log(`Testing: "${cleanStr}"`);

    // 1. Try standard Date parsing
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
        console.log(`  -> Standard Date parsed: ${d.toISOString()}`);
        return d.getTime();
    }

    // 2. Try Regex
    const trMatch = cleanStr.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (trMatch) {
        const day = parseInt(trMatch[1], 10);
        const month = parseInt(trMatch[2], 10) - 1;
        const year = parseInt(trMatch[3], 10);
        const hour = trMatch[4] ? parseInt(trMatch[4], 10) : 0;
        const minute = trMatch[5] ? parseInt(trMatch[5], 10) : 0;
        const second = trMatch[6] ? parseInt(trMatch[6], 10) : 0;

        const d2 = new Date(year, month, day, hour, minute, second);
        if (!isNaN(d2.getTime())) {
            console.log(`  -> Regex parsed: ${d2.toISOString()}`);
            return d2.getTime();
        }
    }
    console.log("  -> FAILED");
    return null;
}

// Test Cases
parseSheetDate('26.12.2024');
parseSheetDate('26.12.2024 15:30');
parseSheetDate('26.12.2024 15:30:45');
parseSheetDate('2024-12-26 15:30:45');
parseSheetDate('26/12/2024');
parseSheetDate('26-12-2024 09:00');
