// strapi-to-hugo-v5.mjs
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
const VALID_TYPES = ["articles", "projects", "testimonials"];

if (!VALID_TYPES.includes(TYPE)) {
  console.error(
    `❌ Usage: node strapi-to-hugo-v5.mjs --type=${VALID_TYPES.join("|")}`,
  );
  process.exit(1);
}

const ROOT = process.cwd();

// PATH CONFIGURATION
let CONTENT_DIR;
let DATA_FILE_PATH;

if (TYPE === "testimonials") {
  CONTENT_DIR = path.join(ROOT, "data");
  DATA_FILE_PATH = path.join(CONTENT_DIR, "testimonials.yml");
} else {
  CONTENT_DIR = path.join(
    ROOT,
    "content",
    TYPE === "projects" ? "portfolio" : "blog",
  );
}

const MEDIA_DIR = path.join(
  ROOT,
  "static",
  "uploads",
  TYPE === "projects" ? "portfolio" : TYPE,
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

// FrontMatter Generator - AMÉLIORÉ
function frontMatter(obj) {
  const lines = Object.entries(obj)
    // On filtre : on ne garde pas les null, ni les tableaux vides, ni les undefined
    .filter(([, v]) => {
      if (v == null) return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    })
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

function pickImage(imageObj) {
  if (!imageObj) return null;
  const img = Array.isArray(imageObj) ? imageObj[0] : imageObj;
  if (!img || !img.url) return null;
  const preferred =
    img.formats?.medium?.url || img.formats?.small?.url || img.url;
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
  let page = 1;
  const all = [];
  const apiEndpoint = TYPE;
  for (;;) {
    const qs = `?populate=*&sort=publishedAt:desc&pagination[pageSize]=${pageSize}&pagination[page]=${page}`;
    const url = `${STRAPI_URL}/api/${apiEndpoint}${qs}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
    const json = await res.json();
    const batch = json.data;
    if (!batch || batch.length === 0) break;
    all.push(...batch);
    const pageCount = json.meta?.pagination?.pageCount || 1;
    if (page >= pageCount) break;
    page++;
  }
  return all;
}

async function syncEntries() {
  await ensureDir(CONTENT_DIR);
  await ensureDir(MEDIA_DIR);

  log("FETCH", `Fetching ${TYPE} from Strapi v5...`);
  const entries = await fetchAllEntries();
  const expectedMedia = new Set();

  if (TYPE === "testimonials") {
  } else {
    const expectedMd = new Set();
    for (const entry of entries) {
      const title = entry.title || "Sans titre";
      const slug = entry.slug || strToSlug(title);
      const description = entry.description || "";
      const body = (entry.content || "").trim();
      const date = entry.publishedAt || entry.createdAt;
      const lastmod = entry.updatedAt;
      const external_link = entry.external_link;
      const keywords = entry.keywords || "";

      let categories = ["Web"];
      if (entry.categories) {
        categories = [entry.categories];
      }

      let tags = [];
      if (entry.tags && typeof entry.tags === "string") {
        tags = entry.tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t !== "");
      }

      let cover = null;
      const cov = pickImage(entry.cover);
      if (cov) {
        const mediaRel = `uploads/${TYPE}/${slug}-cover${cov.ext}`;
        expectedMedia.add(mediaRel);
        cover = await download(cov.absolute, mediaRel);
      }

      let project_images = [];
      if (TYPE === "projects" && entry.project_images) {
        const imgs = Array.isArray(entry.project_images)
          ? entry.project_images
          : [entry.project_images];
        for (const [i, img] of imgs.entries()) {
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
      };

      if (external_link) front.external_link = external_link;

      if (TYPE === "projects") {
        front.image = cover;
        // On n'ajoute la clé que si le tableau n'est pas vide
        if (project_images.length > 0) {
          front.project_images = project_images;
        }
      }

      const fm = frontMatter(front);
      const mdContent = `${fm}\n${body}\n`;
      const mdName = `${slug}.md`;
      expectedMd.add(mdName);
      const outPath = path.join(CONTENT_DIR, mdName);

      if (!DRY_RUN) await fs.writeFile(outPath, mdContent, "utf8");
      log("WRITE", path.relative(ROOT, outPath));
    }

    // Clean up obsolete markdown files
    const existingMd = (await listFiles(CONTENT_DIR, ".md")).filter(
      (n) => n !== "_index.md",
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
  }

  // ==========================================
  // MEDIA CLEANUP
  // ==========================================
  // Note: This cleanup logic assumes flat structure for most,
  // it skips folder deletion to avoid breaking project subfolders logic in this simple script.
  const existingMedia = await listFiles(MEDIA_DIR);

  const toDeleteMedia = existingMedia.filter((n) => {
    const rel = `uploads/${TYPE}/${n}`.replace(/\\/g, "/");
    return !expectedMedia.has(rel);
  });

  for (const f of toDeleteMedia) {
    const p = path.join(MEDIA_DIR, f);
    try {
      const stat = await fs.stat(p);
      if (stat.isDirectory()) continue;

      if (DRY_RUN) {
        log("DRY", `Would delete ${path.relative(ROOT, p)}`);
      } else {
        await fs.unlink(p);
        log("DELETE", path.relative(ROOT, p));
      }
    } catch (e) {
      /* ignore */
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
