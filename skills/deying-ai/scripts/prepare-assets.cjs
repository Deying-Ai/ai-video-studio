#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {spawnSync} = require("child_process");

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

const run = (command, args) => {
  const result = spawnSync(command, args, {stdio: "inherit"});
  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status}`);
  }
};

const probe = (input) => {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration:stream=index,codec_type,width,height,sample_rate,channels",
      "-of",
      "json",
      input,
    ],
    {encoding: "utf8"},
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || "ffprobe failed");
  }
  return JSON.parse(result.stdout);
};

const parseCrop = (value) => {
  if (!value) {
    return null;
  }
  const parts = String(value).split(":").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    throw new Error("--crop must use WIDTH:HEIGHT:X:Y, for example 900:900:790:50");
  }
  return {
    width: parts[0],
    height: parts[1],
    x: parts[2],
    y: parts[3],
  };
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args["output-dir"]) {
    throw new Error(
      "Usage: node prepare-assets.cjs --input source.mov --output-dir work/assets [--crop 900:900:790:50]",
    );
  }

  const input = path.resolve(args.input);
  const outputDir = path.resolve(args["output-dir"]);
  const avatarSize = Number(args["avatar-size"] || 420);
  if (!fs.existsSync(input)) {
    throw new Error(`Input not found: ${input}`);
  }
  fs.mkdirSync(outputDir, {recursive: true});

  const metadata = probe(input);
  const video = metadata.streams.find((stream) => stream.codec_type === "video");
  const audio = metadata.streams.find((stream) => stream.codec_type === "audio");
  if (!video || !audio) {
    throw new Error("The source must contain both a video and an audio stream.");
  }

  const defaultSize = Math.min(video.width, video.height);
  const crop =
    parseCrop(args.crop) ||
    {
      width: defaultSize,
      height: defaultSize,
      x: Math.floor((video.width - defaultSize) / 2),
      y: Math.floor((video.height - defaultSize) / 2),
    };

  if (
    crop.width <= 0 ||
    crop.height <= 0 ||
    crop.x < 0 ||
    crop.y < 0 ||
    crop.x + crop.width > video.width ||
    crop.y + crop.height > video.height
  ) {
    throw new Error(
      `Crop ${crop.width}:${crop.height}:${crop.x}:${crop.y} is outside ${video.width}x${video.height}`,
    );
  }

  const avatarPath = path.join(outputDir, "speaker-avatar.mp4");
  const audioPath = path.join(outputDir, "speaker.m4a");
  const manifestPath = path.join(outputDir, "asset-manifest.json");

  run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    input,
    "-vf",
    `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},scale=${avatarSize}:${avatarSize}:flags=lanczos,eq=contrast=1.04:saturation=1.03`,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "17",
    "-pix_fmt",
    "yuv420p",
    "-r",
    "30",
    avatarPath,
  ]);

  run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    input,
    "-vn",
    "-af",
    "loudnorm=I=-16:LRA=11:TP=-1.5",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-ar",
    "48000",
    "-ac",
    "2",
    audioPath,
  ]);

  const manifest = {
    source: input,
    sourceWidth: video.width,
    sourceHeight: video.height,
    durationSeconds: Number(metadata.format.duration),
    avatarPath,
    audioPath,
    avatarSize,
    crop,
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest, null, 2));
};

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
