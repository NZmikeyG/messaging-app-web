-- FIX SUPABASE WARNINGS

-- 1. Fix "Function Search Path Mutable"
-- Security definer functions should have a fixed search_path to prevent hijacking.

ALTER FUNCTION public.get_channel_descendants(uuid)
SET search_path = public;

ALTER FUNCTION public.update_channels_timestamp()
SET search_path = public;


-- 2. Fix "RLS Enabled No Policy" (Optional but good practice)
-- These tables have RLS on but no policies, implying NO ONE can access them (which is secure default, but Supabase warns).
-- If you want to explicitly allow nothing:
CREATE POLICY "Deny all" ON public.admin_actions FOR ALL USING (false);
-- (You can repeat for other unused tables if you want to clear the logs, but it's not critical)
