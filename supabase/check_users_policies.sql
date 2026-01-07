-- Check current policies on users table
SELECT 
    tablename,
    policyname,
    cmd,
    qual::text as using_clause,
    with_check::text as with_check_clause
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
