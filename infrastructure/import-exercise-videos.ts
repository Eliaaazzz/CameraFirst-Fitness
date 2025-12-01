/**
 * import-exercise-videos.ts
 *
 * Downloads exercise demo videos from YouTube and uploads to Cloudflare R2,
 * then upserts metadata into PostgreSQL.
 *
 * Environment variables (required in /.env):
 *   PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD - PostgreSQL connection
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY - Cloudflare R2
 *   R2_BUCKET_NAME - R2 bucket name (default: aurafitness-videos)
 *
 * Prerequisites:
 *   - yt-dlp installed: brew install yt-dlp (macOS) or pip install yt-dlp
 *   - ffmpeg installed: brew install ffmpeg (for video processing)
 *
 * Usage:
 *   npm run import:videos
 *   npm run import:videos -- --dry-run        # Show plan without executing
 *   npm run import:videos -- --category=Chest # Import only Chest exercises
 */

import {
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { execSync, spawn } from "child_process";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const { Pool } = pg;

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// Load environment variables
// ============================================================
const possibleEnvPaths = [
  path.resolve(__dirname, "../.env"),
  path.resolve(process.cwd(), ".env"),
];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`✅ Loaded environment from: ${envPath}`);
    break;
  }
}

// ============================================================
// Configuration
// ============================================================
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = R2_ACCOUNT_ID
  ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  : "";

const PGHOST = process.env.PGHOST || process.env.POSTGRES_HOST || "localhost";
const PGPORT = parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || "5432", 10);
const PGDATABASE = process.env.PGDATABASE || process.env.POSTGRES_DB || "fitness_mvp";
const PGUSER = process.env.PGUSER || process.env.POSTGRES_USER || "fitnessuser";
const PGPASSWORD = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;

const TEMP_DIR = path.join(__dirname, "../.temp-videos");

