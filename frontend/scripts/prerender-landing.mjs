/**
 * prerender-landing.mjs — inject static marketing content + SEO meta into the Expo web export.
 *
 * Why: `expo export --platform web` produces an empty SPA shell (`<div id="root"></div>` +
 * "You need to enable JavaScript"). Search engines, link-preview bots, no-JS/slow-network
 * visitors and some assistive tech therefore saw nothing at aurafitness.org. This script runs
 * after the export and prerenders the landing content directly into the HTML shell. When the
 * React app boots it replaces #root's children, so hydrated users see the full app; everyone
 * else still gets real content.
 *
 * Usage: node scripts/prerender-landing.mjs [path/to/dist/index.html]   (default: dist/index.html)
 * Idempotent: re-running replaces the previously injected block (marker: data-prerender).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '..', process.argv[2] ?? 'dist/index.html');

const TITLE = 'Metriful — AI meal scanner with depth-aware portions';
const DESCRIPTION =
  'Snap a meal and get an editable nutrition estimate. Metriful uses iPhone depth (LiDAR) to ' +
  'estimate portions, itemizes every food with a confidence level, and tells you the best next ' +
  'step for today. By Aura Fitness.';
const APP_STORE_URL = 'https://apps.apple.com/app/metriful/id6760930295';
const CANONICAL = 'https://aurafitness.org/';

const META = `
    <meta name="description" content="${DESCRIPTION}" />
    <link rel="canonical" href="${CANONICAL}" />
    <meta name="theme-color" content="#111111" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Metriful by Aura Fitness" />
    <meta property="og:title" content="${TITLE}" />
    <meta property="og:description" content="${DESCRIPTION}" />
    <meta property="og:url" content="${CANONICAL}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${TITLE}" />
    <meta name="twitter:description" content="${DESCRIPTION}" />`;

/* Styles are scoped under #prerender; the wrapper itself scrolls because the Expo reset sets
   body{overflow:hidden}. React removes the whole node on mount, taking the styles' target away. */
