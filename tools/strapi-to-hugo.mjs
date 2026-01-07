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
    `❌ Usage: node strapi-to-hugo-v5.mjs --type=${VALID_TYPES.join("|")}`
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
    TYPE === "projects" ? "portfolio" : "blog"
  );
}

const MEDIA_DIR = path.join(
  ROOT,
  "static",
  "uploads",
  TYPE === "projects" ? "portfolio" : TYPE
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

// FrontMatter Generator
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

// Helper to pick image (Updated for Strapi v5 structure)
function pickImage(imageObj) {
  if (!imageObj) return null;

  // Handle case where relation might be an array or single object
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

// --- UPDATED FETCHING LOGIC FOR STRAPI V5 ---
async function fetchAllEntries() {
  const pageSize = 100;
  let page = 1;
  const all = [];
  const apiEndpoint = TYPE; // "articles", "projets", etc.

  for (;;) {
    // Strapi v5 Pagination & Sorting & Population
    // Note: 'populate=*' is essential in v5 to get images/relations
    const qs = `?populate=*&sort=publishedAt:desc&pagination[pageSize]=${pageSize}&pagination[page]=${page}`;
    const url = `${STRAPI_URL}/api/${apiEndpoint}${qs}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);

    const json = await res.json();

    // In v5, data is an array of objects directly (no more .attributes wrapper)
    const batch = json.data;

    if (!batch || batch.length === 0) break;

    all.push(...batch);

    // Check pagination meta to see if we need to continue
    const pageCount = json.meta?.pagination?.pageCount || 1;
    if (page >= pageCount) break;

    page++;
  }
  return all;
}

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

  log("FETCH", `Fetching ${TYPE} from Strapi v5...`);
  const entries = await fetchAllEntries();
  log("FETCH", `Got ${entries.length} entries.`);

  const expectedMedia = new Set();

  // ==========================================
  // LOGIC FOR TESTIMONIALS (Data File)
  // ==========================================
  if (TYPE === "testimonials") {
    const processedItems = [];

    for (const entry of entries) {
      // Direct access (no .attributes)
      const companyName = entry.company || entry.title || "Client";
      const slug = strToSlug(companyName);

      // Handle Logo
      let logoPath = "";
      const imgData = pickImage(entry.logo); // entry.logo is usually direct object now

      if (imgData) {
        const mediaRel = `uploads/${TYPE}/${slug}-logo${imgData.ext}`;
        expectedMedia.add(mediaRel);
        logoPath = await download(imgData.absolute, mediaRel);
      }

      processedItems.push({
        company: companyName,
        logo: logoPath,
        quote: entry.quote || entry.content || "",
        color: entry.color || "#cccccc",
      });
    }

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
      // Direct access (no .attributes)
      const title = entry.title || "Sans titre";
      const slug = entry.slug || strToSlug(title);
      const description = entry.description || "";
      const body = (entry.content || "").trim(); // Assuming Markdown field

      // v5 uses camelCase for system fields
      const date = entry.publishedAt || entry.createdAt;
      const lastmod = entry.updatedAt;

      const external_link = entry.external_link;
      const keywords = entry.keywords || "";

      // Categories (Handle v5 relation array)
      let categories = ["Web"];
      if (
        entry.category &&
        Array.isArray(entry.category) &&
        entry.category.length > 0
      ) {
        categories = entry.category.map((c) => c.name);
      } else if (entry.category && entry.category.name) {
        // Handle single relation case
        categories = [entry.category.name];
      }

      // Tags (Handle v5 relation array)
      let tags = [];
      if (entry.tags && Array.isArray(entry.tags)) {
        tags = entry.tags.map((t) => t.name);
      }

      // Cover image
      let cover = null;
      const cov = pickImage(entry.cover);
      if (cov) {
        const mediaRel = `uploads/${TYPE}/${slug}-cover${cov.ext}`;
        expectedMedia.add(mediaRel);
        cover = await download(cov.absolute, mediaRel);
      }

      // Project images (Gallery)
      let project_images = [];
      if (TYPE === "projects" && entry.project_images) {
        // v5 returns array directly
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

      // Add extra fields only if valid
      if (external_link) front.external_link = external_link;

      if (TYPE === "projects") {
        front.image = cover; // often used in portfolio themes
        front.project_images = project_images;
      }

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
  }

  // ==========================================
  // MEDIA CLEANUP
  // ==========================================
  if (PRUNE_MEDIA) {
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
