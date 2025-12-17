-- PART 1: FIX DELETE FUNCTIONALITY
-- The main reason delete fails is likely due to foreign key constraints on 'message_reactions'.
-- We need to ensure that when a message is deleted, its reactions are also deleted (CASCADE).

ALTER TABLE public.message_reactions
DROP CONSTRAINT IF EXISTS message_reactions_message_id_fkey;

ALTER TABLE public.message_reactions
ADD CONSTRAINT message_reactions_message_id_fkey
FOREIGN KEY (message_id) REFERENCES public.messages(id)
ON DELETE CASCADE;


-- PART 2: CLEAN UP DUPLICATE POLICIES (Fixes "Multiple Permissive Policies" Warnings)
-- You seem to have duplicate policies (e.g., one from the template, one manually added).
-- We will consolidate them for 'messages'.

-- 2a. Messages Table Cleanup
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
DROP POLICY IF EXISTS "Messages are readable by everyone" ON public.messages;
DROP POLICY IF EXISTS "Users can read messages in their channels" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Re-create consolidated, optimized policies (Fixes "Auth RLS Initialization Plan" Warnings)
-- specific optimization: using (select auth.uid()) instead of auth.uid() avoids re-evaluation per row

CREATE POLICY "Messages are readable by everyone"
ON public.messages FOR SELECT
USING (true); -- Or keep your channel check if specifically required, but 'readable by everyone' implies public.

CREATE POLICY "Users can insert their own messages"
ON public.messages FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.messages FOR DELETE
USING ((select auth.uid()) = user_id);


-- PART 3: OPTIONAL - REPEAT FOR OTHER TABLES IF NEEDED
-- (Channels, Profiles, etc. follow the same pattern of dropping duplicates and recreating with (select auth.uid()))
