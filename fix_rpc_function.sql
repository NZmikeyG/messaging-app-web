-- RECREATE get_channel_hierarchy WITH CLEAN SIGNATURE

-- Drop the old one to avoid overload confusion (it had 'text' param)
DROP FUNCTION IF EXISTS public.get_channel_hierarchy(text);
DROP FUNCTION IF EXISTS public.get_channel_hierarchy(uuid);

-- Create new version with standard 'p_workspace_id' name and 'uuid' type
CREATE OR REPLACE FUNCTION public.get_channel_hierarchy(p_workspace_id uuid)
 RETURNS TABLE(id uuid, name text, description text, is_private boolean, parent_id uuid, created_at timestamp with time zone, creator_id uuid, depth integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        WHERE c.workspace_id = p_workspace_id
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
$function$;
