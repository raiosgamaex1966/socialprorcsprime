
-- Remove admin role from demo user (user@demo.com)
DELETE FROM public.user_roles WHERE user_id = '119d93d5-472e-4ac8-a398-5a31230f8fef';

-- Add moderator role to moderator@demo.com if user exists
INSERT INTO public.user_roles (user_id, role)
SELECT 'd5009348-9829-41dc-8ffe-bda9c6894068', 'moderator'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = 'd5009348-9829-41dc-8ffe-bda9c6894068')
ON CONFLICT (user_id, role) DO NOTHING;

-- Clean up: remove admin from other non-admin test users
DELETE FROM public.user_roles WHERE user_id = 'f9d92631-f55a-4395-93c6-996e931ac549';
DELETE FROM public.user_roles WHERE user_id = '599199cf-a358-4c23-85ca-e68ef9dae4ff';