// ============================================================
// Embedded CSV Dataset
// ============================================================
const EXERCISE_CSV = `exercise_slug,exercise_name,video_url,platform,is_short,primary_category,secondary_category
plank,Plank,https://youtube.com/shorts/Pkp3SOvipZ0?si=JCVsJ3wFW-ClgtJU,youtube,TRUE,Core,Shoulders
plank,Plank,https://youtube.com/shorts/xe2MXatLTUw?si=ZBx7EbqxaAyfr0kO,youtube,TRUE,Core,Shoulders
lunge,Lunge,https://youtube.com/shorts/BYe4uyGF-h4?si=XNpHlrNSe1tmmvOQ,youtube,TRUE,Legs,Glutes
squat,Squat,https://youtube.com/shorts/CsPAsICeRsM?si=O6VvUfDkRMAozKph,youtube,TRUE,Legs,Glutes
push-up,Push up,https://youtube.com/shorts/EiCjxcfBAPQ?si=Xt81UfrvAHYlr1qm,youtube,TRUE,Chest,Arms
push-up,Push up,https://youtube.com/shorts/A2bs-JzC3Qk?si=PVjVodLHtCn6s_PV,youtube,TRUE,Chest,Arms
pectoral-fly-machine,Pectoral fly machine,https://youtube.com/shorts/fEdkcOlW8EA?si=Wwd3RKjveIHQL8xC,youtube,TRUE,Chest,Shoulders
pectoral-fly-machine,Pectoral fly machine,https://youtube.com/shorts/qTxF0PhK294?si=7jRKhGGMG7koLd1C,youtube,TRUE,Chest,Shoulders
pectoral-fly-machine,Pectoral fly machine,https://youtube.com/shorts/u3KFH5s3Iyo?si=s50B4OjD8ziyyPt2,youtube,TRUE,Chest,Shoulders
lateral-raise,Lateral raise,https://youtube.com/shorts/U2gMn8GXr2A?si=kObd5mWHHqOGVV0g,youtube,TRUE,Shoulders,
lateral-raise,Lateral raise,https://youtube.com/shorts/G-piLwLu0d4?si=KsaIatLIEW3LcEsN,youtube,TRUE,Shoulders,
lateral-raise,Lateral raise,https://youtube.com/shorts/lMJUXEvcMkQ?si=hFxkBqp0UUQ8G4Oq,youtube,TRUE,Shoulders,
abductor,Abductor,https://youtube.com/shorts/QSsTDz32y_w?si=SwFgEfBD9Pi1ztVe,youtube,TRUE,Glutes,Legs
dip-assist,Dip assist,https://youtube.com/shorts/s57YI3rmc5Q?si=LVxdJwgkofIRH08S,youtube,TRUE,Arms,Chest
chin-assist,Chin assist,https://youtube.com/shorts/75tpN6zeR8U?si=vh3MEwXaaeNsG_5K,youtube,TRUE,Back,Arms
shoulder-press,Shoulder press,https://youtube.com/shorts/6v4nrRVySj0?si=i538YqL0U48I9cQ_,youtube,TRUE,Shoulders,Arms
shoulder-press,Shoulder press,https://youtube.com/shorts/BGlB8hN-4CI?si=SDx6cwGeUxOE25ve,youtube,TRUE,Shoulders,Arms
ab-crunch,Ab crunch,https://youtube.com/shorts/b6ONE9Rfgl8?si=Bvw9RNoIvAlSGdxx,youtube,TRUE,Core,
leg-curl,Leg curl,https://youtube.com/shorts/iQ92TuvBqRo?si=ltZJUXN5RawP3akC,youtube,TRUE,Legs,Glutes
leg-extension,Leg extension,https://youtube.com/shorts/ZgmufzNpEPk?si=uugqSAOvvgaeTVep,youtube,TRUE,Legs,
chest-press,Chest press,https://youtube.com/shorts/2awX3rTGa1k?si=JB1vE7Ur1keYd2QW,youtube,TRUE,Chest,Arms
chest-press,Chest press,https://youtube.com/shorts/YXjhMV7uz4c?si=s6LK138s_uv3Hw1_,youtube,TRUE,Chest,Arms
dumbbell-chest-press,Dumbbell chest (press),https://youtube.com/shorts/Cj96ZZlmJRU?si=eUPK7RALRyRnvxJG,youtube,TRUE,Chest,Arms
linear-leg-press,Linear leg press,https://youtube.com/shorts/BnacvXdaxq8?si=SM42LQyOuFWaYKvW,youtube,TRUE,Legs,Glutes
dual-pulley-pulldown,Dual pulley pulldown,https://youtube.com/shorts/9GEzZkSHHYI?si=WXz0hRW0cKsAhIeR,youtube,TRUE,Back,Arms
dual-pulley-pulldown,Dual pulley pulldown,https://youtube.com/shorts/ZwF1N_dOlus?si=Kl-Jwkv3x-pY_f7Q,youtube,TRUE,Back,Arms
seated-row,Seated row,https://youtube.com/shorts/DHA7QGDa2qg?si=8uqJQei6fMRY6wYx,youtube,TRUE,Back,Arms
seated-row,Seated row,https://youtube.com/shorts/qD1WZ5pSuvk?si=qMnPL-toCHSzuhYx,youtube,TRUE,Back,Arms
dual-adjustable-pulley,Dual adjustable pulley,https://youtube.com/shorts/em0ITdNJng4?si=5XIq42coP6y1r_hd,youtube,TRUE,Back,Arms
triceps-extension,Triceps extension,https://youtube.com/shorts/4NWWB0f0vzQ?si=r4DsiwgmrNYId726,youtube,TRUE,Arms,
arm-curl,Arm curl,https://youtube.com/shorts/j1FjaWu5Am4?si=I0fZnRMbGDgr9Wfw,youtube,TRUE,Arms,`;

// ============================================================
// Types
// ============================================================
interface ExerciseVideo {
  exercise_slug: string;
  exercise_name: string;
  video_url: string;
  youtube_id: string;
  r2_key: string;
  platform: string;
  is_short: boolean;
  primary_category: string;
  secondary_category: string | null;
}

// ============================================================
// Parse CSV
// ============================================================
function parseCSV(csv: string): ExerciseVideo[] {
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",");
  const videos: ExerciseVideo[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const row: Record<string, string> = {};

    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() || "";
    });

    const youtubeId = extractYouTubeId(row.video_url);
    if (!youtubeId) {
      console.warn(`⚠️  Could not extract YouTube ID from: ${row.video_url}`);
      continue;
    }

    videos.push({
      exercise_slug: row.exercise_slug,
      exercise_name: row.exercise_name,
      video_url: row.video_url,
      youtube_id: youtubeId,
      r2_key: `videos/${row.exercise_slug}/${youtubeId}.mp4`,
      platform: row.platform || "youtube",
      is_short: row.is_short?.toUpperCase() === "TRUE",
      primary_category: row.primary_category,
      secondary_category: row.secondary_category || null,
    });
  }

  return videos;
}

