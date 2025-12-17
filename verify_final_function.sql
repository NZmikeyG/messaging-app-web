-- VERIFY FUNCTION ARGUMENTS AGAIN
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
WHERE p.proname = 'get_channel_hierarchy';
