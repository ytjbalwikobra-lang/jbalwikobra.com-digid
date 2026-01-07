-- =============================================================================
-- FIX is_admin FUNCTION - Remove profiles table reference
-- =============================================================================
-- The profiles table doesn't exist, causing errors
-- This removes that fallback and only checks users table
-- =============================================================================

BEGIN;

-- Drop policies that depend on the function first
DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
DROP POLICY IF EXISTS "products_update_admin" ON public.products;
DROP POLICY IF EXISTS "products_delete_admin" ON public.products;

-- Now drop and recreate the function without profiles table reference
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean AS $$
DECLARE
    user_is_admin boolean;
BEGIN
    -- Check users table by auth_user_id
    SELECT is_admin INTO user_is_admin
    FROM public.users
    WHERE auth_user_id = uid
    LIMIT 1;
    
    -- If found, return result
    IF FOUND THEN
        RETURN COALESCE(user_is_admin, false);
    END IF;
    
    -- Also check by id column (in case auth_user_id is not set)
    SELECT is_admin INTO user_is_admin
    FROM public.users
    WHERE id = uid
    LIMIT 1;
    
    IF FOUND THEN
        RETURN COALESCE(user_is_admin, false);
    END IF;
    
    -- No match found, return false
    RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.is_admin(uuid) IS 
'Checks if a user is an admin by looking up their auth UID in the users table. Returns true if user has is_admin=true.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon, service_role;

-- Recreate the policies with the fixed function
CREATE POLICY "products_insert_admin" 
ON public.products 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "products_update_admin" 
ON public.products 
FOR UPDATE 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "products_delete_admin" 
ON public.products 
FOR DELETE 
TO authenticated
USING (public.is_admin(auth.uid()));

COMMIT;

-- Test it
SELECT 
    'Testing is_admin function' as test,
    public.is_admin(auth.uid()) as result,
    auth.email() as your_email;
