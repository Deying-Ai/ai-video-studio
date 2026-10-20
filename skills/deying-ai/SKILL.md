---
name: deying-ai
description: Create or adapt 9:16 cross-border ecommerce talking-head videos from raw footage, including transcription, script structure, dynamic circular speaker treatment, animated information scenes, rendering, and final media validation. Use when the user wants the established dark green-grid short-video style or a reusable workflow for producing these videos from audio, video, text, or a topic.
---

# Cross-Border Video Workflow

Create a complete short-form video without treating the speaker window as a static image. The default deliverable is a `1080x1920`, `30fps` MP4 with H.264 video, AAC stereo audio, and no burned-in subtitles.

## Non-negotiables

- Keep the established `#05080b` background and subtle dark-green `34px` grid unless the user explicitly changes the brand.
- Use a circular speaker window, keep the person's face centered, and composite the speaker as dynamic video rather than a screenshot.
- Keep important copy inside the central information panel and leave the circular speaker unobstructed.
- Do not add bottom subtitles in the default template.
- Match scene changes to the spoken argument. Do not spread animation evenly across the whole video.
- Validate the final file after rendering; a successful encode is not enough.

## Workflow

1. Inspect every supplied media file with `ffprobe`.
2. If no accurate script exists, transcribe the source with local Whisper and align scene boundaries to the spoken argument.
3. Read [references/content-rules.md](references/content-rules.md) before writing or restructuring the script.
4. Read [references/brand-style.md](references/brand-style.md) before designing scenes.
5. Prepare normalized audio and a face-centered dynamic avatar:

   ```bash
   node scripts/prepare-assets.cjs \
     --input /absolute/path/source.mov \
     --output-dir /absolute/path/work/assets \
     --crop 900:900:790:50
   ```

   Omit `--crop` to use a centered square crop. Inspect the result and adjust the crop when the face is not centered.

6. Create a storyboard using [assets/storyboard.example.json](assets/storyboard.example.json). Use [assets/config.example.json](assets/config.example.json) for paths, colors, avatar placement, and output settings.
7. Run the environment check if the machine has not produced one of these videos before:

   ```bash
   node scripts/doctor.cjs
   ```

8. Render with the reusable engine:

   ```bash
   node scripts/render-video.cjs --config /absolute/path/config.json
   ```

9. Validate the result:

   ```bash
   node scripts/validate-video.cjs \
     --video /absolute/path/output.mp4 \
     --avatar /absolute/path/assets/speaker-avatar.mp4 \
     --avatar-box 825,161,158,158
   ```

10. Read [references/publishing.md](references/publishing.md) when the user asks for titles, publishing copy, or hashtags.

## Adaptation rules

- Treat the workflow as configurable. Do not copy another creator's personal paths, face, logo, voice, source media, output folders, or API keys into a shared skill package.
- Keep branding parameters in `config.json`; keep editorial content in `storyboard.json`.
- Preserve the argument and factual claims when rewriting. Improve the hook, retention, save value, and comment prompt without changing the core meaning.
- For a new visual request, borrow the motion grammar rather than copying another creator's exact frame composition. Rebuild the palette, card structure, and transitions to reduce platform similarity.
- When visual quality and render reliability conflict, prefer clear hierarchy, correct timing, and readable text.

## Supporting files

- Brand system: [references/brand-style.md](references/brand-style.md)
- Script and retention rules: [references/content-rules.md](references/content-rules.md)
- Publishing copy and hashtags: [references/publishing.md](references/publishing.md)
- Reusable render inputs: [assets/config.example.json](assets/config.example.json), [assets/storyboard.example.json](assets/storyboard.example.json)
