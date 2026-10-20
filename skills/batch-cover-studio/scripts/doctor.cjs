#!/usr/bin/env node

const path = require("path");
const {spawnSync} = require("child_process");

const commandExists = (command) => {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], {
    encoding: "utf8",
  });
  return result.status === 0 && Boolean(result.stdout.trim());
};

const resolveSharp = () => {
  const candidates = [
    process.env.SHARP_PATH,
    "sharp",
    path.resolve(__dirname, "node_modules/sharp"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return require.resolve(candidate);
    } catch {
      // Try the next candidate.
    }
  }
  return null;
};

const checks = [
  {
    name: "node",
    ok: Number(process.versions.node.split(".")[0]) >= 18,
    detail: process.versions.node,
  },
  {name: "ffmpeg", ok: commandExists("ffmpeg"), detail: "required for video"},
  {name: "ffprobe", ok: commandExists("ffprobe"), detail: "required for video"},
  {
    name: "sharp",
    ok: Boolean(resolveSharp()),
    detail: "Run `npm install` in this scripts directory, or set SHARP_PATH.",
  },
];

let failed = false;
for (const check of checks) {
  const status = check.ok ? "OK" : "FAIL";
  console.log(`${status.padEnd(4)} ${check.name.padEnd(10)} ${check.detail}`);
  if (!check.ok) failed = true;
}

if (failed) process.exitCode = 1;
