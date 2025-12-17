-- CHECK FUNCTION ARGUMENTS
-- We need to see exactly what arguments 'get_channel_hierarchy' expects.
-- A 400 error usually means we are passing the wrong argument name or type.

SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
WHERE p.proname = 'get_channel_hierarchy';
