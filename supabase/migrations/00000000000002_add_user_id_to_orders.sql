-- Add user_id to orders for per-user history (nullable for guest orders)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS user_id UUID NULL;

-- Optional: reference to auth.users (cannot add FK directly in Supabase to auth schema by default)
-- You may track user_id without FK

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Update RLS policy now that user_id column exists
DROP POLICY IF EXISTS "Users can view only their orders" ON orders;
CREATE POLICY "Users can view only their orders" 
ON orders FOR SELECT 
USING (auth.uid() IS NOT NULL AND user_id IS NOT NULL AND user_id = auth.uid());
