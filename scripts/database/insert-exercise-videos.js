/**
 * Insert Exercise Videos to Postgres (Supabase compatible)
 * 将练习视频数据插入到 PostgreSQL（兼容 Supabase）
 */

import pg from 'pg';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env files (best-effort): .env.local -> .env.supabase -> .env
for (const envFile of ['.env.local', '.env.supabase', '.env']) {
  dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });
}

// Exercise data
const exercises = [
  // Plank
  { slug: 'plank', name: 'Plank', url: 'https://youtube.com/shorts/Pkp3SOvipZ0?si=JCVsJ3wFW-ClgtJU', youtubeId: 'Pkp3SOvipZ0', r2Key: 'exercises/plank/Pkp3SOvipZ0.mp4', primary: 'Core', secondary: 'Shoulders' },
  { slug: 'plank', name: 'Plank', url: 'https://youtube.com/shorts/xe2MXatLTUw?si=ZBx7EbqxaAyfr0kO', youtubeId: 'xe2MXatLTUw', r2Key: 'exercises/plank/xe2MXatLTUw.mp4', primary: 'Core', secondary: 'Shoulders' },
  
  // Lunge
  { slug: 'lunge', name: 'Lunge', url: 'https://youtube.com/shorts/BYe4uyGF-h4?si=XNpHlrNSe1tmmvOQ', youtubeId: 'BYe4uyGF-h4', r2Key: 'exercises/lunge/BYe4uyGF-h4.mp4', primary: 'Legs', secondary: 'Glutes' },
  
  // Squat
  { slug: 'squat', name: 'Squat', url: 'https://youtube.com/shorts/CsPAsICeRsM?si=O6VvUfDkRMAozKph', youtubeId: 'CsPAsICeRsM', r2Key: 'exercises/squat/CsPAsICeRsM.mp4', primary: 'Legs', secondary: 'Glutes' },
  
  // Push up
  { slug: 'push-up', name: 'Push up', url: 'https://youtube.com/shorts/EiCjxcfBAPQ?si=Xt81UfrvAHYlr1qm', youtubeId: 'EiCjxcfBAPQ', r2Key: 'exercises/push-up/EiCjxcfBAPQ.mp4', primary: 'Chest', secondary: 'Arms' },
  { slug: 'push-up', name: 'Push up', url: 'https://youtube.com/shorts/A2bs-JzC3Qk?si=PVjVodLHtCn6s_PV', youtubeId: 'A2bs-JzC3Qk', r2Key: 'exercises/push-up/A2bs-JzC3Qk.mp4', primary: 'Chest', secondary: 'Arms' },
  
  // Pectoral fly machine
  { slug: 'pectoral-fly-machine', name: 'Pectoral fly machine', url: 'https://youtube.com/shorts/fEdkcOlW8EA?si=Wwd3RKjveIHQL8xC', youtubeId: 'fEdkcOlW8EA', r2Key: 'exercises/pectoral-fly-machine/fEdkcOlW8EA.mp4', primary: 'Chest', secondary: 'Shoulders' },
  { slug: 'pectoral-fly-machine', name: 'Pectoral fly machine', url: 'https://youtube.com/shorts/qTxF0PhK294?si=7jRKhGGMG7koLd1C', youtubeId: 'qTxF0PhK294', r2Key: 'exercises/pectoral-fly-machine/qTxF0PhK294.mp4', primary: 'Chest', secondary: 'Shoulders' },
  { slug: 'pectoral-fly-machine', name: 'Pectoral fly machine', url: 'https://youtube.com/shorts/u3KFH5s3Iyo?si=s50B4OjD8ziyyPt2', youtubeId: 'u3KFH5s3Iyo', r2Key: 'exercises/pectoral-fly-machine/u3KFH5s3Iyo.mp4', primary: 'Chest', secondary: 'Shoulders' },
  
  // Lateral raise
  { slug: 'lateral-raise', name: 'Lateral raise', url: 'https://youtube.com/shorts/U2gMn8GXr2A?si=kObd5mWHHqOGVV0g', youtubeId: 'U2gMn8GXr2A', r2Key: 'exercises/lateral-raise/U2gMn8GXr2A.mp4', primary: 'Shoulders', secondary: null },
  { slug: 'lateral-raise', name: 'Lateral raise', url: 'https://youtube.com/shorts/G-piLwLu0d4?si=KsaIatLIEW3LcEsN', youtubeId: 'G-piLwLu0d4', r2Key: 'exercises/lateral-raise/G-piLwLu0d4.mp4', primary: 'Shoulders', secondary: null },
  { slug: 'lateral-raise', name: 'Lateral raise', url: 'https://youtube.com/shorts/lMJUXEvcMkQ?si=hFxkBqp0UUQ8G4Oq', youtubeId: 'lMJUXEvcMkQ', r2Key: 'exercises/lateral-raise/lMJUXEvcMkQ.mp4', primary: 'Shoulders', secondary: null },
  
  // Abductor
  { slug: 'abductor', name: 'Abductor', url: 'https://youtube.com/shorts/QSsTDz32y_w?si=SwFgEfBD9Pi1ztVe', youtubeId: 'QSsTDz32y_w', r2Key: 'exercises/abductor/QSsTDz32y_w.mp4', primary: 'Glutes', secondary: 'Legs' },
  
  // Dip assist
  { slug: 'dip-assist', name: 'Dip assist', url: 'https://youtube.com/shorts/s57YI3rmc5Q?si=LVxdJwgkofIRH08S', youtubeId: 's57YI3rmc5Q', r2Key: 'exercises/dip-assist/s57YI3rmc5Q.mp4', primary: 'Arms', secondary: 'Chest' },
  
  // Chin assist
  { slug: 'chin-assist', name: 'Chin assist', url: 'https://youtube.com/shorts/75tpN6zeR8U?si=vh3MEwXaaeNsG_5K', youtubeId: '75tpN6zeR8U', r2Key: 'exercises/chin-assist/75tpN6zeR8U.mp4', primary: 'Back', secondary: 'Arms' },
  
  // Shoulder press
  { slug: 'shoulder-press', name: 'Shoulder press', url: 'https://youtube.com/shorts/6v4nrRVySj0?si=i538YqL0U48I9cQ_', youtubeId: '6v4nrRVySj0', r2Key: 'exercises/shoulder-press/6v4nrRVySj0.mp4', primary: 'Shoulders', secondary: 'Arms' },
  { slug: 'shoulder-press', name: 'Shoulder press', url: 'https://youtube.com/shorts/BGlB8hN-4CI?si=SDx6cwGeUxOE25ve', youtubeId: 'BGlB8hN-4CI', r2Key: 'exercises/shoulder-press/BGlB8hN-4CI.mp4', primary: 'Shoulders', secondary: 'Arms' },
  
  // Ab crunch
  { slug: 'ab-crunch', name: 'Ab crunch', url: 'https://youtube.com/shorts/b6ONE9Rfgl8?si=Bvw9RNoIvAlSGdxx', youtubeId: 'b6ONE9Rfgl8', r2Key: 'exercises/ab-crunch/b6ONE9Rfgl8.mp4', primary: 'Core', secondary: null },
  
  // Leg curl
  { slug: 'leg-curl', name: 'Leg curl', url: 'https://youtube.com/shorts/iQ92TuvBqRo?si=ltZJUXN5RawP3akC', youtubeId: 'iQ92TuvBqRo', r2Key: 'exercises/leg-curl/iQ92TuvBqRo.mp4', primary: 'Legs', secondary: 'Glutes' },
  
  // Leg extension
  { slug: 'leg-extension', name: 'Leg extension', url: 'https://youtube.com/shorts/ZgmufzNpEPk?si=uugqSAOvvgaeTVep', youtubeId: 'ZgmufzNpEPk', r2Key: 'exercises/leg-extension/ZgmufzNpEPk.mp4', primary: 'Legs', secondary: null },
  
  // Chest press
  { slug: 'chest-press', name: 'Chest press', url: 'https://youtube.com/shorts/2awX3rTGa1k?si=JB1vE7Ur1keYd2QW', youtubeId: '2awX3rTGa1k', r2Key: 'exercises/chest-press/2awX3rTGa1k.mp4', primary: 'Chest', secondary: 'Arms' },
  { slug: 'chest-press', name: 'Chest press', url: 'https://youtube.com/shorts/YXjhMV7uz4c?si=s6LK138s_uv3Hw1_', youtubeId: 'YXjhMV7uz4c', r2Key: 'exercises/chest-press/YXjhMV7uz4c.mp4', primary: 'Chest', secondary: 'Arms' },
  
  // Dumbbell chest press
  { slug: 'dumbbell-chest-press', name: 'Dumbbell chest press', url: 'https://youtube.com/shorts/Cj96ZZlmJRU?si=eUPK7RALRyRnvxJG', youtubeId: 'Cj96ZZlmJRU', r2Key: 'exercises/dumbbell-chest-press/Cj96ZZlmJRU.mp4', primary: 'Chest', secondary: 'Arms' },
  
  // Linear leg press
  { slug: 'linear-leg-press', name: 'Linear leg press', url: 'https://youtube.com/shorts/BnacvXdaxq8?si=SM42LQyOuFWaYKvW', youtubeId: 'BnacvXdaxq8', r2Key: 'exercises/linear-leg-press/BnacvXdaxq8.mp4', primary: 'Legs', secondary: 'Glutes' },
  
  // Dual pulley pulldown
  { slug: 'dual-pulley-pulldown', name: 'Dual pulley pulldown', url: 'https://youtube.com/shorts/9GEzZkSHHYI?si=WXz0hRW0cKsAhIeR', youtubeId: '9GEzZkSHHYI', r2Key: 'exercises/dual-pulley-pulldown/9GEzZkSHHYI.mp4', primary: 'Back', secondary: 'Arms' },
  { slug: 'dual-pulley-pulldown', name: 'Dual pulley pulldown', url: 'https://youtube.com/shorts/ZwF1N_dOlus?si=Kl-Jwkv3x-pY_f7Q', youtubeId: 'ZwF1N_dOlus', r2Key: 'exercises/dual-pulley-pulldown/ZwF1N_dOlus.mp4', primary: 'Back', secondary: 'Arms' },
  
  // Seated row
  { slug: 'seated-row', name: 'Seated row', url: 'https://youtube.com/shorts/DHA7QGDa2qg?si=8uqJQei6fMRY6wYx', youtubeId: 'DHA7QGDa2qg', r2Key: 'exercises/seated-row/DHA7QGDa2qg.mp4', primary: 'Back', secondary: 'Arms' },
  { slug: 'seated-row', name: 'Seated row', url: 'https://youtube.com/shorts/qD1WZ5pSuvk?si=qMnPL-toCHSzuhYx', youtubeId: 'qD1WZ5pSuvk', r2Key: 'exercises/seated-row/qD1WZ5pSuvk.mp4', primary: 'Back', secondary: 'Arms' },
  
  // Dual adjustable pulley
  { slug: 'dual-adjustable-pulley', name: 'Dual adjustable pulley', url: 'https://youtube.com/shorts/em0ITdNJng4?si=5XIq42coP6y1r_hd', youtubeId: 'em0ITdNJng4', r2Key: 'exercises/dual-adjustable-pulley/em0ITdNJng4.mp4', primary: 'Back', secondary: 'Arms' },
  
  // Triceps extension
  { slug: 'triceps-extension', name: 'Triceps extension', url: 'https://youtube.com/shorts/4NWWB0f0vzQ?si=r4DsiwgmrNYId726', youtubeId: '4NWWB0f0vzQ', r2Key: 'exercises/triceps-extension/4NWWB0f0vzQ.mp4', primary: 'Arms', secondary: null },
  
  // Arm curl
  { slug: 'arm-curl', name: 'Arm curl', url: 'https://youtube.com/shorts/j1FjaWu5Am4?si=I0fZnRMbGDgr9Wfw', youtubeId: 'j1FjaWu5Am4', r2Key: 'exercises/arm-curl/j1FjaWu5Am4.mp4', primary: 'Arms', secondary: null }
];

