-- Run this in your Supabase SQL Editor to get a complete overview of your database structure and policies.
-- It will return a JSON object. Copy the output and paste it back to me.

WITH table_info AS (
    SELECT 
        t.table_name,
        jsonb_agg(jsonb_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'is_nullable', c.is_nullable
        )) as columns
    FROM 
        information_schema.tables t
    JOIN 
        information_schema.columns c ON t.table_name = c.table_name
    WHERE 
        t.table_schema = 'public'
    GROUP BY 
        t.table_name
),
policy_info AS (
    SELECT 
        tablename,
        jsonb_agg(jsonb_build_object(
            'policyname', policyname,
            'cmd', cmd,
            'roles', roles,
            'qual', qual,
            'with_check', with_check
        )) as policies
    FROM 
        pg_policies
    WHERE 
        schemaname = 'public'
    GROUP BY 
        tablename
)
SELECT 
    jsonb_build_object(
        'timestamp', now(),
        'tables', (
            SELECT jsonb_object_agg(t.table_name, jsonb_build_object(
                'columns', t.columns,
                'policies', COALESCE(p.policies, '[]'::jsonb)
            ))
            FROM table_info t
            LEFT JOIN policy_info p ON t.table_name = p.tablename
        )
    ) as database_schema;
