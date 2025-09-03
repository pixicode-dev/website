// tools/strapi-to-hugo-v3.mjs
// Strapi v3 → Hugo blog sync (create/update + delete removed articles)
// Requires: node-fetch@3 (npm i node-fetch@3)
//
// ENV:
//   STRAPI_URL=https://cms.pixicode.dev
//   DRY_RUN=true|false (default false)
//   PRUNE_MEDIA=true|false (default false)

import fs from "node:fs/promises";
import path from "node:path";
import fetch from "node-fetch";

const STRAPI_URL = "https://cms.pixicode.dev";
const ROOT = process.cwd();
const BLOG_DIR = path.join(ROOT, "content", "blog");
const MEDIA_DIR = path.join(ROOT, "static", "uploads", "blog");
const DRY_RUN = (process.env.DRY_RUN || "false").toLowerCase() === "true";
const PRUNE_MEDIA =
  (process.env.PRUNE_MEDIA || "false").toLowerCase() === "true";

function log(step, msg) {
  console.log(`[${step}] ${msg}`);
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

function yamlEscape(v) {
  if (v == null) return "";
  const s = String(v);
  return /[:\-\n"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}
function frontMatter(obj) {
  const lines = Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      if (Array.isArray(v))
        return `${k}:\n${v.map((x) => `  - ${yamlEscape(x)}`).join("\n")}`;
      if (typeof v === "object" && v !== null) {
        return `${k}:\n${Object.entries(v)
          .map(([kk, vv]) => `  ${kk}: ${yamlEscape(vv)}`)
          .join("\n")}`;
      }
      return `${k}: ${yamlEscape(v)}`;
    });
  return `---\n${lines.join("\n")}\n---\n`;
}

async function download(url, destRel) {
  const destAbs = path.join(ROOT, "static", destRel);
  await ensureDir(path.dirname(destAbs));
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Download failed ${r.status} ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (!DRY_RUN) await fs.writeFile(destAbs, buf);
  return `/${destRel.replace(/\\/g, "/")}`;
}

async function fetchAllArticles() {
  const pageSize = 100;
  let start = 0;
  const all = [];
  for (;;) {
    const qs = `?_start=${start}&_limit=${pageSize}&_sort=published_at:desc`;
    const res = await fetch(`${STRAPI_URL}/articles${qs}`);
    if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < pageSize) break;
    start += pageSize;
  }
  return all;
}

function strToSlug(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function pickCover(article) {
  const c = article.cover;
  if (!c || !c.url) return null;
  const preferred =
    c.formats?.medium?.url ||
    c.formats?.large?.url ||
    c.formats?.small?.url ||
    c.url;
  const absolute = preferred.startsWith("http")
    ? preferred
    : `${STRAPI_URL}${preferred}`;
  const ext = path.extname(preferred) || ".jpg";
  return { absolute, ext };
}

async function listFiles(dir, extFilter = null) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((d) => d.isFile())
      .map((d) => d.name)
      .filter((n) => (extFilter ? n.toLowerCase().endsWith(extFilter) : true));
  } catch {
    return [];
  }
}

async function syncArticles() {
  await ensureDir(BLOG_DIR);
  await ensureDir(MEDIA_DIR);

  log("FETCH", "Reading articles from Strapi v3 (public)...");
  const articles = await fetchAllArticles();
  log("FETCH", `Got ${articles.length} article(s).`);

  // Track what's expected after this run
  const expectedMd = new Set(); // e.g. slug.md
  const expectedMedia = new Set(); // e.g. uploads/blog/slug-cover.jpg (rel path from /static)

  for (const a of articles) {
    const title = a.title || "Sans titre";
    const slug = a.slug || strToSlug(title);
    const description = a.description || "";
    const body = (a.content || "").trim();
    const date = a.published_at || a.updated_at || a.created_at;

    const categories =
      Array.isArray(a.categories) && a.categories.length
        ? a.categories.map((x) =>
            typeof x === "string" ? x : x.name || x.title || ""
          )
        : ["Web"];
    const tags = Array.isArray(a.tags) ? a.tags : [];

    // cover
    let cover = null;
    const cov = pickCover(a);
    if (cov) {
      const mediaRel = `uploads/blog/${slug}-cover${cov.ext}`;
      expectedMedia.add(mediaRel.replace(/\\/g, "/"));
      cover = await download(cov.absolute, mediaRel);
    }

    const fm = frontMatter({
      title,
      date,
      draft: false,
      description,
      categories,
      tags,
      cover,
    });
    const mdContent = `${fm}\n${body}\n`;

    const mdName = `${slug}.md`;
    expectedMd.add(mdName);
    const outPath = path.join(BLOG_DIR, mdName);

    // Upsert (always overwrite to keep in sync)
    if (DRY_RUN) {
      log("DRY", `Would write ${path.relative(ROOT, outPath)}`);
    } else {
      await fs.writeFile(outPath, mdContent, "utf8");
      log("WRITE", path.relative(ROOT, outPath));
    }
  }

  // Delete Markdown files that are no longer present in Strapi
  const existingMd = (await listFiles(BLOG_DIR, ".md")).filter(
    (n) => n !== "_index.md"
  );
  const toDeleteMd = existingMd.filter((n) => !expectedMd.has(n));
  for (const f of toDeleteMd) {
    const p = path.join(BLOG_DIR, f);
    if (DRY_RUN) {
      log("DRY", `Would delete ${path.relative(ROOT, p)}`);
    } else {
      await fs.unlink(p);
      log("DELETE", path.relative(ROOT, p));
    }
  }

  // Optionally prune media not referenced anymore
  if (PRUNE_MEDIA) {
    const existingMedia = await listFiles(MEDIA_DIR);
    const toDeleteMedia = existingMedia.filter((n) => {
      const rel = `uploads/blog/${n}`.replace(/\\/g, "/");
      return !expectedMedia.has(rel);
    });
    for (const f of toDeleteMedia) {
      const p = path.join(MEDIA_DIR, f);
      if (DRY_RUN) {
        log("DRY", `Would delete ${path.relative(ROOT, p)}`);
      } else {
        await fs.unlink(p);
        log("DELETE", path.relative(ROOT, p));
      }
    }
  }

  log("DONE", `Synced ${articles.length} article(s).`);
}

(async () => {
  try {
    await syncArticles();
    console.log("✅ Strapi v3 → Hugo blog sync complete.");
  } catch (e) {
    console.error("❌ Sync failed:", e);
    process.exit(1);
  }
})();
