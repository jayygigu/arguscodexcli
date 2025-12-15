-- Seed an initial super admin user
-- Replace 'YOUR_USER_ID' with the actual user ID from auth.users
-- You can find this by checking your Supabase Auth dashboard

-- Example: Insert a super admin (replace the UUID with your actual user ID)
-- INSERT INTO admin_users (user_id, role, permissions)
-- VALUES (
--   'your-user-uuid-here',
--   'super_admin',
--   '{"can_verify": true, "can_block": true, "can_unblock": true, "can_delete": true}'::jsonb
-- );

-- To find your user ID, run this query after logging in:
-- SELECT id, email FROM auth.users WHERE email = 'your-admin-email@example.com';
