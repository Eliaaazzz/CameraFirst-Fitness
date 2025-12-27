#!/usr/bin/env node
/**
 * sync-recipe-images-b18a-to-r2.mjs
 *
 * Download recipe images from file.b18a.io and upload to Cloudflare R2
 * Then update the image_url column in the database
 *
 * R2 Key format: recipes/{uuid}.jpg
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
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://cdn.aurafitness.org';

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
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });
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

function getContentType(url) {
  if (url.endsWith('.png')) return 'image/png';
  if (url.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function getExtension(url) {
  if (url.endsWith('.png')) return 'png';
  if (url.endsWith('.webp')) return 'webp';
  return 'jpg';
}

// ============================================================
// Main Sync Function
// ============================================================

async function main() {
  console.log('═'.repeat(70));
  console.log('Recipe Image Sync to R2 (from file.b18a.io)');
  console.log('═'.repeat(70));
  console.log(`   R2 Bucket: ${R2_BUCKET_NAME}`);
  console.log(`   R2 Public URL: ${R2_PUBLIC_URL}`);
  console.log('');

  const client = await pool.connect();

  try {
    // Get recipes with b18a.io images
    const result = await client.query(`
      SELECT id, title, image_url
      FROM recipe
      WHERE image_url IS NOT NULL
        AND image_url LIKE '%file.b18a.io%'
      ORDER BY title
    `);

    console.log(`Found ${result.rows.length} recipes with b18a.io images\n`);

    if (result.rows.length === 0) {
      console.log('All recipes already using R2!');
      return;
    }

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const recipe of result.rows) {
      const ext = getExtension(recipe.image_url);
      const r2Key = `recipes/${recipe.id}.${ext}`;
      const shortTitle = recipe.title.slice(0, 35).padEnd(35);
      process.stdout.write(`  ${shortTitle} `);

      try {
        // Check if already exists in R2
        const exists = await r2ObjectExists(r2Key);

        if (exists) {
          // Just update DB with new URL
          const newUrl = `${R2_PUBLIC_URL}/${r2Key}`;
          await client.query(
            'UPDATE recipe SET image_url = $1 WHERE id = $2',
            [newUrl, recipe.id]
          );
          console.log('Already in R2, updated URL');
          skipped++;
          continue;
        }

        // Download from b18a.io
        const imageBuffer = await downloadImage(recipe.image_url);

        // Upload to R2
        const contentType = getContentType(recipe.image_url);
        await uploadToR2(r2Key, imageBuffer, contentType);

        // Update DB with new URL
        const newUrl = `${R2_PUBLIC_URL}/${r2Key}`;
        await client.query(
          'UPDATE recipe SET image_url = $1 WHERE id = $2',
          [newUrl, recipe.id]
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
    console.log('\n' + '═'.repeat(70));
    console.log('Sync Summary');
    console.log('═'.repeat(70));
    console.log(`   Uploaded: ${uploaded}`);
    console.log(`   Skipped:  ${skipped} (already in R2)`);
    console.log(`   Failed:   ${failed}`);

    // Verify
    const verify = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE image_url LIKE '%cdn.aurafitness%' OR image_url LIKE '%r2.cloudflarestorage%') as using_r2,
        COUNT(*) FILTER (WHERE image_url LIKE '%b18a.io%') as using_b18a
      FROM recipe
    `);

    console.log(`\nDatabase Status:`);
    console.log(`   Total recipes: ${verify.rows[0].total}`);
    console.log(`   Using R2: ${verify.rows[0].using_r2}`);
    console.log(`   Still on b18a.io: ${verify.rows[0].using_b18a}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
