-- Allow users to delete channels they created (using the correct column 'creator_id')
CREATE POLICY "Users can delete their own channels"
ON public.channels
FOR DELETE
USING (auth.uid() = creator_id);
