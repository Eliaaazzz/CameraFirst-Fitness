#!/usr/bin/env node
/**
 * sync-recipe-images-to-r2.mjs
 * 
 * 下载 Spoonacular recipe 图片并上传到 Cloudflare R2
 * 然后更新数据库中的 r2_image_key
 * 
 * R2 Key 格式: recipes/{spoonacular_id}.jpg
 */

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { resolve } from 'path';
import pg from 'pg';

dotenv.config({ path: resolve('..', '.env'), override: true });

// ============================================================
// Configuration
// ============================================================
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const pool = new pg.Pool({
  host: process.env.PGHOST || process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432'),
  database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'fitness_mvp',
  user: process.env.PGUSER || process.env.POSTGRES_USER || 'fitnessuser',
  password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
});

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// ============================================================
// Helper Functions
// ============================================================

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download: ${res.status}`);
  }
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}

async function r2ObjectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadToR2(key, buffer, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
}

// ============================================================
// Main Sync Function
// ============================================================

async function main() {
  console.log('═'.repeat(70));
  console.log('🖼️  Recipe Image Sync to R2');
  console.log('═'.repeat(70));
  console.log(`   R2 Bucket: ${R2_BUCKET_NAME}`);
  console.log(`   R2 Endpoint: ${R2_ENDPOINT}`);
  console.log('');

  // First, add r2_image_key column if not exists
  const client = await pool.connect();
  
  try {
    await client.query('ALTER TABLE recipe ADD COLUMN IF NOT EXISTS r2_image_key TEXT');
    console.log('   ✓ r2_image_key column ready\n');

    // Get recipes that need sync
    const result = await client.query(`
      SELECT id, title, spoonacular_id, image_url 
      FROM recipe 
      WHERE spoonacular_id IS NOT NULL 
        AND image_url IS NOT NULL 
        AND image_url <> ''
        AND (r2_image_key IS NULL OR r2_image_key = '')
      ORDER BY title
    `);

    console.log(`📋 Found ${result.rows.length} recipes to sync\n`);

    if (result.rows.length === 0) {
      console.log('✅ All recipes already synced!');
      return;
    }

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const recipe of result.rows) {
      const r2Key = `recipes/${recipe.spoonacular_id}.jpg`;
      process.stdout.write(`  [${recipe.spoonacular_id}] ${recipe.title.slice(0, 35).padEnd(35)} `);

      try {
        // Check if already exists in R2
        const exists = await r2ObjectExists(r2Key);
        
        if (exists) {
          // Just update DB
          await client.query(
            'UPDATE recipe SET r2_image_key = $1 WHERE id = $2',
            [r2Key, recipe.id]
          );
          console.log('⏭️  Already in R2');
          skipped++;
          continue;
        }

        // Download from Spoonacular
        const imageBuffer = await downloadImage(recipe.image_url);
        
        // Upload to R2
        await uploadToR2(r2Key, imageBuffer, 'image/jpeg');
        
        // Update DB
        await client.query(
          'UPDATE recipe SET r2_image_key = $1 WHERE id = $2',
          [r2Key, recipe.id]
        );

        console.log(`✅ Uploaded (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
        uploaded++;

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));

      } catch (err) {
        console.log(`❌ ${err.message.slice(0, 30)}`);
        failed++;
      }
    }

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('📊 Sync Summary');
    console.log('═'.repeat(70));
    console.log(`   ✅ Uploaded: ${uploaded}`);
    console.log(`   ⏭️  Skipped:  ${skipped} (already in R2)`);
    console.log(`   ❌ Failed:   ${failed}`);

    // Verify
    const verify = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(r2_image_key) as with_r2
      FROM recipe
      WHERE spoonacular_id IS NOT NULL
    `);
    
    console.log(`\n📦 Database Status:`);
    console.log(`   Total Spoonacular recipes: ${verify.rows[0].total}`);
    console.log(`   With R2 image key: ${verify.rows[0].with_r2}`);

    // Show sample
    const sample = await client.query(`
      SELECT title, spoonacular_id, r2_image_key
      FROM recipe 
      WHERE r2_image_key IS NOT NULL
      LIMIT 5
    `);
    
    console.log('\n📋 Sample R2 keys:');
    sample.rows.forEach(r => {
      console.log(`   • ${r.title.slice(0, 40)}`);
      console.log(`     → ${r.r2_image_key}`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
