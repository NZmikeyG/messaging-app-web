-- Allow users to delete their own messages
-- Run this in the Supabase Dashboard SQL Editor

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
USING (auth.uid() = user_id);
