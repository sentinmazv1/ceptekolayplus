
-- Create a dedicated table for tracking Attorney Query status history
CREATE TABLE IF NOT EXISTS attorney_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    old_result TEXT,
    new_result TEXT,
    changed_by TEXT, -- Email or ID of the user who made the change
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB -- For any extra details
);

-- Index for fast reporting queries
CREATE INDEX IF NOT EXISTS idx_attorney_history_lead ON attorney_status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_attorney_history_date ON attorney_status_history(created_at);
CREATE INDEX IF NOT EXISTS idx_attorney_history_status ON attorney_status_history(new_status);
