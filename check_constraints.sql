-- CHECK CONSTRAINTS ON MESSAGES
-- Run this to see what Foreign Keys are on the messages table
-- This will help us find the name of the 'parent_id' constraint so we can fix it.

SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE conrelid = 'public.messages'::regclass;
