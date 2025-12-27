#!/usr/bin/env node
/**
 * sync-workout-thumbnails-to-s3.mjs
 *
 * Download YouTube video thumbnails and upload to AWS S3
 *
 * S3 Key format: thumbnails/workouts/{youtube_id}.jpg
 * YouTube thumbnail URL: https://i.ytimg.com/vi/{youtube_id}/maxresdefault.jpg
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

/**
 * Get YouTube thumbnail URL (highest quality available)
 */
function getYouTubeThumbnailUrl(youtubeId) {
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
  console.log('🎬 Workout Video Thumbnail Sync to AWS S3');
  console.log('═'.repeat(70));
  console.log(`   S3 Bucket: ${AWS_S3_BUCKET}`);
  console.log(`   S3 Region: ${AWS_S3_REGION}`);
  console.log('');

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_S3_BUCKET) {
    console.error('❌ Missing AWS configuration. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    // Add thumbnail_url column if not exists
    await client.query('ALTER TABLE exercise_videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT');
    console.log('   ✓ thumbnail_url column ready\n');

    // Get exercise videos
    const result = await client.query(`
      SELECT id, youtube_id, r2_key, exercise_name, exercise_slug, thumbnail_url
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
      // Generate S3 key for thumbnail
      const s3Key = `thumbnails/workouts/${video.youtube_id}.jpg`;
      const thumbnailUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_S3_REGION}.amazonaws.com/${s3Key}`;

      process.stdout.write(`  [${video.youtube_id}] ${video.exercise_name.slice(0, 30).padEnd(30)} `);

      try {
        // Check if thumbnail already exists in S3
        const exists = await s3ObjectExists(s3Key);

        if (exists) {
          // Update DB with URL if not set
          if (!video.thumbnail_url) {
            await client.query(
              'UPDATE exercise_videos SET thumbnail_url = $1 WHERE id = $2',
              [thumbnailUrl, video.id]
            );
          }
          console.log('⏭️  Already in S3');
          skipped++;
          continue;
        }

        // Download from YouTube
        const imageBuffer = await downloadThumbnail(video.youtube_id);

        // Upload to S3
        await uploadToS3(s3Key, imageBuffer, 'image/jpeg');

        // Update DB with thumbnail URL
        await client.query(
          'UPDATE exercise_videos SET thumbnail_url = $1 WHERE id = $2',
          [thumbnailUrl, video.id]
        );

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
    console.log(`   ⏭️  Skipped:  ${skipped} (already in S3)`);
    console.log(`   ❌ Failed:   ${failed}`);
    console.log(`   📦 Total:    ${result.rows.length}`);

    // Show sample URLs
    const samples = await client.query(`
      SELECT exercise_name, youtube_id, thumbnail_url
      FROM exercise_videos
      WHERE thumbnail_url IS NOT NULL
      LIMIT 5
    `);

    console.log('\n📋 Sample thumbnail URLs:');
    samples.rows.forEach(v => {
      console.log(`   • ${v.exercise_name}`);
      console.log(`     → ${v.thumbnail_url}`);
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
