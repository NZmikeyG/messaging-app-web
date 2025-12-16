-- FIX PERMISSIONS (Run this in Supabase SQL Editor)

-- 1. Allow authenticated users to update their own record in the 'users' table
-- This fixes the "403 Forbidden" errors seen in the console.
CREATE POLICY "Users can update their own user record"
ON public.users
FOR UPDATE
TO public
USING (auth.uid() = id);

-- 2. Allow authenticated users to insert their own record in 'users' table
-- Needed if the user record doesn't exist yet.
CREATE POLICY "Users can insert their own user record"
ON public.users
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

-- 3. Ensure profiles table policies are correct (Idempotent: this might fail if exists, which is fine)
-- We want to make sure the primary table we are now using ('profiles') is definitely writable.
CREATE POLICY "Users can update their own profile (explicit)"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = id);
