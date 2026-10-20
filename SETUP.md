# AI 视频工作室安装说明

## 环境要求

- Codex 支持 Plugin 与 Skill
- Node.js 18 或更高版本
- FFmpeg 与 ffprobe
- 首次使用前安装脚本依赖

## 安装依赖

在插件根目录执行：

```bash
cd skills/deying-ai/scripts
npm install

cd ../../batch-cover-studio/scripts
npm install
```

`whisper-cli` 仅在需要自动转写时使用，不是首版强制依赖。

## 检查环境

```bash
node skills/deying-ai/scripts/doctor.cjs
node skills/batch-cover-studio/scripts/doctor.cjs
```

## 使用

- 完整项目统筹：使用 `$ai-video-production-supervisor`
- 得应风格口播制作：使用 `$deying-ai`
- 批量封面生成：使用 `$batch-cover-studio`

首版不包含数字人生成、文本转语音、声音克隆、声音授权管理或口型同步。
