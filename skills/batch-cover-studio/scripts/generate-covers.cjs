#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const {spawnSync} = require("child_process");
const sharp = require("sharp");

const imageExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".tif",
  ".tiff",
]);

const parseArgs = (argv) => {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--help" || key === "-h") {
      args.help = true;
      continue;
    }
    if (!key.startsWith("--")) continue;
    const name = key.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    args[name] = value;
    index += 1;
  }
  return args;
};

const requireValue = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} failed:\n${result.stderr || result.stdout || "unknown error"}`,
    );
  }
  return result.stdout;
};

const probeDuration = (source) => {
  const output = run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    source,
  ]);
  const duration = Number(output.trim());
  return Number.isFinite(duration) && duration > 0 ? duration : null;
};

const xml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const characterWidth = (character) => {
  if (/[\u2e80-\u9fff\uff00-\uffef]/u.test(character)) return 1;
  if (/\s/u.test(character)) return 0.4;
  return 0.58;
};

const wrapTitle = (title, maxUnits = 11.5) => {
  const explicitLines = String(title)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const output = [];

  for (const sourceLine of explicitLines) {
    let line = "";
    let units = 0;
    for (const character of Array.from(sourceLine)) {
      const nextWidth = characterWidth(character);
      if (line && units + nextWidth > maxUnits) {
        output.push(line.trim());
        line = character;
        units = nextWidth;
      } else {
        line += character;
        units += nextWidth;
      }
    }
    if (line.trim()) output.push(line.trim());
  }

  return output.slice(0, 4);
};

const resolveTimestamp = (cover, index, count, duration) => {
  if (Number.isFinite(Number(cover.timestamp))) {
    return Math.max(0, Number(cover.timestamp));
  }
  if (Number.isFinite(Number(cover.at)) && duration) {
    return Math.max(0, Math.min(duration - 0.05, duration * Number(cover.at)));
  }
  if (!duration) return 0;
  return Math.max(0.05, duration * ((index + 1) / (count + 2)));
};

const extractVideoFrame = async (source, destination, timestamp) => {
  run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    timestamp.toFixed(3),
    "-i",
    source,
    "-frames:v",
    "1",
    destination,
  ]);
};

const buildSvg = ({
  width,
  height,
  style,
  title,
  eyebrow,
  brand,
  accentColor,
}) => {
  const titleLines = wrapTitle(title);
  const titleFontSize = titleLines.length >= 4 ? 68 : 78;
  const titleLineHeight = titleLines.length >= 4 ? 84 : 96;
  const panelHeight = 470;
  const panelX = 48;
  const panelWidth = width - panelX * 2;
  const panelY =
    style === "top"
      ? 110
      : style === "center"
        ? Math.round((height - panelHeight) / 2)
        : height - panelHeight - 110;
  const textX = panelX + 46;
  const eyebrowY = panelY + 78;
  const titleY = panelY + 150;
  const brandY = panelY + panelHeight - 42;

  const tspans = titleLines
    .map(
      (line, index) =>
        `<tspan x="${textX}" y="${titleY + index * titleLineHeight}">${xml(line)}</tspan>`,
    )
    .join("");

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#05080b" opacity="0.28"/>
      <rect x="${panelX}" y="${panelY}" width="${panelWidth}" height="${panelHeight}" rx="24" fill="#05080b" opacity="0.84"/>
      <rect x="${textX}" y="${panelY + 36}" width="${Math.max(90, Math.round(title.length * 2))}" height="7" rx="3.5" fill="${xml(accentColor)}"/>
      <text x="${textX}" y="${eyebrowY}" font-family="PingFang SC, Noto Sans CJK SC, Microsoft YaHei, Arial, sans-serif" font-size="30" font-weight="600" fill="${xml(accentColor)}">${xml(eyebrow)}</text>
      <text font-family="PingFang SC, Noto Sans CJK SC, Microsoft YaHei, Arial, sans-serif" font-size="${titleFontSize}" font-weight="700" fill="#F2F0E9" letter-spacing="0">
        ${tspans}
      </text>
      <text x="${textX}" y="${brandY}" font-family="SFMono-Regular, Menlo, Consolas, monospace" font-size="24" fill="#A5ACA4">${xml(brand)}</text>
    </svg>
  `;
};

