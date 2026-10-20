---
name: batch-cover-studio
description: Generate and review batches of short-video cover variants from existing video frames or approved still images, using configurable titles, local layouts, safe zones, and ffmpeg plus sharp. Use when the user asks for multiple covers, A/B cover variants, or cover readability review.
---

# Batch Cover Studio

Create a batch of platform-ready cover variants from actual video frames or approved imagery. Keep the workflow local and CPU-based by default.

## Scope

Use this skill for:

- Extracting cover frames from a final video.
- Turning one approved still image into multiple covers.
- Generating title and layout variants.
- Producing a contact sheet for fast comparison.
- Checking dimensions, safe areas, and thumbnail readability.

Do not use this skill to generate a new human likeness, change the speaker's identity, or fabricate a product result.

## Non-negotiables

- Use an actual frame from the approved video whenever possible.
- Keep the face visible and unobstructed.
- Keep important text away from platform UI safe zones.
- Use two to four title lines and prioritize thumbnail readability.
- Do not use misleading claims, fake numbers, or unrelated stock imagery.
- Do not require a GPU for the default template workflow.
- Do not install npm dependencies without the user's permission.

## Workflow

1. Read [references/cover-design.md](references/cover-design.md).
2. Inspect the source with `ffprobe` or `sharp`. Confirm that the video or image exists.
3. Check the environment:

   ```bash
   node scripts/doctor.cjs
   ```

   If `sharp` is missing, ask for permission before running `npm install` in this skill's `scripts/` directory.

4. Copy [assets/cover-config.example.json](assets/cover-config.example.json) to the user's project and replace all absolute paths.
5. Create six to twelve cover entries across at least two layout styles. Use different frames when the speaker's expression changes materially.
6. Generate the batch:

   ```bash
   node scripts/generate-covers.cjs --config /absolute/path/cover-config.json
   ```

7. Inspect `contact-sheet.jpg` and the individual covers. Reject variants with:
   - Cropped face or eyes
   - Text touching edges or platform controls
   - More than four title lines
   - Low contrast at thumbnail size
   - Duplicate titles or nearly identical options
8. Return:

   ```text
   covers/
   ├── cover-01.jpg
   ├── cover-02.jpg
   ├── ...
   └── contact-sheet.jpg
   ```

## Output requirements

- Default size: `1080x1440`, 3:4.
- JPEG quality: high enough for platform upload.
- Every file must have the exact requested dimensions.
- The contact sheet is required for batches larger than three covers.
- State which variants are recommended and why.
- Do not present a batch as ready until the files were opened and visually checked.

## Supporting files

- Cover design rules: [references/cover-design.md](references/cover-design.md)
- Configuration example: [assets/cover-config.example.json](assets/cover-config.example.json)
- Batch generator: [scripts/generate-covers.cjs](scripts/generate-covers.cjs)
- Environment check: [scripts/doctor.cjs](scripts/doctor.cjs)
