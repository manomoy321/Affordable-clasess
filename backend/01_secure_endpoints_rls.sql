-- Secure Endpoints - Row Level Security (RLS) Policies
-- These policies secure your Supabase/InsForge database endpoints.

-- 1. Enable RLS on all relevant tables
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing permissive policies (if they exist)
-- Replace with actual policy names if they were named differently
DROP POLICY IF EXISTS "Enable read access for all users" ON chapters;
DROP POLICY IF EXISTS "Enable read access for all users" ON units;
DROP POLICY IF EXISTS "Enable read access for all users" ON resources;
DROP POLICY IF EXISTS "Enable read access for all users" ON videos;

-- 3. Create READ policies for Authenticated users only
-- This ensures unauthenticated requests via the API cannot read your chapters/units.
CREATE POLICY "Allow authenticated read chapters" ON chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read units" ON units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read resources" ON resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read videos" ON videos FOR SELECT TO authenticated USING (true);

-- 4. Create WRITE/UPDATE/DELETE policies for Admins only
-- Assuming you determine admins based on a specific role, metadata, or table.
-- Here we'll use a placeholder `auth.uid() IN (SELECT user_id FROM admins)` as an example.
-- If you only want the Service Role (backend) to write, you don't even need these policies since the Service Role bypasses RLS.

-- Example admin-only policies:
/*
CREATE POLICY "Admin full access chapters" ON chapters FOR ALL TO authenticated USING ( auth.jwt() ->> 'role' = 'admin' );
CREATE POLICY "Admin full access units" ON units FOR ALL TO authenticated USING ( auth.jwt() ->> 'role' = 'admin' );
CREATE POLICY "Admin full access resources" ON resources FOR ALL TO authenticated USING ( auth.jwt() ->> 'role' = 'admin' );
CREATE POLICY "Admin full access videos" ON videos FOR ALL TO authenticated USING ( auth.jwt() ->> 'role' = 'admin' );
*/

-- NOTE: If you are using offline-mock.js primarily, these policies only take effect on the live InsForge/Supabase database.
