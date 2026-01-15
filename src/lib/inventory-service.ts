
import { supabaseAdmin } from './supabase';
import { InventoryItem, InventoryStatus } from './types';

// Map Supabase 'inventory' table rows to our 'InventoryItem' type
// If the table columns match the type keys exactly, this might be simple casting.
// Reviewing schema:
// id, marka, model, seri_no, imei, durum, giris_tarihi, cikis_tarihi, musteri_id, ekleyen, prices...

export async function getInventoryItems(status?: InventoryStatus): Promise<InventoryItem[]> {
    try {
        let query = supabaseAdmin
            .from('inventory')
            .select('*');

        if (status) {
            query = query.eq('durum', status);
        }

        // Order by giris_tarihi desc
        query = query.order('giris_tarihi', { ascending: false });

        const { data, error } = await query;

        if (error) {
            console.error('Supabase Inventory Fetch Error:', error);
            throw error;
        }

        return (data || []) as InventoryItem[];
    } catch (error) {
        console.error('Error fetching inventory from Supabase:', error);
        return [];
    }
}

export async function addInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> {
    try {
        // Supabase generates ID automatically (default gen_random_uuid())
        const { data, error } = await supabaseAdmin
            .from('inventory')
            .insert([item])
            .select()
            .single();

        if (error) {
            console.error('Supabase Inventory Insert Error:', error);
            throw error;
        }

        return data as InventoryItem;
    } catch (error) {
        console.error('Error adding inventory item to Supabase:', error);
        throw error;
    }
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
        const { data, error } = await supabaseAdmin
            .from('inventory')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Supabase Inventory Update Error:', error);
            throw error;
        }

        return data as InventoryItem;
    } catch (error) {
        console.error('Error updating inventory item in Supabase:', error);
        throw error;
    }
}
