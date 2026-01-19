-- Add missing column for stock assignment date
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS cikis_tarihi TIMESTAMP WITH TIME ZONE;

-- Also ensure 'musteri_id' exists as it is used in the same update
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS musteri_id UUID REFERENCES public.leads(id);
