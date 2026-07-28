-- 1. Create the new table for surgery types
CREATE TABLE IF NOT EXISTS public.surgery_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add RLS policies for the new table
ALTER TABLE public.surgery_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.surgery_types
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON public.surgery_types
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON public.surgery_types
    FOR DELETE USING (true);

CREATE POLICY "Enable update for all users" ON public.surgery_types
    FOR UPDATE USING (true);

-- 3. Add the new column to the surgeries table
ALTER TABLE public.surgeries
ADD COLUMN IF NOT EXISTS surgery_type TEXT;
