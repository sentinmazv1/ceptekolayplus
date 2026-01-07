import { getSheetsClient } from './google';
import { InventoryItem, InventoryStatus } from './types';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

export const INVENTORY_COLUMNS = [
    'id',
    'marka',
    'model',
    'seri_no',
    'imei',
    'durum',
    'giris_tarihi',
    'cikis_tarihi',
    'musteri_id',
    'ekleyen',
    'fiyat_3_taksit',
    'fiyat_6_taksit',
    'fiyat_12_taksit',
    'fiyat_15_taksit'
] as const;

// ... (helpers remain dynamic)

export async function getInventoryItems(status?: InventoryStatus): Promise<InventoryItem[]> {
    const client = getSheetsClient();

    try {
        const response = await client.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Inventory!A2:N', // Extended to N for pricing columns
        });

        const rows = response.data.values || [];
        const items = rows.map(row => rowToInventoryItem(row));

        if (status) {
            return items.filter(i => i.durum === status);
        }

        // Sort by input date (newest first)
        return items.sort((a, b) =>
            new Date(b.giris_tarihi).getTime() - new Date(a.giris_tarihi).getTime()
        );
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return [];
    }
}

export async function addInventoryItem(item: Omit<InventoryItem, 'id'>) {
    const client = getSheetsClient();
    const newItem = { ...item, id: crypto.randomUUID() };
    const row = inventoryItemToRow(newItem);

    await client.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Inventory!A:N',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [row]
        }
    });

    return newItem;
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItem>) {
    const client = getSheetsClient();

    // 1. Find the row index
    const response = await client.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'Inventory!A:A', // Fetch IDs only
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);

    if (rowIndex === -1) {
        throw new Error('Inventory item not found');
    }

    const sheetRowIndex = rowIndex + 1; // 1-based index

    // 2. Fetch current data to merge
    const currentResponse = await client.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `Inventory!A${sheetRowIndex}:J${sheetRowIndex}`,
    });

    const currentRow = currentResponse.data.values?.[0] || [];
    const currentItem = rowToInventoryItem(currentRow);

    // 3. Merge updates
    const updatedItem = { ...currentItem, ...updates };
    const newRow = inventoryItemToRow(updatedItem);

    // 4. Update row
    await client.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `Inventory!A${sheetRowIndex}:J${sheetRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [newRow]
        }
    });

    return updatedItem;
}
