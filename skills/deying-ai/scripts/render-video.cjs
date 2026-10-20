#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const {execFileSync, spawn} = require("child_process");

const parseArgs = (argv) => {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) {
      continue;
    }
    const value = argv[index + 1];
    if (value && !value.startsWith("--")) {
      args[key.slice(2)] = value;
      index += 1;
    } else {
      args[key.slice(2)] = true;
    }
  }
  return args;
};

const resolveSharp = () => {
  for (const candidate of [
    process.env.SHARP_PATH,
    "sharp",
    path.resolve(__dirname, "node_modules/sharp"),
  ].filter(Boolean)) {
    try {
      return require(candidate);
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error(
    "Sharp is required. Run `npm install` in the scripts directory or set SHARP_PATH.",
  );
};

const sharp = resolveSharp();

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read JSON ${file}: ${error.message}`);
  }
};

const resolveFrom = (value, base) =>
  value ? path.resolve(path.dirname(base), value) : value;

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const progress = (value, delay = 0, duration = 18) =>
  1 - Math.pow(1 - clamp((value - delay) / duration, 0, 1), 3);
const spring = (value, delay = 0, duration = 20) => {
  const x = clamp((value - delay) / duration, 0, 1);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const sceneOpacity = (local, duration) =>
  clamp(local / 9, 0, 1) * clamp((duration - local) / 11, 0, 1);

const text = ({
  value,
  x,
  y,
  size,
  fill = "#f4f0e8",
  weight = 700,
  anchor = "start",
  opacity = 1,
  spacing = 0,
  family,
}) =>
  `<text x="${x}" y="${y}" fill="${fill}" fill-opacity="${opacity}" ` +
  `font-family="${family}" font-size="${size}" font-weight="${weight}" ` +
  `letter-spacing="${spacing}" text-anchor="${anchor}">${escapeXml(value)}</text>`;

const rect = ({
  x,
  y,
  width,
  height,
  radius = 0,
  fill = "none",
  opacity = 1,
  stroke = "none",
  strokeOpacity = 1,
  strokeWidth = 0,
}) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" ` +
  `fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" ` +
  `stroke-opacity="${strokeOpacity}" stroke-width="${strokeWidth}"/>`;

const line = ({
  x1,
  y1,
  x2,
  y2,
  color,
  opacity = 1,
  width = 2,
  dash,
}) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" ` +
  `stroke-opacity="${opacity}" stroke-width="${width}"${
    dash ? ` stroke-dasharray="${dash}"` : ""
  } stroke-linecap="round"/>`;

const circle = ({
  cx,
  cy,
  radius,
  fill = "none",
  opacity = 1,
  stroke = "none",
  strokeOpacity = 1,
  strokeWidth = 0,
}) =>
  `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" ` +
  `fill-opacity="${opacity}" stroke="${stroke}" stroke-opacity="${strokeOpacity}" ` +
  `stroke-width="${strokeWidth}"/>`;

const group = (transform, children, opacity = 1) =>
  `<g transform="${transform}" opacity="${opacity}">${children}</g>`;

const accent = (name, palette) => palette[name] || name || palette.green;

const titleLines = (
  local,
  lines,
  {
    x = 116,
    startY = 610,
    size = 60,
    lineHeight = 76,
    delay = 12,
    color,
    family,
  },
) =>
  lines
    .map((value, index) => {
      const reveal = spring(local, delay + index * 5, 18);
      return group(
        `translate(0 ${(1 - reveal) * 42})`,
        text({
          value,
          x,
          y: startY + index * lineHeight,
          size,
          color,
          weight: 900,
          opacity: clamp(reveal, 0, 1),
          family,
        }),
        clamp(reveal, 0, 1),
      );
    })
    .join("");

const panel = (color, local, duration, children, config) => {
  const reveal = spring(local, 6, 22);
  return group(
    `translate(540 ${960 + (1 - reveal) * 24}) scale(${0.975 + reveal * 0.025}) translate(-540 -960)`,
    rect({
      x: 68,
      y: 390,
      width: 944,
      height: 1310,
      radius: 42,
      fill: config.panel || "#0a1014",
      opacity: 0.965,
      stroke: color,
      strokeOpacity: 0.33,
      strokeWidth: 3,
    }) +
      rect({
        x: 96,
        y: 418,
        width: 888,
        height: 5,
        radius: 99,
        fill: color,
        opacity: 0.92,
      }) +
      children,
    sceneOpacity(local, duration),
  );
};

const background = (frame, config) => {
  const {width, height, gridSize = 34, gridColor = "#36a57c"} = config;
  const driftX = -((frame * 0.58) % gridSize);
  const driftY = -((frame * 0.22) % gridSize);
  const scanY = ((frame * 7.2) % (height + 320)) - 160;
  const rail = ((frame * 2.1) % (width + 520)) - 260;
  let grid = "";
  for (let x = -gridSize; x <= width + gridSize; x += gridSize) {
    grid += line({
      x1: x + driftX,
      y1: 0,
      x2: x + driftX,
      y2: height,
      color: gridColor,
      opacity: config.gridOpacity || 0.105,
      width: 1,
    });
  }
  for (let y = -gridSize; y <= height + gridSize; y += gridSize) {
    grid += line({
      x1: 0,
      y1: y + driftY,
      x2: width,
      y2: y + driftY,
      color: gridColor,
      opacity: config.gridOpacity || 0.105,
      width: 1,
    });
  }
  const nodes = [
    [134, 1196, config.palette.green],
    [946, 1080, config.palette.blue],
    [95, 1690, config.palette.orange],
    [990, 1385, config.palette.green],
  ]
    .map(([x, y, color], index) =>
      circle({
        cx: x,
        cy: y + Math.sin(frame / (26 + index * 3)) * 7,
        radius: 5 + (index % 2) * 2,
        fill: color,
        opacity: 0.18 + Math.sin(frame / 18) * 0.05,
      }),
    )
    .join("");
  return (
    rect({x: 0, y: 0, width, height, fill: config.background || "#05080b"}) +
    grid +
    `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#vignette)"/>` +
    `<rect x="0" y="${scanY}" width="${width}" height="180" fill="url(#scan)"/>` +
    circle({
      cx: width,
      cy: 180,
      radius: 420,
      fill: config.palette.green,
      opacity: 0.025,
    }) +
    circle({
      cx: 0,
      cy: height - 160,
      radius: 520,
      fill: config.palette.blue,
      opacity: 0.024,
    }) +
    line({
      x1: rail - 160,
      y1: 0,
      x2: rail + 200,
      y2: height,
      color: config.palette.blue,
      opacity: 0.08,
      width: 3,
    }) +
    nodes
  );
};

const topBar = (frame, config) => {
  const slide = spring(frame, 0, 22);
  const overlay = config.avatar.overlay;
  return group(
    `translate(0 ${(1 - slide) * -40})`,
    rect({
      x: 64,
      y: 62,
      width: 470,
      height: 68,
      radius: 999,
      fill: "#0e1419",
      opacity: 0.96,
      stroke: "#ffffff",
      strokeOpacity: 0.2,
      strokeWidth: 2,
    }) +
      rect({
        x: 86,
        y: 86,
        width: 18,
        height: 18,
        radius: 4,
        fill: config.palette.orange,
        opacity: 0.74 + Math.sin(frame / 17) * 0.2,
      }) +
      text({
        value: config.topBar.title,
        x: 124,
        y: 106,
        size: 27,
        weight: 900,
        family: config.fontFamily,
      }) +
      rect({
        x: 554,
        y: 62,
        width: 390,
        height: 68,
        radius: 999,
        fill: "#0e1419",
        opacity: 0.96,
        stroke: "#ffffff",
        strokeOpacity: 0.2,
        strokeWidth: 2,
      }) +
      circle({
        cx: 583,
        cy: 96,
        radius: 6,
        fill: config.palette.green,
        opacity: 0.74 + Math.sin(frame / 17) * 0.2,
      }) +
      text({
        value: config.topBar.tag,
        x: 606,
        y: 105,
        size: 20,
        fill: config.palette.muted,
        weight: 850,
        spacing: 1.2,
        family: config.fontFamily,
      }),
    clamp(slide, 0, 1),
  );
};

const avatarChrome = (frame, config) => {
  if (!config.avatar.enabled) {
    return "";
  }
  const {ringCx: cx, ringCy: cy, ringRadius: radius, label = "HOST"} =
    config.avatar.overlay;
  const float = Math.sin(frame / 24) * 3;
  const pulse = 0.3 + Math.sin(frame / 17) * 0.08;
  return group(
    `translate(0 ${float})`,
    circle({
      cx,
      cy,
      radius: radius + 8,
      fill: config.palette.green,
      opacity: 0.03,
      stroke: config.palette.green,
      strokeOpacity: pulse,
      strokeWidth: 2,
    }) +
      circle({
        cx,
        cy,
        radius,
        fill: "#000000",
        opacity: 0.96,
        stroke: config.palette.green,
        strokeOpacity: 0.96,
        strokeWidth: 4,
      }) +
      rect({
        x: cx - 35,
        y: cy + radius - 4,
        width: 70,
        height: 24,
        radius: 99,
        fill: config.palette.green,
        opacity: 0.96,
      }) +
      text({
        value: label,
        x: cx,
        y: cy + radius + 13,
        size: 13,
        fill: "#07110e",
        weight: 900,
        anchor: "middle",
        family: config.fontFamily,
      }),
  );
};

const progressBar = (frame, config) => {
  const value = clamp(frame / Math.max(1, config.durationFrames - 1), 0, 1);
  const width = 940;
  const x = (config.width - width) / 2;
  const y = config.height - 104;
  return (
    rect({
      x,
      y,
      width,
      height: 8,
      radius: 99,
      fill: "#ffffff",
      opacity: 0.11,
    }) +
    `<rect x="${x}" y="${y}" width="${width * value}" height="8" rx="99" fill="url(#progressGradient)"/>` +
    circle({
      cx: x + width * value,
      cy: y + 4,
      radius: 11,
      fill: "#f4f0e8",
      opacity: 0.94,
      stroke: config.palette.green,
      strokeOpacity: 0.46,
      strokeWidth: 3,
    })
  );
};

const eyebrow = (local, label, color, config) => {
  const reveal = progress(local, 8, 16);
  return (
    line({
      x1: 116,
      y1: 500,
      x2: 116 + 54 * reveal,
      y2: 500,
      color,
      width: 4,
    }) +
    text({
      value: label,
      x: 188,
      y: 510,
      size: 24,
      fill: color,
      weight: 900,
      spacing: 1.4,
      opacity: reveal,
      family: config.fontFamily,
    })
  );
};

const heroScene = (scene, local, duration, config) => {
  const color = accent(scene.accent, config.palette);
  const callout = scene.callout || {};
  const reveal = spring(local, 34, 22);
  const content =
    eyebrow(local, scene.eyebrow, color, config) +
    titleLines(local, scene.title, {
      size: scene.titleSize || 62,
      color,
      family: config.fontFamily,
    }) +
    text({
      value: scene.lead,
      x: 116,
      y: 835,
      size: scene.leadSize || 28,
      fill: config.palette.muted,
      weight: 700,
      opacity: progress(local, 28, 18),
      family: config.fontFamily,
    }) +
    group(
      `translate(540 1080) scale(${0.84 + reveal * 0.16}) translate(-540 -1080)`,
      rect({
        x: 116,
        y: 920,
        width: 848,
        height: 310,
        radius: 34,
        fill: color,
        opacity: 0.055,
        stroke: color,
        strokeOpacity: 0.38,
        strokeWidth: 3,
      }) +
        circle({
          cx: 220,
          cy: 1070,
          radius: 52,
          fill: color,
          opacity: 0.08,
          stroke: color,
          strokeOpacity: 0.72,
          strokeWidth: 3,
        }) +
        text({
          value: callout.tag || "KEY IDEA",
          x: 315,
          y: 1015,
          size: 22,
          fill: color,
          weight: 900,
          spacing: 2,
          family: config.fontFamily,
        }) +
        text({
          value: callout.title,
          x: 315,
          y: 1085,
          size: 37,
          weight: 900,
          family: config.fontFamily,
        }) +
        text({
          value: callout.detail,
          x: 315,
          y: 1135,
          size: 25,
          fill: config.palette.muted,
          weight: 700,
          family: config.fontFamily,
        }),
      clamp(reveal, 0, 1),
    ) +
    text({
      value: scene.footer || "",
      x: 116,
      y: 1418,
      size: 25,
      fill: config.palette.muted,
      weight: 700,
      opacity: scene.footer ? progress(local, 70, 18) : 0,
      family: config.fontFamily,
    });
  return panel(color, local, duration, content, config);
};

const listScene = (scene, local, duration, config) => {
  const color = accent(scene.accent, config.palette);
  const starts = scene.items.map((item) => item.startFrame || 0);
  const activeIndex = starts.reduce(
    (current, start, index) => (local >= start ? index : current),
    0,
  );
  const content =
    eyebrow(local, scene.eyebrow, color, config) +
    titleLines(local, scene.title, {
      size: scene.titleSize || 55,
      color,
      family: config.fontFamily,
    }) +
    scene.items
      .map((item, index) => {
        const itemColor = accent(item.accent, config.palette);
        const active = index === activeIndex;
        const y = 850 + index * 126;
        const reveal = spring(local, 20 + index * 10, 18);
        return group(
          `translate(${(1 - reveal) * 64} 0)`,
          rect({
            x: 116,
            y,
            width: 848,
            height: 108,
            radius: 24,
            fill: itemColor,
            opacity: active ? 0.12 : 0.045,
            stroke: itemColor,
            strokeOpacity: active ? 0.88 : 0.24,
            strokeWidth: active ? 3 : 2,
          }) +
            text({
              value: `0${index + 1}`,
              x: 156,
              y: y + 69,
              size: 30,
              fill: itemColor,
              weight: 900,
              family: config.fontFamily,
            }) +
            text({
              value: item.title,
              x: 238,
              y: y + 47,
              size: 29,
              weight: 900,
              family: config.fontFamily,
            }) +
            text({
              value: item.detail,
              x: 238,
              y: y + 84,
              size: 20,
              fill: config.palette.muted,
              weight: 700,
              family: config.fontFamily,
            }) +
            text({
              value: item.tag,
              x: 922,
              y: y + 62,
              size: 17,
              fill: itemColor,
              weight: 900,
              anchor: "end",
              spacing: 1.2,
              family: config.fontFamily,
            }),
          clamp(reveal, 0, 1),
        );
      })
      .join("") +
    text({
      value: scene.footer || "",
      x: 116,
      y: 1435,
      size: 25,
      fill: config.palette.muted,
      weight: 750,
      opacity: scene.footer ? progress(local, 70, 18) : 0,
      family: config.fontFamily,
    });
  return panel(color, local, duration, content, config);
};

const stepsScene = (scene, local, duration, config) => {
  const color = accent(scene.accent, config.palette);
  const content =
    eyebrow(local, scene.eyebrow, color, config) +
    titleLines(local, scene.title, {
      size: scene.titleSize || 60,
      color,
      family: config.fontFamily,
    }) +
    scene.items
      .map((item, index) => {
        const itemColor = accent(item.accent, config.palette);
        const y = 865 + index * 176;
        const reveal = spring(local, 24 + index * 18, 20);
        return group(
          `translate(${(1 - reveal) * 58} 0)`,
          rect({
            x: 116,
            y,
            width: 848,
            height: 146,
            radius: 28,
            fill: itemColor,
            opacity: 0.05,
            stroke: itemColor,
            strokeOpacity: 0.3,
            strokeWidth: 2,
          }) +
            text({
              value: item.number || `0${index + 1}`,
              x: 156,
              y: y + 91,
              size: 42,
              fill: itemColor,
              weight: 900,
              family: config.fontFamily,
            }) +
            text({
              value: item.title,
              x: 250,
              y: y + 60,
              size: 31,
              weight: 900,
              family: config.fontFamily,
            }) +
            text({
              value: item.detail,
              x: 250,
              y: y + 104,
              size: 21,
              fill: config.palette.muted,
              weight: 700,
              family: config.fontFamily,
            }),
          clamp(reveal, 0, 1),
        );
      })
      .join("") +
    text({
      value: scene.footer || "",
      x: 116,
      y: 1480,
      size: 25,
      fill: config.palette.muted,
      weight: 750,
      opacity: scene.footer ? progress(local, 82, 18) : 0,
      family: config.fontFamily,
    });
  return panel(color, local, duration, content, config);
};

const chipsScene = (scene, local, duration, config) => {
  const color = accent(scene.accent, config.palette);
  const reveal = spring(local, 18, 22);
  const content =
    eyebrow(local, scene.eyebrow, color, config) +
    titleLines(local, scene.title, {
      size: scene.titleSize || 60,
      color,
      family: config.fontFamily,
    }) +
    group(
      `translate(540 1060) scale(${0.91 + reveal * 0.09}) translate(-540 -1060)`,
      rect({
        x: 116,
        y: 875,
        width: 848,
        height: 420,
        radius: 36,
        fill: color,
        opacity: 0.05,
        stroke: color,
        strokeOpacity: 0.36,
        strokeWidth: 3,
      }) +
        text({
          value: scene.lead,
          x: 540,
          y: 1005,
          size: 38,
          weight: 900,
          anchor: "middle",
          family: config.fontFamily,
        }) +
        scene.items
          .map((item, index) =>
            group(
              `translate(0 ${(1 - progress(local, 38 + index * 10, 18)) * 22})`,
              rect({
                x: 156 + index * 260,
                y: 1120,
                width: 230,
                height: 88,
                radius: 22,
                fill: color,
                opacity: 0.08,
                stroke: color,
                strokeOpacity: 0.48,
                strokeWidth: 2,
              }) +
                text({
                  value: item,
                  x: 271 + index * 260,
                  y: 1174,
                  size: 25,
                  fill: color,
                  weight: 900,
                  anchor: "middle",
                  family: config.fontFamily,
                }),
              progress(local, 38 + index * 10, 18),
            ),
          )
          .join(""),
      clamp(reveal, 0, 1),
    ) +
    text({
      value: scene.footer || "",
      x: 116,
      y: 1435,
      size: 26,
      fill: config.palette.muted,
      weight: 800,
      opacity: scene.footer ? progress(local, 72, 18) : 0,
      family: config.fontFamily,
    });
  return panel(color, local, duration, content, config);
};

const questionScene = (scene, local, duration, config) => {
  const color = accent(scene.accent, config.palette);
  const reveal = spring(local, 12, 20);
  const content =
    eyebrow(local, scene.eyebrow, color, config) +
    group(
      `translate(540 1030) scale(${0.86 + reveal * 0.14}) translate(-540 -1030)`,
      titleLines(local, scene.title, {
        x: 540,
        startY: 920,
        size: scene.titleSize || 60,
        lineHeight: 90,
        color,
        family: config.fontFamily,
      }) +
        rect({
          x: 160,
          y: 1118,
          width: 760,
          height: 234,
          radius: 34,
          fill: color,
          opacity: 0.065,
          stroke: color,
          strokeOpacity: 0.45,
          strokeWidth: 3,
        }) +
        text({
          value: scene.callout || "",
          x: 540,
          y: 1240,
          size: 34,
          fill: color,
          weight: 900,
          anchor: "middle",
          family: config.fontFamily,
        }),
      clamp(reveal, 0, 1),
    ) +
    text({
      value: scene.footer || "",
      x: 540,
      y: 1470,
      size: 25,
      fill: config.palette.muted,
      weight: 750,
      anchor: "middle",
      opacity: scene.footer ? progress(local, 48, 18) : 0,
      family: config.fontFamily,
    });
  return panel(color, local, duration, content, config);
};

const renderScene = (scene, frame, config) => {
  const local = frame - scene.start;
  const duration = scene.end - scene.start;
  switch (scene.type) {
    case "hero":
      return heroScene(scene, local, duration, config);
    case "list":
      return listScene(scene, local, duration, config);
    case "steps":
      return stepsScene(scene, local, duration, config);
    case "chips":
      return chipsScene(scene, local, duration, config);
    case "question":
      return questionScene(scene, local, duration, config);
    default:
      throw new Error(`Unsupported scene type: ${scene.type}`);
  }
};

const renderFrame = (frame, config, storyboard) => {
  const active =
    storyboard.scenes.find(
      (scene) => frame >= scene.start && frame < scene.end,
    ) || storyboard.scenes[storyboard.scenes.length - 1];
  const sceneXml = active
    ? renderScene(active, frame, config)
    : rect({
        x: 68,
        y: 390,
        width: 944,
        height: 1310,
        radius: 42,
        fill: config.panel || "#0a1014",
        opacity: 0.96,
      });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${config.width}" height="${config.height}" viewBox="0 0 ${config.width} ${config.height}">
  <defs>
    <radialGradient id="vignette" cx="50%" cy="38%" r="72%">
      <stop offset="0%" stop-color="#0c1717" stop-opacity="0.22"/>
      <stop offset="70%" stop-color="#05080b" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.72"/>
    </radialGradient>
    <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${config.palette.green}" stop-opacity="0"/>
      <stop offset="48%" stop-color="${config.palette.green}" stop-opacity="0.035"/>
      <stop offset="100%" stop-color="${config.palette.green}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${config.palette.blue}"/>
      <stop offset="52%" stop-color="${config.palette.orange}"/>
      <stop offset="100%" stop-color="${config.palette.green}"/>
    </linearGradient>
  </defs>
  ${background(frame, config)}
  ${sceneXml}
  ${topBar(frame, config)}
  ${avatarChrome(frame, config)}
  ${progressBar(frame, config)}
</svg>`;
};

const writeToStream = (stream, buffer) =>
  new Promise((resolve, reject) => {
    const onError = (error) => {
      stream.off("error", onError);
      reject(error);
    };
    stream.once("error", onError);
    if (stream.write(buffer)) {
      stream.off("error", onError);
      resolve();
      return;
    }
    stream.once("drain", () => {
      stream.off("error", onError);
      resolve();
    });
  });

const createMask = async (size) => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${
      size / 2 - 1
    }" fill="#ffffff"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
};

const ensureConfig = (config) => {
  const required = [
    "width",
    "height",
    "fps",
    "durationFrames",
    "palette",
    "avatar",
    "audio",
    "output",
  ];
  for (const key of required) {
    if (config[key] === undefined || config[key] === null) {
      throw new Error(`config.json is missing ${key}`);
    }
  }
  if (!config.palette.muted) {
    config.palette.muted = "#8c999f";
  }
  config.fontFamily =
    config.fontFamily ||
    "STHeiti, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Arial, sans-serif";
  if (config.avatar.enabled !== false && !config.avatar.source) {
    throw new Error("config.json avatar.source is required when avatar.enabled is true");
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.config) {
    throw new Error("Usage: node render-video.cjs --config /absolute/path/config.json");
  }
  const configPath = path.resolve(args.config);
  const config = readJson(configPath);
  ensureConfig(config);
  const output = resolveFrom(config.output, configPath);
  const preview = config.preview
    ? resolveFrom(config.preview, configPath)
    : output.replace(/\.mp4$/i, "-preview.jpg");
  const audio = resolveFrom(config.audio, configPath);
  const avatarSource = config.avatar.enabled
    ? resolveFrom(config.avatar.source, configPath)
    : null;
  fs.mkdirSync(path.dirname(output), {recursive: true});
  if (preview) {
    fs.mkdirSync(path.dirname(preview), {recursive: true});
  }

  const storyboardFromConfig = config.storyboard;
  if (!storyboardFromConfig) {
    throw new Error("config.json must include storyboard path");
  }
  const storyboard = readJson(resolveFrom(storyboardFromConfig, configPath));
  if (!Array.isArray(storyboard.scenes) || storyboard.scenes.length === 0) {
    throw new Error("storyboard.scenes must contain at least one scene");
  }
  const scenes = [...storyboard.scenes].sort((a, b) => a.start - b.start);
  if (scenes[0].start !== 0 || scenes[scenes.length - 1].end !== config.durationFrames) {
    throw new Error(
      `Storyboard must cover frames 0-${config.durationFrames}; received ${scenes[0].start}-${scenes[scenes.length - 1].end}`,
    );
  }
  for (let index = 0; index < scenes.length; index += 1) {
    if (scenes[index].end <= scenes[index].start) {
      throw new Error(`Invalid scene range at index ${index}`);
    }
    if (index > 0 && scenes[index].start !== scenes[index - 1].end) {
      throw new Error(
        `Storyboard gap or overlap between frames ${scenes[index - 1].end} and ${scenes[index].start}`,
      );
    }
  }
  storyboard.scenes = scenes;

  const maskBuffer = config.avatar.enabled
    ? await createMask(config.avatar.overlay.size)
    : null;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cb-video-"));
  const maskPath = path.join(tempDir, "avatar-mask.png");
  if (maskBuffer) {
    fs.writeFileSync(maskPath, maskBuffer);
  }

  const filter = config.avatar.enabled
    ? `[1:v]scale=${config.avatar.overlay.size}:${config.avatar.overlay.size}:flags=lanczos,format=rgba[avatar];` +
      `[avatar][2:v]alphamerge[masked];` +
      `[0:v][masked]overlay=${config.avatar.overlay.x}:${config.avatar.overlay.y}:format=auto[video]`
    : null;
  const inputArgs = [
    "-y",
    "-hide_banner",
    "-loglevel",
    "warning",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgb24",
    "-s",
    `${config.width}x${config.height}`,
    "-r",
    String(config.fps),
    "-i",
    "pipe:0",
  ];
  if (config.avatar.enabled) {
    inputArgs.push(
      "-i",
      avatarSource,
      "-loop",
      "1",
      "-framerate",
      String(config.fps),
      "-i",
      maskPath,
    );
  }
  inputArgs.push("-i", audio);

  const mapArgs = config.avatar.enabled
    ? ["-filter_complex", filter, "-map", "[video]", "-map", "3:a:0"]
    : ["-map", "0:v:0", "-map", "1:a:0"];
  const ffmpeg = spawn(
    "ffmpeg",
    [
      ...inputArgs,
      ...mapArgs,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-r",
      String(config.fps),
      "-frames:v",
      String(config.durationFrames),
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-shortest",
      "-movflags",
      "+faststart",
      output,
    ],
    {stdio: ["pipe", "inherit", "inherit"]},
  );

  try {
    for (let frame = 0; frame < config.durationFrames; frame += 1) {
      const buffer = await sharp(
        Buffer.from(renderFrame(frame, config, storyboard)),
      )
        .resize(config.width, config.height)
        .removeAlpha()
        .raw()
        .toBuffer();
      await writeToStream(ffmpeg.stdin, buffer);
      if (frame % 120 === 0 || frame === config.durationFrames - 1) {
        console.log(
          `Rendered ${frame + 1}/${config.durationFrames} (${(
            (frame + 1) / config.fps
          ).toFixed(1)}s)`,
        );
      }
    }
    ffmpeg.stdin.end();
    const exitCode = await new Promise((resolve) => {
      ffmpeg.once("close", resolve);
    });
    if (exitCode !== 0) {
      throw new Error(`ffmpeg exited with code ${exitCode}`);
    }
  } finally {
    fs.rmSync(tempDir, {recursive: true, force: true});
  }

  if (preview) {
    execFileSync("ffmpeg", [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      String(config.previewAtSeconds || 1),
      "-i",
      output,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      preview,
    ]);
  }

  console.log(`Video: ${output}`);
  if (preview) {
    console.log(`Preview: ${preview}`);
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
