-- Seed default API key for mobile app development
-- This matches the API_KEY configured in frontend/.env.development

-- Insert the default API key linked to the demo beginner user
INSERT INTO api_key (key_value, name, tenant_id, enabled, created_at)
SELECT 
    'mobile-app-default-key-2024-fitness',
    'Mobile App Development Key',
    id::text,
    true,
    NOW()
FROM users 
WHERE email = 'demo+beginner@fitnessapp.com'
ON CONFLICT (key_value) DO NOTHING;