async function promptPassword() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Enter DB password: ', (password) => {
      rl.close();
      resolve(password.trim()); // Trim whitespace
    });
  });
}

async function main() {
  console.log('🚀 Exercise Videos Importer (Postgres)\n');

  const host = process.env.PGHOST || process.env.SUPABASE_DB_HOST;
  const port = Number(process.env.PGPORT || process.env.SUPABASE_DB_PORT || 5432);
  const database = process.env.PGDATABASE || process.env.SUPABASE_DB_NAME || 'postgres';
  const user = process.env.PGUSER || process.env.SUPABASE_DB_USER || 'postgres';

  // Get password (env first, then prompt)
  const password = process.env.PGPASSWORD || process.env.SUPABASE_DB_PASSWORD || (await promptPassword());
  
  if (!password || password.length === 0) {
    console.error('❌ Password is required');
    process.exit(1);
  }

  if (!host) {
    console.error('❌ Missing DB host. Set PGHOST (recommended) or SUPABASE_DB_HOST.');
    process.exit(1);
  }

  const pool = new Pool({
    host,
    port,
    database,
    user,
    password,
    // Supabase requires SSL in most setups; this is safe for managed Postgres as well.
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Test connection
    console.log('📡 Testing connection to Postgres...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully!\n');

    // Insert exercises
    console.log(`📥 Inserting ${exercises.length} exercise videos...`);
    
    let inserted = 0;
    let updated = 0;

    for (const ex of exercises) {
      const result = await pool.query(`
        INSERT INTO exercise_videos (
          id, exercise_slug, exercise_name, video_url, youtube_id, r2_key, 
          platform, is_short, primary_category, secondary_category
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (youtube_id) DO UPDATE SET
          exercise_name = EXCLUDED.exercise_name,
          video_url = EXCLUDED.video_url,
          primary_category = EXCLUDED.primary_category,
          secondary_category = EXCLUDED.secondary_category,
          updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
      `, [
        ex.slug, ex.name, ex.url, ex.youtubeId, ex.r2Key,
        'youtube', true, ex.primary, ex.secondary
      ]);

      if (result.rows[0].inserted) {
        inserted++;
        console.log(`  ✅ Inserted: ${ex.name} (${ex.youtubeId})`);
      } else {
        updated++;
        console.log(`  🔄 Updated: ${ex.name} (${ex.youtubeId})`);
      }
    }

    console.log(`\n✨ Success!`);
    console.log(`   - Inserted: ${inserted} new records`);
    console.log(`   - Updated: ${updated} existing records`);

    // Show statistics
    const stats = await pool.query(`
      SELECT 
        primary_category,
        COUNT(*) as count
      FROM exercise_videos
      GROUP BY primary_category
      ORDER BY primary_category
    `);

    console.log('\n📊 Database Statistics:');
    stats.rows.forEach(row => {
      console.log(`   ${row.primary_category}: ${row.count} videos`);
    });

    const total = await pool.query('SELECT COUNT(*) as total FROM exercise_videos');
    console.log(`\n   Total: ${total.rows[0].total} videos in database`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
