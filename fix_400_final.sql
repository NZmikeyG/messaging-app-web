-- FIX 400 BAD REQUEST & Column Error
-- The previous version failed because 'deleted_at' column does not exist in channels table
-- Also added 'SET search_path = public' to fix the security warning

DROP FUNCTION IF EXISTS public.get_channel_hierarchy(uuid);

CREATE OR REPLACE FUNCTION public.get_channel_hierarchy(p_workspace_id uuid)
RETURNS TABLE(
    id uuid,
    name text,
    description text,
    is_private boolean,
    parent_id uuid,
    type text,
    children jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Fixes "Function Search Path Mutable" warning
AS $$
DECLARE
    -- Variable to store the complete hierarchy
    v_result jsonb;
BEGIN
    RETURN QUERY
    WITH RECURSIVE channel_tree AS (
        -- Base case: Top-level channels
        SELECT 
            c.id, 
            c.name, 
            c.description, 
            c.is_private, 
            c.parent_id,
            'channel'::text as type,
            1 as depth,
            ARRAY[c.id] as path
        FROM channels c
        WHERE c.workspace_id = p_workspace_id 
          AND c.parent_id IS NULL
          -- Removed 'AND c.deleted_at IS NULL' because the column does not exist
        
        UNION ALL
        
        -- Recursive step
        SELECT 
            c.id, 
            c.name, 
            c.description, 
            c.is_private, 
            c.parent_id,
             'channel'::text as type,
            ct.depth + 1,
            path || c.id
        FROM channels c
        INNER JOIN channel_tree ct ON c.parent_id = ct.id
        -- Removed 'AND c.deleted_at IS NULL'
    )
    SELECT 
        ct.id, 
        ct.name, 
        ct.description, 
        ct.is_private, 
        ct.parent_id,
        ct.type,
        '[]'::jsonb
    FROM channel_tree ct
    ORDER BY path;
END;
$$;
