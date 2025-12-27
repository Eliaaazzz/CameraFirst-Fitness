#!/usr/bin/env node
/**
 * sync-workout-thumbnails-to-r2.mjs
 *
 * Download YouTube video thumbnails and upload to Cloudflare R2
 * Then update the r2_key to match the expected thumbnail path
 *
 * R2 Key format: videos/{slug}/{youtube_id}.jpg (thumbnail)
 * YouTube thumbnail URL: https://i.ytimg.com/vi/{youtube_id}/hqdefault.jpg
 */

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { resolve } from 'path';
import pg from 'pg';

dotenv.config({ path: resolve('..', '..', '.env'), override: true });

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

/**
 * Get YouTube thumbnail URL (highest quality available)
 */
function getYouTubeThumbnailUrl(youtubeId) {
  // Try maxresdefault first, fallback to hqdefault
  return `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`;
}

function getYouTubeThumbnailFallback(youtubeId) {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

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

/**
 * Download thumbnail with fallback to lower quality
 */
async function downloadThumbnail(youtubeId) {
  try {
    const maxResUrl = getYouTubeThumbnailUrl(youtubeId);
    const buffer = await downloadImage(maxResUrl);
    // YouTube returns a placeholder image for non-existent maxres
    // Check if it's too small (placeholder is usually < 5KB)
    if (buffer.length > 10000) {
      return buffer;
    }
  } catch {
    // Fallback to hqdefault
  }

  const fallbackUrl = getYouTubeThumbnailFallback(youtubeId);
  return downloadImage(fallbackUrl);
}

// ============================================================
// Main Sync Function
// ============================================================

async function main() {
  console.log('═'.repeat(70));
  console.log('🎬 Workout Video Thumbnail Sync to R2');
  console.log('═'.repeat(70));
  console.log(`   R2 Bucket: ${R2_BUCKET_NAME}`);
  console.log(`   R2 Endpoint: ${R2_ENDPOINT}`);
  console.log('');

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error('❌ Missing R2 configuration. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    // Get exercise videos
    const result = await client.query(`
      SELECT id, youtube_id, r2_key, exercise_name, exercise_slug
      FROM exercise_videos
      WHERE youtube_id IS NOT NULL
      ORDER BY exercise_name
    `);

    console.log(`📋 Found ${result.rows.length} exercise videos\n`);

    if (result.rows.length === 0) {
      console.log('✅ No videos to process!');
      return;
    }

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const video of result.rows) {
      // Generate thumbnail key from r2_key (replace .mp4 with .jpg)
      const thumbnailKey = video.r2_key.replace('.mp4', '.jpg');
      process.stdout.write(`  [${video.youtube_id}] ${video.exercise_name.slice(0, 30).padEnd(30)} `);

      try {
        // Check if thumbnail already exists in R2
        const exists = await r2ObjectExists(thumbnailKey);

        if (exists) {
          console.log('⏭️  Already in R2');
          skipped++;
          continue;
        }

        // Download from YouTube
        const imageBuffer = await downloadThumbnail(video.youtube_id);

        // Upload to R2
        await uploadToR2(thumbnailKey, imageBuffer, 'image/jpeg');

        console.log(`✅ Uploaded (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
        uploaded++;

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));

      } catch (err) {
        console.log(`❌ ${err.message.slice(0, 40)}`);
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
    console.log(`   📦 Total:    ${result.rows.length}`);

    // Show sample URLs
    console.log('\n📋 Sample thumbnail URLs:');
    const samples = result.rows.slice(0, 3);
    samples.forEach(v => {
      const thumbKey = v.r2_key.replace('.mp4', '.jpg');
      console.log(`   • ${v.exercise_name}`);
      console.log(`     → https://img.camera-first.dev/${thumbKey}`);
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