function extractYouTubeId(url: string): string | null {
  // Handle various YouTube URL formats
  const patterns = [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// ============================================================
// Validate Environment
// ============================================================
function validateEnv(): { valid: boolean; missing: string[] } {
  const required = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
  ];

  // Check for PGPASSWORD or POSTGRES_PASSWORD
  const hasPgPassword = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;

  const missing = required.filter((key) => !process.env[key]);
  if (!hasPgPassword) {
    missing.push("PGPASSWORD or POSTGRES_PASSWORD");
  }
  return { valid: missing.length === 0, missing };
}

// ============================================================
// PostgreSQL Functions
// ============================================================
const CREATE_TABLE_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS exercise_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_slug TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    video_url TEXT NOT NULL,
    youtube_id TEXT NOT NULL UNIQUE,
    r2_key TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL DEFAULT 'youtube',
    is_short BOOLEAN NOT NULL DEFAULT FALSE,
    primary_category TEXT NOT NULL,
    secondary_category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_videos_slug ON exercise_videos(exercise_slug);
CREATE INDEX IF NOT EXISTS idx_exercise_videos_primary_category ON exercise_videos(primary_category);
`;

const UPSERT_SQL = `
INSERT INTO exercise_videos (
  exercise_slug,
  exercise_name,
  video_url,
  youtube_id,
  r2_key,
  platform,
  is_short,
  primary_category,
  secondary_category
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (youtube_id) DO UPDATE SET
  exercise_slug       = EXCLUDED.exercise_slug,
  exercise_name       = EXCLUDED.exercise_name,
  video_url           = EXCLUDED.video_url,
  r2_key              = EXCLUDED.r2_key,
  platform            = EXCLUDED.platform,
  is_short            = EXCLUDED.is_short,
  primary_category    = EXCLUDED.primary_category,
  secondary_category  = EXCLUDED.secondary_category,
  updated_at          = NOW()
RETURNING id;
`;

async function initDatabase(pool: pg.Pool): Promise<void> {
  console.log("📦 Initializing database schema...");
  await pool.query(CREATE_TABLE_SQL);
  console.log("   ✓ Table exercise_videos ready");
}

async function upsertVideo(pool: pg.Pool, video: ExerciseVideo): Promise<string> {
  const result = await pool.query(UPSERT_SQL, [
    video.exercise_slug,
    video.exercise_name,
    video.video_url,
    video.youtube_id,
    video.r2_key,
    video.platform,
    video.is_short,
    video.primary_category,
    video.secondary_category,
  ]);
  return result.rows[0].id;
}

// ============================================================
// R2 Functions
// ============================================================
function createS3Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

async function r2ObjectExists(s3: S3Client, key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadToR2(
  s3: S3Client,
  localPath: string,
  r2Key: string
): Promise<void> {
  const fileBuffer = fs.readFileSync(localPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      Body: fileBuffer,
      ContentType: "video/mp4",
    })
  );
}

// ============================================================
// YouTube Download Functions
// ============================================================
function checkYtDlp(): boolean {
  try {
    execSync("yt-dlp --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function downloadVideo(
  youtubeId: string,
  outputPath: string
): Promise<boolean> {
  const url = `https://www.youtube.com/shorts/${youtubeId}`;

  return new Promise((resolve) => {
    const args = [
      "-f",
      "best[ext=mp4]/best",
      "--merge-output-format",
      "mp4",
      "-o",
      outputPath,
      "--no-playlist",
      "--quiet",
      "--no-warnings",
      url,
    ];

    const proc = spawn("yt-dlp", args);

    proc.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    proc.on("error", () => {
      resolve(false);
    });
  });
}

// ============================================================
// Main Import Function
// ============================================================
async function importVideos(options: {
  dryRun: boolean;
  category?: string;
}): Promise<void> {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║        AuraFitness Exercise Video Importer                 ║
╠════════════════════════════════════════════════════════════╣
║  Mode: ${options.dryRun ? "DRY RUN (no changes)" : "LIVE IMPORT"}                               ║
║  R2 Bucket: ${R2_BUCKET_NAME.padEnd(42)}  ║
║  Database: ${PGDATABASE.padEnd(43)}  ║
╚════════════════════════════════════════════════════════════╝
`);

  // Validate environment
  const envCheck = validateEnv();
  if (!envCheck.valid && !options.dryRun) {
    console.error(`❌ Missing environment variables: ${envCheck.missing.join(", ")}`);
    process.exit(1);
  }

  // Check yt-dlp
  if (!options.dryRun && !checkYtDlp()) {
    console.error(`
❌ yt-dlp is not installed!

Install it with:
  macOS:   brew install yt-dlp
  Linux:   pip install yt-dlp
  Windows: pip install yt-dlp
`);
    process.exit(1);
  }

  // Parse CSV
  let videos = parseCSV(EXERCISE_CSV);
  console.log(`📋 Parsed ${videos.length} videos from embedded CSV\n`);

  // Filter by category if specified
  if (options.category) {
    videos = videos.filter(
      (v) =>
        v.primary_category.toLowerCase() === options.category!.toLowerCase() ||
        v.secondary_category?.toLowerCase() === options.category!.toLowerCase()
    );
    console.log(`🔍 Filtered to ${videos.length} videos for category: ${options.category}\n`);
  }

  // Show plan
  console.log("PLAN:");
  console.log("─".repeat(90));
  for (const v of videos) {
    const cat = v.secondary_category
      ? `${v.primary_category}/${v.secondary_category}`
      : v.primary_category;
    console.log(
      `  ${v.exercise_slug.padEnd(24)} ${v.youtube_id.padEnd(14)} ${cat.padEnd(16)} → ${v.r2_key}`
    );
  }
  console.log("─".repeat(90));
  console.log(`  TOTAL: ${videos.length} videos\n`);

  if (options.dryRun) {
    console.log("✅ Dry run complete. No changes made.");
    return;
  }

  // Create temp directory
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // Initialize connections
  const s3 = createS3Client();
  const pool = new Pool({
    host: PGHOST,
    port: PGPORT,
    database: PGDATABASE,
    user: PGUSER,
    password: PGPASSWORD,
  });

  try {
    await initDatabase(pool);

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    console.log("\n🚀 Starting import...\n");

    for (const video of videos) {
      process.stdout.write(`  [${video.youtube_id}] ${video.exercise_name.padEnd(30)} `);

      try {
        // Check if already in R2
        const existsInR2 = await r2ObjectExists(s3, video.r2_key);

        if (existsInR2) {
          // Just upsert to DB
          await upsertVideo(pool, video);
          console.log("○ Exists in R2, DB updated");
          skipped++;
          continue;
        }

        // Download from YouTube
        const localPath = path.join(TEMP_DIR, `${video.youtube_id}.mp4`);
        const downloaded = await downloadVideo(video.youtube_id, localPath);

        if (!downloaded) {
          console.log("✗ Download failed");
          failed++;
          continue;
        }

        // Upload to R2
        await uploadToR2(s3, localPath, video.r2_key);

        // Upsert to PostgreSQL
        await upsertVideo(pool, video);

        // Clean up temp file
        fs.unlinkSync(localPath);

        const fileSize = fs.existsSync(localPath)
          ? (fs.statSync(localPath).size / 1024 / 1024).toFixed(1)
          : "?";
        console.log(`✓ Uploaded (${fileSize} MB)`);
        uploaded++;
      } catch (error) {
        console.log(`✗ Error: ${error}`);
        failed++;
      }
    }

    // Clean up temp directory
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true });
    }

    console.log(`
╔════════════════════════════════════════════════════════════╗
║                    Import Complete                         ║
╠════════════════════════════════════════════════════════════╣
║  ✓ Uploaded: ${String(uploaded).padEnd(43)}  ║
║  ○ Skipped:  ${String(skipped).padEnd(43)}  ║
║  ✗ Failed:   ${String(failed).padEnd(43)}  ║
╚════════════════════════════════════════════════════════════╝

📍 Videos available at:
   R2: s3://${R2_BUCKET_NAME}/videos/{exercise_slug}/{youtube_id}.mp4
   
📊 Query database:
   SELECT * FROM exercise_videos ORDER BY primary_category, exercise_slug;
`);
  } finally {
    await pool.end();
  }
}

// ============================================================
// CLI
// ============================================================
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const categoryArg = args.find((a) => a.startsWith("--category="));
const category = categoryArg ? categoryArg.split("=")[1] : undefined;

if (args.includes("--help")) {
  console.log(`
Usage: npm run import:videos [options]

Options:
  --dry-run           Show plan without executing any changes
  --category=<name>   Import only videos for a specific category
                      (Chest, Back, Legs, Shoulders, Arms, Core, Glutes)
  --help              Show this help message

Environment Variables (required for live import):
  PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD - PostgreSQL connection
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY - Cloudflare R2
  R2_BUCKET_NAME - R2 bucket name (default: aurafitness-videos)

Examples:
  npm run import:videos -- --dry-run
  npm run import:videos -- --category=Chest
  npm run import:videos
`);
  process.exit(0);
}

importVideos({ dryRun, category });
