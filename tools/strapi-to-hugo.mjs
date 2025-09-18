// strapi-to-hugo-v3.mjs
import fs from "node:fs/promises";
import path from "node:path";
import fetch from "node-fetch";

// ENV config
const STRAPI_URL = process.env.STRAPI_URL || "https://cms.pixicode.dev";
const DRY_RUN = (process.env.DRY_RUN || "false").toLowerCase() === "true";
const PRUNE_MEDIA =
  (process.env.PRUNE_MEDIA || "false").toLowerCase() === "true";

// CLI args
const TYPE = process.argv[2]?.replace("--type=", "") || "articles";
if (!["articles", "projets"].includes(TYPE)) {
  console.error("❌ Usage: node strapi-to-hugo-v3.mjs --type=articles|projets");
  process.exit(1);
}

const ROOT = process.cwd();
const CONTENT_DIR = path.join(
  ROOT,
  "content",
  TYPE === "projets" ? "portfolio" : "blog"
);
const MEDIA_DIR = path.join(
  ROOT,
  "static",
  "uploads",
  TYPE === "projets" ? "portfolio" : "blog"
);

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

function strToSlug(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function pickCover(entry) {
  const c = entry.cover;
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

async function fetchAllEntries() {
  const pageSize = 100;
  let start = 0;
  const all = [];
  for (;;) {
    const qs = `?_start=${start}&_limit=${pageSize}&_sort=published_at:desc`;
    const res = await fetch(`${STRAPI_URL}/${TYPE}${qs}`);
    if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < pageSize) break;
    start += pageSize;
  }
  return all;
}

async function syncEntries() {
  await ensureDir(CONTENT_DIR);
  await ensureDir(MEDIA_DIR);

  log("FETCH", `Fetching ${TYPE} from Strapi…`);
  const entries = await fetchAllEntries();
  log("FETCH", `Got ${entries.length} ${TYPE}.`);

  const expectedMd = new Set();
  const expectedMedia = new Set();

  for (const entry of entries) {
    const title = entry.title || "Sans titre";
    const slug = entry.slug || strToSlug(title);
    const description = entry.description || "";
    const body = (entry.content || "").trim();
    const date = entry.published_at || entry.created_at;
    const lastmod = entry.updated_at;
    const keywords = entry.keywords || "";

    let categories = ["Web"]; // fallback
    if (entry.category && typeof entry.category === "string") {
      categories = entry.category
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
    } else if (Array.isArray(entry.category)) {
      categories = entry.category.map((x) =>
        typeof x === "string" ? x : x.name || ""
      );
    }

    let tags = [];
    if (entry.tags && typeof entry.tags === "string") {
      tags = entry.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    } else if (Array.isArray(entry.tags)) {
      tags = entry.tags.map((x) => (typeof x === "string" ? x : x.name || ""));
    }

    // Cover image
    let cover = null;
    const cov = pickCover(entry);
    if (cov) {
      const mediaRel = `uploads/${TYPE}/${slug}-cover${cov.ext}`;
      expectedMedia.add(mediaRel);
      cover = await download(cov.absolute, mediaRel);
    }

    // Project images
    let project_images = [];
    if (TYPE === "projets" && Array.isArray(entry.project_images)) {
      for (const [i, img] of entry.project_images.entries()) {
        if (!img || !img.url) continue;
        const src = img.url.startsWith("http")
          ? img.url
          : `${STRAPI_URL}${img.url}`;
        const ext = path.extname(img.url) || ".jpg";
        const destRel = `uploads/${TYPE}/${slug}/${i}${ext}`;
        expectedMedia.add(destRel);
        const localPath = await download(src, destRel);
        project_images.push(localPath);
      }
    }

    const front = {
      title,
      date,
      lastmod,
      draft: false,
      description,
      cover,
      categories,
      tags,
      keywords,
      ...(TYPE === "projets" && {
        image: cover,
        project_images,
      }),
    };

    const fm = frontMatter(front);
    const mdContent = `${fm}\n${body}\n`;
    const mdName = `${slug}.md`;
    expectedMd.add(mdName);
    const outPath = path.join(CONTENT_DIR, mdName);

    if (DRY_RUN) {
      log("DRY", `Would write ${path.relative(ROOT, outPath)}`);
    } else {
      await fs.writeFile(outPath, mdContent, "utf8");
      log("WRITE", path.relative(ROOT, outPath));
    }
  }

  // Clean up obsolete markdown files
  const existingMd = (await listFiles(CONTENT_DIR, ".md")).filter(
    (n) => n !== "_index.md"
  );
  const toDeleteMd = existingMd.filter((n) => !expectedMd.has(n));
  for (const f of toDeleteMd) {
    const p = path.join(CONTENT_DIR, f);
    if (DRY_RUN) {
      log("DRY", `Would delete ${path.relative(ROOT, p)}`);
    } else {
      await fs.unlink(p);
      log("DELETE", path.relative(ROOT, p));
    }
  }

  // Clean up unused media
  if (PRUNE_MEDIA) {
    const existingMedia = await listFiles(MEDIA_DIR);
    const toDeleteMedia = existingMedia.filter((n) => {
      const rel = `uploads/${TYPE}/${n}`.replace(/\\/g, "/");
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

  log("DONE", `Synced ${entries.length} ${TYPE}.`);
}

(async () => {
  try {
    await syncEntries();
    console.log(`✅ Sync complete for ${TYPE}.`);
  } catch (e) {
    console.error("❌ Sync failed:", e);
    process.exit(1);
  }
})();
