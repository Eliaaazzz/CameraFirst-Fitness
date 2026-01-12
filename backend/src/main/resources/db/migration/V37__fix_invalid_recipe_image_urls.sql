-- Fix invalid Unsplash image URLs that return 404
-- These images were removed or moved by Unsplash

-- Beef & Broccoli Bowl: old photo-1541544744-378c545f1bfa was 404
UPDATE recipe SET image_url = 'https://images.unsplash.com/photo-1603073163308-9654c3fb70b5?auto=format&fit=crop&w=800&q=80'
WHERE image_url LIKE '%photo-1541544744-378c545f1bfa%';

-- Avocado Toast with Poached Egg: old photo-1525351484163-7529414395d8 was 404
UPDATE recipe SET image_url = 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?auto=format&fit=crop&w=800&q=80'
WHERE image_url LIKE '%photo-1525351484163-7529414395d8%';

-- Tuna Salad Lettuce Wraps: old photo-1547496502-ffa2264a36b5 was 404
UPDATE recipe SET image_url = 'https://images.unsplash.com/photo-1529059997568-3d847b1154f0?auto=format&fit=crop&w=800&q=80'
WHERE image_url LIKE '%photo-1547496502-ffa2264a36b5%';

-- Lentil Soup: old photo-1547592166-23acbe3a624b was 404
UPDATE recipe SET image_url = 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&w=800&q=80'
WHERE image_url LIKE '%photo-1547592166-23acbe3a624b%';