const CONTENT = `<div id="prerender" data-prerender="metriful">
<style>
  #prerender{height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;width:100%;
    font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#111;background:#fff}
  #prerender .wrap{max-width:960px;margin:0 auto;padding:0 20px}
  #prerender header{background:#000;color:#fff;padding:14px 0}
  #prerender header .wrap{display:flex;justify-content:space-between;align-items:baseline}
  #prerender .brand{font-weight:800;font-size:20px;letter-spacing:-.5px}
  #prerender .byline{color:#9ca3af;font-size:13px}
  #prerender h1{font-size:clamp(32px,6vw,52px);line-height:1.1;letter-spacing:-1.5px;margin:56px 0 16px;font-weight:800}
  #prerender .lede{color:#4b5563;font-size:18px;max-width:34em;margin:0 0 24px}
  #prerender .cta{display:inline-block;background:#000;color:#fff;font-weight:700;border-radius:8px;
    padding:14px 22px;text-decoration:none;margin:0 12px 12px 0}
  #prerender .cta.secondary{background:#fff;color:#000;border:1px solid #d1d5db}
  #prerender h2{font-size:clamp(24px,4vw,34px);letter-spacing:-.8px;margin:56px 0 8px;font-weight:800}
  #prerender .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin:20px 0}
  #prerender .card{background:#f6f6f6;border-radius:14px;padding:18px}
  #prerender .card h3{margin:0 0 6px;font-size:17px;letter-spacing:-.3px}
  #prerender .card p,#prerender .card li{color:#4b5563;font-size:14.5px;margin:0}
  #prerender .card.outline{background:#fff;border:1px solid #e5e7eb}
  #prerender ul{padding-left:18px;margin:8px 0}
  #prerender li{margin:4px 0;color:#4b5563}
  #prerender .fineprint{color:#9ca3af;font-size:13px}
  #prerender dl dt{font-weight:700;margin-top:16px}
  #prerender dl dd{margin:4px 0 0;color:#4b5563}
  #prerender footer{border-top:1px solid #e5e7eb;margin-top:64px;padding:28px 0 48px}
  #prerender footer nav{display:flex;flex-wrap:wrap;gap:16px;margin-bottom:12px}
  #prerender footer a{color:#111;text-decoration:underline;font-size:14px}
  #prerender .legal{color:#9ca3af;font-size:13px}
  @media (prefers-color-scheme:dark){
    #prerender{background:#111;color:#f3f4f6}
    #prerender .card{background:#1c1c1e}
    #prerender .card.outline{background:#111;border-color:#333}
    #prerender .cta{background:#fff;color:#000}
    #prerender .cta.secondary{background:#111;color:#fff;border-color:#444}
    #prerender .lede,#prerender .card p,#prerender .card li,#prerender li,#prerender dl dd{color:#9ca3af}
    #prerender footer a{color:#f3f4f6}
  }
</style>
<header><div class="wrap"><span class="brand">Metriful</span><span class="byline">by Aura Fitness</span></div></header>
<main class="wrap">
  <h1>Snap a meal.<br/>Get an editable nutrition estimate.</h1>
  <p class="lede">Depth-aware portions, itemized macros, and a clear next step. Metriful shows every
  food it found — grams, calories, confidence — so you can fix anything in one tap.</p>
  <p>
    <a class="cta" href="${APP_STORE_URL}">Download on the App Store</a>
    <a class="cta secondary" href="/">Open the web app</a>
  </p>

  <h2>From photo to logged meal</h2>
  <div class="grid">
    <div class="card"><h3>1 · Snap</h3><p>Point the camera at your plate. On LiDAR iPhones, depth measures the scene while you shoot.</p></div>
    <div class="card"><h3>2 · Review each food</h3><p>Every detected item is listed with grams, calories and a confidence level — no black-box total.</p></div>
    <div class="card"><h3>3 · Confirm in one tap</h3><p>High-confidence items pass by default; only uncertain ones ask you a quick question.</p></div>
    <div class="card"><h3>4 · Know what's next</h3><p>After each log: what's left today and one concrete suggestion — never a lecture.</p></div>
  </div>

  <h2 id="accuracy">How accuracy works</h2>
  <p class="lede">Nutrition from a photo is an estimate. We make it a good one — and we show our work.</p>
  <div class="grid">
    <div class="card"><h3>Identify</h3><p>A vision model names each food and its likely ingredients.</p></div>
    <div class="card"><h3>Portion</h3><p>Depth (LiDAR) measures your plate, so portions come from geometry — not a guess from a flat photo.</p></div>
    <div class="card"><h3>Nutrition</h3><p>Per-item calories and macros, cross-referenced against USDA FoodData Central.</p></div>
    <div class="card"><h3>You correct</h3><p>Everything is editable in one tap. Low-confidence items are flagged, never buried.</p></div>
  </div>
  <div class="grid">
    <div class="card outline"><h3>Where we're honest about limits</h3><ul>
      <li>Hidden oils, butter and dressings can be underestimated</li>
      <li>Mixed or stewed dishes are harder than separate items</li>
      <li>Foods hidden under other foods can be missed</li>
      <li>Shared plates need you to say how much was yours</li>
    </ul><p class="fineprint">When we're less sure, the item is marked for review instead of pretending precision.</p></div>
    <div class="card outline"><h3>Your photos, your data</h3><ul>
      <li>Meal photos are uploaded securely to build your log and stay attached to your account</li>
      <li>Deleting a meal removes its photo; deleting your account removes everything</li>
      <li>Every AI number is labeled as an estimate, with sources you can check</li>
    </ul><p class="fineprint">Details: <a href="/privacy-policy.html">Privacy Policy</a> · <a href="/data-deletion.html">Data Deletion</a></p></div>
  </div>

  <h2>Frequently asked questions</h2>
  <dl>
    <dt>How accurate is it?</dt>
    <dd>Portion size is the hardest part of photo nutrition. Metriful measures it with depth where
    available and keeps every number editable. Treat results as good estimates, not lab measurements.</dd>
    <dt>Do I need a LiDAR iPhone?</dt>
    <dd>No. Depth improves portion accuracy on iPhone Pro models; on other devices Metriful still
    itemizes your meal from the photo and you can adjust portions in one tap.</dd>
    <dt>What happens to my meal photos?</dt>
    <dd>They're uploaded securely to create your log and stay attached to your account until you
    delete the meal or the account. See the Data Deletion page for the full process.</dd>
    <dt>Is the glycemic estimate medical advice?</dt>
    <dd>No. It's a general estimate derived from carbohydrate content — not a personal blood-glucose
    prediction. Metriful provides general wellness information, not medical advice.</dd>
  </dl>
</main>
<footer><div class="wrap">
  <nav>
    <a href="/support.html">Support</a>
    <a href="/privacy-policy.html">Privacy Policy</a>
    <a href="/terms-of-service.html">Terms of Service</a>
    <a href="/data-deletion.html">Data Deletion</a>
    <a href="/accessibility.html">Accessibility</a>
    <a href="/release-notes.html">Release Notes</a>
    <a href="mailto:support@aurafitness.org">support@aurafitness.org</a>
  </nav>
  <p class="legal">© 2026 Metriful by Aura Fitness.</p>
</div></footer>
</div>`;

const NOSCRIPT =
  '<noscript><p style="margin:12px 20px;color:#6b7280;font:14px system-ui">' +
  'The interactive app needs JavaScript — but everything above is real. ' +
  `Get Metriful on the <a href="${APP_STORE_URL}">App Store</a>.</p></noscript>`;

if (!existsSync(target)) {
  console.error(`prerender-landing: ${target} not found — run "expo export --platform web" first.`);
  process.exit(1);
}

let html = readFileSync(target, 'utf8');

// 1. Title
html = html.replace(/<title>.*?<\/title>/s, `<title>${TITLE}</title>`);

// 2. Meta tags (replace previous injection when re-run)
html = html.replace(/\n?\s*<meta name="description"[\s\S]*?<meta name="twitter:description"[^>]*\/>/, '');
html = html.replace('</head>', `${META}\n  </head>`);

// 3. Prerendered content into #root. Idempotent via explicit comment markers — regex over the
//    nested-div content is not reliable, so do plain index surgery instead.
const START = '<!--PRERENDER:START-->';
const END = '<!--PRERENDER:END-->';
const startIdx = html.indexOf(START);
if (startIdx !== -1) {
  const endIdx = html.indexOf(END, startIdx);
  if (endIdx === -1) {
    console.error('prerender-landing: found START marker without END — refusing to edit.');
    process.exit(1);
  }
  html = html.slice(0, startIdx) + html.slice(endIdx + END.length);
}
const rootTag = '<div id="root">';
const rootIdx = html.indexOf(rootTag);
if (rootIdx === -1) {
  console.error('prerender-landing: could not find <div id="root"> in the export.');
  process.exit(1);
}
const insertAt = rootIdx + rootTag.length;
html = html.slice(0, insertAt) + START + CONTENT + END + html.slice(insertAt);

// 4. Friendlier noscript
html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, NOSCRIPT);

writeFileSync(target, html);
console.log(`prerender-landing: injected static landing + SEO meta into ${target}`);
