#!/usr/bin/env node
/**
 * sync-recipe-images-to-s3.mjs
 *
 * Download Spoonacular recipe images and upload to AWS S3
 * Then update the image_url in the database
 *
 * S3 Key format: images/recipes/{spoonacular_id}.jpg
 */

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { resolve } from 'path';
import pg from 'pg';

dotenv.config({ path: resolve('..', '..', '.env'), override: true });

// ============================================================
// Configuration
// ============================================================
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;
const AWS_S3_REGION = process.env.AWS_S3_REGION || 'ap-southeast-2';

const pool = new pg.Pool({
  host: process.env.PGHOST || process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432'),
  database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'fitness_mvp',
  user: process.env.PGUSER || process.env.POSTGRES_USER || 'fitnessuser',
  password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
});

const s3 = new S3Client({
  region: AWS_S3_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

// ============================================================
// Helper Functions
// ============================================================

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`);
  }
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}

async function s3ObjectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: AWS_S3_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadToS3(key, buffer, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
}

// ============================================================
// Main Sync Function
// ============================================================

async function main() {
  console.log('='.repeat(70));
  console.log('Recipe Image Sync to AWS S3');
  console.log('='.repeat(70));
  console.log(`   S3 Bucket: ${AWS_S3_BUCKET}`);
  console.log(`   S3 Region: ${AWS_S3_REGION}`);
  console.log('');

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_S3_BUCKET) {
    console.error('Missing AWS configuration. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    // Get recipes with Spoonacular images that need syncing
    const result = await client.query(`
      SELECT id, title, spoonacular_id, image_url
      FROM recipe
      WHERE spoonacular_id IS NOT NULL
        AND image_url IS NOT NULL
        AND image_url LIKE '%spoonacular.com%'
      ORDER BY title
    `);

    console.log(`Found ${result.rows.length} recipes to sync\n`);

    if (result.rows.length === 0) {
      // Check if already synced
      const check = await client.query(`
        SELECT COUNT(*) as total,
               COUNT(*) FILTER (WHERE image_url LIKE '%s3.%amazonaws.com%') as on_s3
        FROM recipe
      `);
      console.log(`Already synced: ${check.rows[0].on_s3} / ${check.rows[0].total} recipes`);
      return;
    }

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const recipe of result.rows) {
      const s3Key = `images/recipes/${recipe.spoonacular_id}.jpg`;
      const s3Url = `https://${AWS_S3_BUCKET}.s3.${AWS_S3_REGION}.amazonaws.com/${s3Key}`;
      const shortTitle = recipe.title.slice(0, 35).padEnd(35);

      process.stdout.write(`  ${shortTitle} `);

      try {
        // Check if already exists in S3
        const exists = await s3ObjectExists(s3Key);

        if (exists) {
          // Update DB with S3 URL
          await client.query(
            'UPDATE recipe SET image_url = $1 WHERE id = $2',
            [s3Url, recipe.id]
          );
          console.log('Already in S3, updated URL');
          skipped++;
          continue;
        }

        // Download from Spoonacular
        const imageBuffer = await downloadImage(recipe.image_url);

        // Upload to S3
        await uploadToS3(s3Key, imageBuffer, 'image/jpeg');

        // Update DB with S3 URL
        await client.query(
          'UPDATE recipe SET image_url = $1 WHERE id = $2',
          [s3Url, recipe.id]
        );

        console.log(`Uploaded (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
        uploaded++;

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 150));

      } catch (err) {
        console.log(`FAILED: ${err.message.slice(0, 40)}`);
        failed++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('Sync Summary');
    console.log('='.repeat(70));
    console.log(`   Uploaded: ${uploaded}`);
    console.log(`   Skipped:  ${skipped} (already in S3)`);
    console.log(`   Failed:   ${failed}`);

    // Verify
    const verify = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE image_url LIKE '%s3.%amazonaws.com%') as on_s3,
             COUNT(*) FILTER (WHERE image_url LIKE '%spoonacular%') as on_spoonacular
      FROM recipe
    `);

    console.log(`\nDatabase Status:`);
    console.log(`   Total recipes: ${verify.rows[0].total}`);
    console.log(`   Using S3: ${verify.rows[0].on_s3}`);
    console.log(`   Still on Spoonacular: ${verify.rows[0].on_spoonacular}`);

    // Show sample URLs
    const samples = await client.query(`
      SELECT title, image_url
      FROM recipe
      WHERE image_url LIKE '%s3.%'
      LIMIT 3
    `);

    console.log('\nSample S3 URLs:');
    samples.rows.forEach(r => {
      console.log(`   ${r.title}`);
      console.log(`   -> ${r.image_url}`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
