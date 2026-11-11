import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

interface SeedManifestItem {
  slug: string;
  title: string;
  category: string;
  condition: string;
  images: Array<{
    url: string;
    photographer: string;
    sourceUrl: string;
  }>;
}

// Generates an elegant, high-contrast SVG placeholder adhering to Nilami brand palette
function generatePlaceholderSvg(title: string, category: string, width: number, height: number): string {
  // Sanitize title for XML
  const safeTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const safeCategory = category.toUpperCase();

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#314B3B" />
      <stop offset="100%" stop-color="#3F5F4B" />
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#5D866C" stroke-width="0.5" stroke-opacity="0.3"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bgGradient)" />
  <rect width="100%" height="100%" fill="url(#grid)" />

  <!-- Inner Border Accent -->
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="16" fill="none" stroke="#C2A68C" stroke-width="1.5" stroke-opacity="0.4" />

  <!-- Brand Wordmark -->
  <text x="56" y="70" font-family="serif" font-weight="bold" font-size="28" fill="#F5F5F0" letter-spacing="1">NILAMI</text>
  <text x="175" y="68" font-family="sans-serif" font-size="12" font-weight="600" fill="#E6D8C3" letter-spacing="2">AUTHENTICATED LOT</text>

  <!-- Category Chip -->
  <rect x="56" y="110" width="130" height="28" rx="14" fill="#E6D8C3" />
  <text x="121" y="128" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1F2A24" text-anchor="middle" letter-spacing="1">${safeCategory}</text>

  <!-- Title Text (Multiline safe) -->
  <foreignObject x="56" y="160" width="${width - 112}" height="140">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: serif; color: #F5F5F0; font-size: 26px; font-weight: bold; line-height: 1.3; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
      ${safeTitle}
    </div>
  </foreignObject>

  <!-- Watermark Footer -->
  <text x="56" y="${height - 48}" font-family="sans-serif" font-size="12" fill="#E6D8C3" fill-opacity="0.8">
    Native Engine Port 4000 • Verified Provenance • Nilami Systems
  </text>
</svg>`;
}

async function fetchImageBuffer(url: string, timeoutMs = 15000): Promise<Buffer | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'NilamiSeedImageFetcher/1.0 (https://github.com/nilami; educational demo)',
          Accept: 'image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
        },
      });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType && !contentType.startsWith('image/')) {
        return null;
      }
      const arrayBuf = await res.arrayBuffer();
      return Buffer.from(arrayBuf);
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

async function main() {
  const forceRefresh = process.argv.includes('--force');
  const rootDir = process.cwd();
  const manifestPath = path.resolve(rootDir, 'scripts/seed-manifest.json');
  const targetDir = path.resolve(rootDir, 'server/uploads/seed');
  const cacheIndexPath = path.join(targetDir, '.manifest-urls.json');
  const attributionDocPath = path.resolve(rootDir, 'docs/SEED_IMAGE_ATTRIBUTION.md');

  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found at ${manifestPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const prevUrlCache: Record<string, string> = fs.existsSync(cacheIndexPath)
    ? (JSON.parse(fs.readFileSync(cacheIndexPath, 'utf-8')) as Record<string, string>)
    : {};
  const nextUrlCache: Record<string, string> = { ...prevUrlCache };

  const manifest: SeedManifestItem[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`Processing ${manifest.length} seed items into ${targetDir}...`);

  const attributionLines: string[] = [
    '# SEED_IMAGE_ATTRIBUTION.md — Nilami Seed Images',
    '',
    'All images used for seed lot previews are sourced from [Wikimedia Commons](https://commons.wikimedia.org) (Public Domain, CC0, CC BY, CC BY-SA) and [Unsplash](https://unsplash.com) under the [Unsplash License](https://unsplash.com/license).',
    '',
    '| Item / Lot | Category | Photographer / Credit | Source Link |',
    '|---|---|---|---|',
  ];

  let downloadedCount = 0;
  let cachedCount = 0;
  let fallbackCount = 0;

  for (let i = 0; i < manifest.length; i++) {
    const item = manifest[i]!;
    for (let imgIdx = 0; imgIdx < item.images.length; imgIdx++) {
      const img = item.images[imgIdx]!;
      const mainFilename = `${item.slug}-${imgIdx + 1}.webp`;
      const thumbFilename = `${item.slug}-${imgIdx + 1}-thumb.webp`;
      const mainPath = path.join(targetDir, mainFilename);
      const thumbPath = path.join(targetDir, thumbFilename);

      const sourceLabel = img.sourceUrl.includes('wikimedia.org') ? 'Wikimedia Commons' : 'Unsplash Photo';
      attributionLines.push(
        `| **${item.title.replace(/\|/g, '-')}** | \`${item.category}\` | ${img.photographer.replace(/\|/g, '-')} | [${sourceLabel}](${img.sourceUrl}) |`,
      );

      const cachedUrl = prevUrlCache[mainFilename];
      const hasValidFile =
        fs.existsSync(mainPath) &&
        fs.existsSync(thumbPath) &&
        fs.statSync(mainPath).size > 12000 &&
        fs.statSync(thumbPath).size > 200;

      // Re-fetch when manifest URL changed, --force is passed, or existing file looks like a tiny SVG fallback
      if (!forceRefresh && hasValidFile && (!cachedUrl || cachedUrl === img.url)) {
        nextUrlCache[mainFilename] = img.url;
        cachedCount++;
        continue;
      }

      console.log(`[${i + 1}/${manifest.length}] Fetching image ${imgIdx + 1} for ${item.slug}...`);
      const buffer = await fetchImageBuffer(img.url);

      if (buffer && buffer.length > 1000) {
        try {
          // Process 1200px main WebP
          await sharp(buffer)
            .rotate()
            .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(mainPath);

          // Process 400px thumbnail WebP
          await sharp(buffer)
            .rotate()
            .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(thumbPath);

          nextUrlCache[mainFilename] = img.url;
          downloadedCount++;
          await new Promise((r) => setTimeout(r, 150));
          continue;
        } catch (err) {
          console.warn(`Sharp processing failed for ${item.slug}:`, err);
        }
      }

      // Fallback: Generate palette-colored placeholder
      console.warn(`Fallback to palette placeholder for ${item.slug}-${imgIdx + 1}`);
      const svgMain = generatePlaceholderSvg(item.title, item.category, 1200, 800);
      const svgThumb = generatePlaceholderSvg(item.title, item.category, 400, 267);

      await sharp(Buffer.from(svgMain)).webp({ quality: 85 }).toFile(mainPath);
      await sharp(Buffer.from(svgThumb)).webp({ quality: 80 }).toFile(thumbPath);
      delete nextUrlCache[mainFilename];
      fallbackCount++;
    }
  }

  fs.writeFileSync(cacheIndexPath, JSON.stringify(nextUrlCache, null, 2), 'utf-8');
  // Write attribution document
  fs.writeFileSync(attributionDocPath, attributionLines.join('\n'), 'utf-8');
  console.log(`\nImage fetch completed:`);
  console.log(`- Downloaded & processed: ${downloadedCount}`);
  console.log(`- Cached: ${cachedCount}`);
  console.log(`- Palette fallbacks: ${fallbackCount}`);
  console.log(`- Attribution saved to ${attributionDocPath}`);
}

void main();

