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

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args["output-dir"]) {
    throw new Error(
      "Usage: node transcribe.cjs --input source.mov --output-dir work/analysis [--model /path/ggml-small.bin] [--language zh]",
    );
  }
  const input = path.resolve(args.input);
  const outputDir = path.resolve(args["output-dir"]);
  const model = path.resolve(
    args.model || `${process.env.HOME}/.whisper-cpp/models/ggml-small.bin`,
  );
  const language = args.language || "zh";
  const prefix = args.prefix || "speaker";
  if (!fs.existsSync(input)) {
    throw new Error(`Input not found: ${input}`);
  }
  if (!fs.existsSync(model)) {
    throw new Error(
      `Whisper model not found: ${model}. Pass --model with a local ggml model.`,
    );
  }
  fs.mkdirSync(outputDir, {recursive: true});

  const wavPath = path.join(outputDir, `${prefix}.wav`);
  const outputBase = path.join(outputDir, prefix);
  run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    input,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    wavPath,
  ]);
  run("whisper-cli", [
    "-ng",
    "-m",
    model,
    "-f",
    wavPath,
    "-l",
    language,
    "-otxt",
    "-osrt",
    "-of",
    outputBase,
  ]);
  console.log(`Transcript: ${outputBase}.txt`);
  console.log(`Timeline: ${outputBase}.srt`);
};

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
