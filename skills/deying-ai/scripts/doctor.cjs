#!/usr/bin/env node

const path = require("path");
const {spawnSync} = require("child_process");

const commandExists = (command) => {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], {
    encoding: "utf8",
  });
  return result.status === 0 && result.stdout.trim();
};

const resolveSharp = () => {
  const candidates = [
    process.env.SHARP_PATH,
    "sharp",
    path.resolve(__dirname, "node_modules/sharp"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const resolved = require.resolve(candidate);
      require(resolved);
      return resolved;
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
  {name: "ffmpeg", ok: Boolean(commandExists("ffmpeg")), detail: "required"},
  {name: "ffprobe", ok: Boolean(commandExists("ffprobe")), detail: "required"},
  {
    name: "sharp",
    ok: Boolean(resolveSharp()),
    detail:
      "Run `npm install` in this scripts directory, or set SHARP_PATH.",
  },
  {
    name: "whisper-cli",
    ok: Boolean(commandExists("whisper-cli")),
    detail: "optional; required only when transcription is needed",
  },
];

let failed = false;
for (const check of checks) {
  const status = check.ok ? "OK" : check.name === "whisper-cli" ? "WARN" : "FAIL";
  console.log(`${status.padEnd(4)} ${check.name.padEnd(12)} ${check.detail}`);
  if (status === "FAIL") {
    failed = true;
  }
}

if (failed) {
  process.exitCode = 1;
}
