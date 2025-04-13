-- Create admin role
CREATE ROLE admin;

-- Grant admin permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO admin;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO admin;

-- Create admin user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  role
) VALUES (
  gen_random_uuid(),
  'admin@waynewagers.com',
  crypt('WayneAdmin2025!', gen_salt('bf')),
  now(),
  'admin'
);

-- Create admin profile
INSERT INTO public.profiles (
  id,
  username,
  regular_balance,
  sweeps_balance,
  vip_level
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@waynewagers.com'),
  'WayneAdmin',
  1000000,
  1000000,
  5
);