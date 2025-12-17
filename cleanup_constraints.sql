-- CLEANUP DUPLICATE CONSTRAINTS
-- You have two identical foreign keys, which is messy.
-- We will keep the standard one 'message_reactions_message_id_fkey' (which we know has CASCADE)
-- and remove the custom named one 'fk_message_reactions_message_id' to avoid confusion.

ALTER TABLE public.message_reactions
DROP CONSTRAINT IF EXISTS fk_message_reactions_message_id;

-- Verify strictly one remains:
SELECT
    conname AS constraint_name,
    definition
FROM pg_constraint
WHERE conrelid = 'public.message_reactions'::regclass;
