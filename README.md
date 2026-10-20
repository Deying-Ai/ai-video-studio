# AI 视频工作室

面向短视频创作者的 Codex Plugin，覆盖从选题、脚本、分镜、口播视频制作到批量封面的核心流程。

## 包含的 Skill

- `ai-video-production-supervisor`：选题评分、项目拆解、制作统筹、质量审核与交付
- `deying-ai`：得应风格 9:16 口播视频的素材准备、渲染和验证
- `batch-cover-studio`：从成片截帧，本地批量生成 1080×1440 封面和对比图

## 首版范围

包含：

- 选题与内容方向
- 口播脚本结构
- 分镜制作
- 9:16 口播视频渲染
- 音画与人物位置验证
- 批量封面生成
- 标题、发布文案和标签建议

暂不包含：

- 数字人生成
- 文本转语音
- 声音克隆与授权管理
- 口型同步
- 自动发布到抖音

这些重型能力计划作为单独的可选升级包，不进入轻量核心包。

## 环境要求

- Node.js 18 或更高版本
- FFmpeg 与 ffprobe
- `whisper-cli` 仅在使用自动转写时需要

## 安装

```bash
git clone https://github.com/Deying-Ai/ai-video-studio.git
cd ai-video-studio

cd skills/deying-ai/scripts
npm install

cd ../../batch-cover-studio/scripts
npm install
```

完整说明见 [SETUP.md](./SETUP.md)。

## 使用

```text
用 $ai-video-production-supervisor 帮我把这个主题做成一条完整口播视频。
用 $deying-ai 制作一条得应风格的 9:16 口播视频。
用 $batch-cover-studio 为这条成片生成 6 张抖音封面。
```

## 项目结构

```text
ai-video-studio/
├── .codex-plugin/plugin.json
├── assets/icon.png
├── skills/
│   ├── ai-video-production-supervisor/
│   ├── batch-cover-studio/
│   └── deying-ai/
└── SETUP.md
```

## 设计原则

- 选题和审核由主管 Skill 负责。
- 实际视频渲染由 `deying-ai` 负责，不重复实现。
- 封面作为独立交付物，但随插件一起安装。
- 重型生成能力独立升级，避免提高所有使用者的硬件门槛。
