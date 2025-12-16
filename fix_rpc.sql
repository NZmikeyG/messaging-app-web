-- Drop the existing function to recreate it with correct parameter types
DROP FUNCTION IF EXISTS public.get_channel_hierarchy(uuid);
DROP FUNCTION IF EXISTS public.get_channel_hierarchy(character varying);
DROP FUNCTION IF EXISTS public.get_channel_hierarchy(text);

-- Recreate the function accepting TEXT (which handles UUIDs and VARCHARs safely)
CREATE OR REPLACE FUNCTION public.get_channel_hierarchy(workspace_id_param text)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    is_private boolean,
    parent_id uuid,
    created_at timestamptz,
    creator_id uuid,
    depth integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE channel_tree AS (
        -- Base case: Top-level channels
        SELECT 
            c.id,
            c.name::text,
            c.description::text,
            c.is_private,
            c.parent_id,
            c.created_at,
            c.creator_id,
            0 as depth
        FROM channels c
        WHERE c.workspace_id = workspace_id_param::uuid
        AND c.parent_id IS NULL
        
        UNION ALL
        
        -- Recursive case: Child channels
        SELECT 
            c.id,
            c.name::text,
            c.description::text,
            c.is_private,
            c.parent_id,
            c.created_at,
            c.creator_id,
            ct.depth + 1
        FROM channels c
        INNER JOIN channel_tree ct ON c.parent_id = ct.id
    )
    SELECT * FROM channel_tree
    ORDER BY created_at ASC;
END;
$$;
