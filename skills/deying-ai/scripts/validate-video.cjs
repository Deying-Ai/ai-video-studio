#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
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

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: options.encoding || "utf8",
    stdio: options.stdio,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `${command} failed`);
  }
  return result.stdout;
};

const probe = (input) =>
  JSON.parse(
    run("ffprobe", [
      "-v",
      "error",
      "-count_frames",
      "-show_entries",
      "format=duration,size:stream=index,codec_type,width,height,r_frame_rate,pix_fmt,sample_rate,channels,channel_layout,nb_read_frames",
      "-of",
      "json",
      input,
    ]),
  );

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
  return null;
};

const parseBox = (value) => {
  if (!value) {
    return null;
  }
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    throw new Error("--avatar-box must use x,y,width,height");
  }
  return {
    x: parts[0],
    y: parts[1],
    width: parts[2],
    height: parts[3],
  };
};

const avatarIsDynamic = async ({video, box, sharp}) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cb-video-avatar-"));
  const duration = Number(probe(video).format.duration);
  const times = [
    Math.min(2, duration * 0.1),
    duration * 0.3,
    duration * 0.6,
    duration * 0.85,
  ];
  const files = [];
  try {
    for (const time of times) {
      const file = path.join(tempDir, `frame-${String(time).replace(".", "-")}.png`);
      run("ffmpeg", [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        String(time),
        "-i",
        video,
        "-vf",
        `crop=${box.width}:${box.height}:${box.x}:${box.y}`,
        "-frames:v",
        "1",
        file,
      ]);
      files.push(file);
    }

    if (sharp) {
      const data = await Promise.all(
        files.map((file) =>
          sharp(file).removeAlpha().raw().toBuffer(),
        ),
      );
      const compare = (index) => {
        let diff = 0;
        for (let pixel = 0; pixel < data[index].length; pixel += 1) {
          diff += Math.abs(data[index][pixel] - data[0][pixel]);
        }
        return diff / data[index].length;
      };
      return data.some((_, index) => index > 0 && compare(index) > 1);
    }

    const hashes = files.map((file) =>
      crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
    );
    return new Set(hashes).size > 1;
  } finally {
    fs.rmSync(tempDir, {recursive: true, force: true});
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.video) {
    throw new Error("Usage: node validate-video.cjs --video output.mp4 [--avatar avatar.mp4 --avatar-box x,y,w,h]");
  }
  const video = path.resolve(args.video);
  const metadata = probe(video);
  const videoStream = metadata.streams.find((stream) => stream.codec_type === "video");
  const audioStream = metadata.streams.find((stream) => stream.codec_type === "audio");
  if (!videoStream || !audioStream) {
    throw new Error("Validated output must contain video and audio streams.");
  }

  const fpsParts = videoStream.r_frame_rate.split("/").map(Number);
  const fps = fpsParts[0] / fpsParts[1];
  const checks = {
    width: videoStream.width === 1080,
    height: videoStream.height === 1920,
    fps: Math.abs(fps - 30) < 0.01,
    duration:
      Number(metadata.format.duration) > 0 &&
      Number(metadata.format.duration) < 600,
    audio: audioStream.channels === 2 && Number(audioStream.sample_rate) >= 44100,
    decoded: false,
    dynamicAvatar: null,
  };

  run("ffmpeg", ["-v", "error", "-i", video, "-f", "null", "-"], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  checks.decoded = true;

  if (args.avatar && args["avatar-box"]) {
    checks.dynamicAvatar = await avatarIsDynamic({
      video,
      box: parseBox(args["avatar-box"]),
      sharp: resolveSharp(),
    });
  }

  const report = {
    video,
    metadata: {
      duration: Number(metadata.format.duration),
      size: Number(metadata.format.size),
      width: videoStream.width,
      height: videoStream.height,
      fps,
      pixFmt: videoStream.pix_fmt,
      frames: Number(videoStream.nb_read_frames),
      audioChannels: audioStream.channels,
      audioSampleRate: Number(audioStream.sample_rate),
    },
    checks,
  };
  console.log(JSON.stringify(report, null, 2));

  const required = Object.entries(checks).filter(
    ([key]) => key !== "dynamicAvatar",
  );
  if (required.some(([, value]) => value !== true)) {
    process.exitCode = 1;
  }
  if (checks.dynamicAvatar === false) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
