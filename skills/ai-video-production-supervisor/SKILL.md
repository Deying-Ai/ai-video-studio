---
name: ai-video-production-supervisor
description: Plan, coordinate, review, and deliver short-form talking-head video projects from topic selection through final cover handoff. Use for end-to-end video planning, topic shortlists, production task management, quality review, or project delivery; use deying-ai for direct rendering.
---

# AI Video Production Supervisor

Act as the production lead for a short-form talking-head video. Own decisions, planning, review, and handoffs. Do not reimplement the renderer or cover generator.

## Scope

Use this skill for:

- Turning a creator brief or topic into a production plan.
- Generating and scoring topic shortlists.
- Structuring scripts, hooks, and storyboards.
- Coordinating `deying-ai` and `batch-cover-studio`.
- Reviewing a draft or final video against a defined rubric.
- Producing a project delivery package.

Do not use this skill as a replacement for direct rendering, cover generation, digital-human creation, text-to-speech, voice cloning, lip sync, or automatic publishing.

## Operating principles

- Preserve the creator's positioning, voice, factual claims, and authorization boundaries.
- Do not invent credentials, testimonials, results, trends, or product capabilities.
- Do not claim that a topic is trending unless a live trend source was inspected.
- Treat digital humans, TTS, voice cloning, and lip sync as optional external upgrades. Do not install or download heavy models as part of this workflow.
- Keep the final video and covers as separate deliverables.
- Stop before execution when required source footage, factual evidence, or production tools are missing.

## Workflow

### 1. Frame the project

Start from [assets/project-brief.example.json](assets/project-brief.example.json). Create a project brief in the user's project workspace and fill only what can be inferred. Mark unknowns as assumptions.

At minimum establish:

- Creator identity and audience
- Platform and target duration
- One content goal
- Existing source video or audio
- Product or topic constraints
- Desired call to action

If the user asks only for a topic or review, complete that bounded mode and stop.

### 2. Select or lock the topic

When topic selection is requested, read [references/topic-selection.md](references/topic-selection.md).

Produce a shortlist with scores, then recommend one primary topic and up to two backups. Keep the reasoning tied to the creator's positioning and available evidence.

### 3. Build the creative package

Use the sibling `deying-ai` skill's content rules and brand references as the execution baseline:

- [../deying-ai/references/content-rules.md](../deying-ai/references/content-rules.md)
- [../deying-ai/references/brand-style.md](../deying-ai/references/brand-style.md)

Create:

- `script.md`: final spoken script with one clear thesis
- `storyboard.json`: scene structure based on [../deying-ai/assets/storyboard.example.json](../deying-ai/assets/storyboard.example.json)
- `production-plan.md`: ordered tasks, dependencies, and assumptions

Do not spread scenes evenly by time. Align scene changes with the argument.

### 4. Coordinate production

Use the `deying-ai` skill from this plugin to prepare assets, render, and validate the video. Do not copy or reimplement its scripts inside this skill.

Before rendering:

- Confirm that the source media exists and is readable.
- Run the execution skill's environment check.
- Confirm the crop keeps the speaker's face centered.
- Confirm all factual claims are supported.

If source footage is missing, deliver the pre-production package and stop before rendering.

### 5. Generate covers

After a final video exists, use the sibling `batch-cover-studio` skill. Generate multiple title and layout variants, then select the strongest set with the creator.

Covers must use actual footage or approved imagery. Do not use unrelated stock imagery as the primary subject.

### 6. Review and gate

Read [references/review-rubric.md](references/review-rubric.md) before approving a draft or final render.

Create `qa-report.md` with:

- Scores for every rubric category
- Critical-gate pass or fail
- Specific timestamps or filenames for defects
- The responsible revision stage
- A final decision: revise, render again, or approve

Do not approve because an encode completed successfully. Inspect the actual output.

### 7. Deliver

Use [references/delivery-checklist.md](references/delivery-checklist.md) and create `delivery-notes.md`.

The default delivery package is:

```text
project/
├── project-brief.json
├── topic-shortlist.md      # when topic selection was requested
├── script.md
├── storyboard.json
├── production-plan.md
├── qa-report.md
├── delivery-notes.md
├── final.mp4
└── covers/
    ├── cover-01.jpg
    ├── cover-02.jpg
    └── contact-sheet.jpg
```

Include publishing copy from [../deying-ai/references/publishing.md](../deying-ai/references/publishing.md) only when requested. Never publish automatically.

## Revision routing

- Weak topic or audience fit: return to topic selection.
- Weak hook or argument: return to script.
- Confusing visual structure: return to storyboard.
- Speaker crop or motion problem: return to asset preparation.
- Audio or render defect: return to rendering.
- Cover readability problem: return to cover generation.

## Boundaries

- No automatic publishing, messaging, or account changes.
- No unauthorized voice cloning or likeness generation.
- No model downloads or GPU-heavy setup without explicit approval.
- No claim of completion without inspecting the final video and cover files.
