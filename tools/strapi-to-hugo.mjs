// strapi-to-hugo-v3.mjs
import fs from "node:fs/promises";
import path from "node:path";
import fetch from "node-fetch";

// ENV config
const STRAPI_URL = process.env.STRAPI_URL || "https://cms.pixicode.dev";
const DRY_RUN = (process.env.DRY_RUN || "false").toLowerCase() === "true";
const PRUNE_MEDIA =
  (process.env.PRUNE_MEDIA || "false").toLowerCase() === "true";

// CLI args - UPDATED to include 'testimonials'
const TYPE = process.argv[2]?.replace("--type=", "") || "articles";
if (!["articles", "projets", "testimonials"].includes(TYPE)) {
  console.error(
    "❌ Usage: node strapi-to-hugo-v3.mjs --type=articles|projets|testimonials"
  );
  process.exit(1);
}

const ROOT = process.cwd();

// PATH CONFIGURATION - UPDATED
// If testimonials, we write to /data/testimonials.yml, otherwise /content/TYPE/
let CONTENT_DIR;
let DATA_FILE_PATH;

if (TYPE === "testimonials") {
  CONTENT_DIR = path.join(ROOT, "data"); // We will store the YAML here
  DATA_FILE_PATH = path.join(CONTENT_DIR, "testimonials.yml");
} else {
  CONTENT_DIR = path.join(
    ROOT,
    "content",
    TYPE === "projets" ? "portfolio" : "blog"
  );
}

const MEDIA_DIR = path.join(
  ROOT,
  "static",
  "uploads",
  TYPE === "projets" ? "portfolio" : TYPE // 'testimonials' or 'blog'
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
  // Simple escape for YAML strings
  return /[:\-\n"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

// Existing FrontMatter function (for MD files)
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

  // Check if file exists to avoid redownloading (optional optimization)
  // try { await fs.access(destAbs); return `/${destRel.replace(/\\/g, "/")}`; } catch {}

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

// Helper to pick image (cover or logo)
function pickImage(imageObj) {
  if (!imageObj || !imageObj.url) return null;
  const preferred =
    imageObj.formats?.medium?.url ||
    imageObj.formats?.small?.url ||
    imageObj.url;

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

  // Strapi collection name logic
  const apiEndpoint = TYPE;

  for (;;) {
    const qs = `?_start=${start}&_limit=${pageSize}&_sort=published_at:desc`;
    const res = await fetch(`${STRAPI_URL}/${apiEndpoint}${qs}`);
    if (!res.ok)
      throw new Error(`Fetch failed ${res.status} for ${apiEndpoint}`);
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < pageSize) break;
    start += pageSize;
  }
  return all;
}

// --- NEW FUNCTION: Generate YAML for Data File ---
function generateDataYaml(title, items) {
  let yaml = `title: ${yamlEscape(title)}\nitems:\n`;

  for (const item of items) {
    yaml += `  - company: ${yamlEscape(item.company)}\n`;
    if (item.logo) yaml += `    logo: ${yamlEscape(item.logo)}\n`;
    yaml += `    quote: ${yamlEscape(item.quote)}\n`;
    if (item.color) yaml += `    color: ${yamlEscape(item.color)}\n`;
  }
  return yaml;
}

async function syncEntries() {
  await ensureDir(CONTENT_DIR);
  await ensureDir(MEDIA_DIR);

  log("FETCH", `Fetching ${TYPE} from Strapi…`);
  const entries = await fetchAllEntries();
  log("FETCH", `Got ${entries.length} ${TYPE}.`);

  const expectedMedia = new Set();

  // ==========================================
  // LOGIC FOR TESTIMONIALS (Data File)
  // ==========================================
  if (TYPE === "testimonials") {
    const processedItems = [];

    for (const entry of entries) {
      const companyName = entry.company || entry.title || "Client";
      const slug = strToSlug(companyName);

      // Handle Logo
      let logoPath = "";
      const imgData = pickImage(entry.logo);

      if (imgData) {
        const mediaRel = `uploads/${TYPE}/${slug}-logo${imgData.ext}`;
        expectedMedia.add(mediaRel);
        logoPath = await download(imgData.absolute, mediaRel);
      }

      processedItems.push({
        company: companyName,
        logo: logoPath,
        quote: entry.quote || entry.content || "", // Adjust based on Strapi field name
        color: entry.color || "#cccccc", // Adjust based on Strapi field name
      });
    }

    // Generate YAML Content
    const yamlContent = generateDataYaml("TÉMOIGNAGES", processedItems);

    if (DRY_RUN) {
      log("DRY", `Would write ${path.relative(ROOT, DATA_FILE_PATH)}`);
    } else {
      await fs.writeFile(DATA_FILE_PATH, yamlContent, "utf8");
      log("WRITE", path.relative(ROOT, DATA_FILE_PATH));
    }

    // ==========================================
    // LOGIC FOR ARTICLES & PROJECTS (MD Files)
    // ==========================================
  } else {
    const expectedMd = new Set();

    for (const entry of entries) {
      const title = entry.title || "Sans titre";
      const slug = entry.slug || strToSlug(title);
      const description = entry.description || "";
      const body = (entry.content || "").trim();
      const date = entry.published_at || entry.created_at;
      const lastmod = entry.updated_at;
      const keywords = entry.keywords || "";

      // Categories
      let categories = ["Web"];
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

      // Tags
      let tags = [];
      if (entry.tags && typeof entry.tags === "string") {
        tags = entry.tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
      } else if (Array.isArray(entry.tags)) {
        tags = entry.tags.map((x) =>
          typeof x === "string" ? x : x.name || ""
        );
      }

      // Cover image
      let cover = null;
      const cov = pickImage(entry.cover); // reused pickImage
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

    // Clean up obsolete markdown files (Only for articles/projects)
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
  }

  // ==========================================
  // MEDIA CLEANUP (Common for all types)
  // ==========================================
  if (PRUNE_MEDIA) {
    // If scanning nested folders for projects, this simple listFiles might need recursion
    // For now, it works for flat folders like testimonials/blog

    // Note: Project images are nested in subfolders, listFiles doesn't check subfolders deeply
    // without modification, but this logic maintains existing behavior.
    const existingMedia = await listFiles(MEDIA_DIR);

    const toDeleteMedia = existingMedia.filter((n) => {
      // Logic for flat files
      const rel = `uploads/${TYPE}/${n}`.replace(/\\/g, "/");
      return !expectedMedia.has(rel);
    });

    for (const f of toDeleteMedia) {
      const p = path.join(MEDIA_DIR, f);
      // Extra safety check: ensure we are not deleting directories if listFiles returned them
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
