# Production Workflow

## Stages

| Stage | Required output | Exit condition |
| --- | --- | --- |
| Brief | `project-brief.json` | Audience, goal, platform, and source media are known |
| Topic | `topic-shortlist.md` | One topic is selected with evidence |
| Script | `script.md` | One thesis, supported claims, clear CTA |
| Storyboard | `storyboard.json` | Scenes match the spoken argument |
| Asset prep | Work assets | Speaker face centered and media readable |
| Render | `final.mp4` | Encode completes |
| Cover | `covers/` | Multiple readable variants generated |
| QA | `qa-report.md` | Critical gates pass and score meets threshold |
| Delivery | `delivery-notes.md` | Paths and approvals are complete |

## Delegation

- Supervisor: decisions, briefs, topic scoring, scripts, storyboards, review, and delivery.
- `deying-ai`: transcription, asset preparation, rendering, and media validation.
- `batch-cover-studio`: cover frame selection, text layouts, batch generation, and contact sheet.

Do not duplicate an execution skill's scripts inside the supervisor skill.

## Revision rules

Route each defect to the earliest stage that can fix it:

- Wrong audience or weak promise: topic.
- Weak opening or unsupported claim: script.
- Poor information hierarchy: storyboard.
- Bad speaker crop or motion: assets.
- Broken audio or render artifacts: rendering.
- Cover unreadable at thumbnail size: cover.

## Optional upgrades

Digital-human generation, TTS, voice cloning, and lip sync belong to a separate optional package. They must never be silently installed by this plugin.