const renderCover = async ({
  frame,
  destination,
  width,
  height,
  quality,
  style,
  cover,
  brand,
  accentColor,
}) => {
  const svg = buildSvg({
    width,
    height,
    style,
    title: cover.title,
    eyebrow: cover.eyebrow || "AI 实践",
    brand,
    accentColor: cover.accentColor || accentColor,
  });

  await sharp(frame)
    .rotate()
    .resize(width, height, {
      fit: "cover",
      position: cover.cropPosition || "centre",
    })
    .composite([{input: Buffer.from(svg)}])
    .jpeg({quality, mozjpeg: true})
    .toFile(destination);
};

const createContactSheet = async (files, destination) => {
  const columns = 3;
  const thumbWidth = 360;
  const thumbHeight = 480;
  const gap = 18;
  const rows = Math.ceil(files.length / columns);
  const width = columns * thumbWidth + (columns + 1) * gap;
  const height = rows * thumbHeight + (rows + 1) * gap;
  const composites = [];

  for (let index = 0; index < files.length; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const thumbnail = await sharp(files[index])
      .resize(thumbWidth, thumbHeight, {fit: "cover"})
      .toBuffer();
    composites.push({
      input: thumbnail,
      left: gap + column * (thumbWidth + gap),
      top: gap + row * (thumbHeight + gap),
    });
  }

  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#101310",
    },
  })
    .composite(composites)
    .jpeg({quality: 88, mozjpeg: true})
    .toFile(destination);
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      "Usage: node generate-covers.cjs --config /absolute/path/cover-config.json",
    );
    return;
  }

  requireValue(args.config, "Provide --config with an absolute JSON path.");
  const configPath = path.resolve(args.config);
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const source = path.resolve(config.source || "");
  const outputDir = path.resolve(config.outputDir || "");
  const width = Number(config.width || 1080);
  const height = Number(config.height || 1440);
  const quality = Number(config.quality || 92);
  const brand = config.brand || "得应";
  const accentColor = config.accentColor || "#D7FF4F";
  const styles = config.styles?.length ? config.styles : ["bottom", "top"];
  const covers = Array.isArray(config.covers) ? config.covers : [];

  requireValue(fs.existsSync(source), `Source does not exist: ${source}`);
  requireValue(covers.length > 0, "The config must include at least one cover.");
  requireValue(width > 0 && height > 0, "Width and height must be positive.");
  requireValue(
    styles.every((style) => ["bottom", "top", "center"].includes(style)),
    "Supported styles are bottom, top, and center.",
  );

  fs.mkdirSync(outputDir, {recursive: true});
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cover-studio-"));
  const isImage = imageExtensions.has(path.extname(source).toLowerCase());
  const duration = isImage ? null : probeDuration(source);
  const generated = [];

  try {
    for (let coverIndex = 0; coverIndex < covers.length; coverIndex += 1) {
      const cover = covers[coverIndex];
      requireValue(cover.title, `Cover ${coverIndex + 1} is missing a title.`);
      const timestamp = resolveTimestamp(cover, coverIndex, covers.length, duration);
      const framePath = path.join(tempDir, `frame-${coverIndex + 1}.png`);

      if (isImage) {
        await sharp(source).rotate().png().toFile(framePath);
      } else {
        await extractVideoFrame(source, framePath, timestamp);
      }

      for (const style of styles) {
        const sequence = String(generated.length + 1).padStart(2, "0");
        const destination = path.join(outputDir, `cover-${sequence}.jpg`);
        await renderCover({
          frame: framePath,
          destination,
          width,
          height,
          quality,
          style,
          cover,
          brand,
          accentColor,
        });
        generated.push(destination);
      }
    }

    for (const file of generated) {
      const metadata = await sharp(file).metadata();
      requireValue(
        metadata.width === width && metadata.height === height,
        `Unexpected dimensions for ${file}: ${metadata.width}x${metadata.height}`,
      );
    }

    const contactSheet = path.join(outputDir, "contact-sheet.jpg");
    await createContactSheet(generated, contactSheet);

    console.log(
      JSON.stringify(
        {
          source,
          outputDir,
          dimensions: `${width}x${height}`,
          covers: generated,
          contactSheet,
        },
        null,
        2,
      ),
    );
  } finally {
    fs.rmSync(tempDir, {recursive: true, force: true});
  }
};

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
