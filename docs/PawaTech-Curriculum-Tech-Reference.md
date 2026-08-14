# PawaTech Curriculum — Technology & Sandbox Reference

**Status:** Checkpoint / working draft
**Companion to:** `PawaTech-PyGolfers-Architecture-Reference.md` (identity, schema, security, badges, dashboards, roadmap)
**Purpose:** Consolidated technology decisions for turning the offline 8-week curriculum into PyGolfers functionality. Nothing described here currently exists on the platform — this is a from-scratch build, not an integration against existing infrastructure.

---

## A. Week-by-week technology matrix

| Week | Curriculum Module | New tech/library needed | Sandbox type | Notes |
|---|---|---|---|---|
| 1 | Computer Fundamentals | `dnd-kit` (or equivalent drag-and-drop library) | None | Pure front-end widget — "Label a Computer" interactive. No backend execution. |
| 2 | MS Word & PowerPoint | Keybr API embed, or a custom typing-test component | None | Captures WPM client-side, POSTs result to `WPMResult` table. |
| 3 | Microsoft Excel / Data Skills | Pyodide (client-side) + Piston or Judge0 (server-side grading) + pandas/matplotlib available in both | Python | First week requiring the code sandbox. pandas/matplotlib must be confirmed available in whichever sandbox image is used. |
| 4 | Graphic Design & Internet Safety | Canva (external link, no integration) + sandboxed `<iframe>` for live HTML/CSS preview | Iframe render only | Not a code-execution sandbox — a `sandbox` attribute on the iframe (no scripts, restricted permissions) is sufficient since it's static HTML/CSS, not executable code. |
| 5 | AI & Prompt Engineering | Claude or Gemini API, called from a Next.js server route only | None | This is an LLM API call, not code execution — never expose the API key client-side. Needs rate limiting and content moderation/guardrails given the audience is minors — flagged for director input, not just an engineering decision. |
| 6 | Arduino Basics | Pyodide + Piston/Judge0 (for boolean/sequence logic challenges) + Wokwi.com iframe embed (circuit simulation) | Python | Wokwi is a straightforward iframe embed — no execution engine to build on your side for the circuit simulation itself. |
| 7 | Traffic Light & Sensors | Pyodide + Piston/Judge0 + YouTube iframe embeds | Python | Same sandbox as Weeks 3 and 6. Video is embedded, not hosted. |
| 8 | Final Projects & Showcase | Supabase Storage (photo uploads) + showcase gallery UI | None | Recommend linking out to YouTube for any video rather than storing raw video files — avoids owning hosting/transcoding costs. |

**Only three weeks (3, 6, 7) touch the code-execution sandbox.** The rest are either no-execution widgets, an LLM API call, or a much lighter "safely render static HTML" problem — worth keeping that distinction clear in planning, since the sandbox is the one piece of genuinely new, security-sensitive infrastructure.

---

## B. Python sandbox architecture

### Why two layers, not one

| Layer | Technology | Purpose | Trustworthy for grading? |
|---|---|---|---|
| Live feedback | **Pyodide** (Python compiled to WebAssembly, runs in-browser) | Instant "type code, hit run, see output" while a student is working | No — runs entirely client-side, so a technically savvy user could tamper with it before submission |
| Graded submission | **Piston** or **Judge0** (self-hosted, purpose-built code-execution engines) | Re-runs the final submitted code in an isolated, resource-limited container | Yes — this is the only result that should ever write to `ChallengeAttempt.passed` and feed the points ledger |

**Do not build the isolation/sandboxing logic yourselves.** Safely running untrusted code against container-escape and resource-exhaustion attacks is a hard security problem, and this platform is used by children — use an established, purpose-built open-source engine (Piston or Judge0) rather than a first attempt at this in-house.

### What the sandbox layer must enforce, regardless of which engine is chosen

1. Full isolation — no filesystem access to the host, no outbound network calls, no visibility into other students' data.
2. Hard resource limits — execution timeout (a few seconds), memory cap, CPU limit. Without this, one runaway loop from a student can take down shared infrastructure.
3. Captured stdout/return values, compared against the challenge's expected test cases to produce pass/fail.
4. Required libraries available inside the execution image — this is where pandas/matplotlib support needs to be explicitly confirmed for Week 3.
5. Fast enough turnaround to feel interactive for the Pyodide layer; the graded server-side pass can be slower since it only runs on submission, not on every keystroke.

---

## C. Hosting architecture

**Vercel is the wrong place to run Piston/Judge0 directly.** Serverless functions are ephemeral, have tight execution time caps, and Piston/Judge0 expect to run as long-lived Docker services managing their own pool of isolated containers — not a shape serverless functions are built for.

**Recommended split:**

```
┌─────────────────────────┐          ┌──────────────────────────┐
│   Next.js on Vercel      │  fetch() │  Piston/Judge0 on         │
│   (frontend + API routes)│ ───────► │  Fly.io / Railway / Render │
│   Orchestrates the app   │ ◄─────── │  Runs untrusted code       │
└─────────────────────────┘  result  └──────────────────────────┘
```

- Next.js (Vercel) stays the single frontend + backend surface for everything else in the platform — auth, dashboards, badge panel, curriculum content.
- The sandbox service runs separately, on infrastructure built for long-running containers (Fly.io, Railway, Render, or a self-managed VPS with Docker).
- Next.js API routes call the sandbox service by URL and store the result — the sandbox never talks to Supabase directly, keeping it a narrow, single-purpose service.

**Security requirements for this split, non-negotiable from day one:**
- An API key or shared secret between the Next.js backend and the sandbox service — it must never be a public, unauthenticated endpoint, or anyone who finds the URL can run arbitrary code on your infrastructure for free.
- A request timeout on the Next.js side that matches the sandbox's own execution limit, so a hung sandbox request doesn't hang the API route too.

---

## D. Content model pattern (from curriculum mapping analysis)

Reviewing the curriculum-to-platform mapping column revealed a consistent pattern worth formalizing as schema, since it directly shapes how Learning Tracks get built:

- **Routing is topic-based, not week-based** — every track slug (`/learn/computer-fundamentals`, `/learn/digital-productivity`, `/learn/data-skills`, `/learn/digital-citizenship`, `/learn/ai-and-prompting`) is a domain concept, never `/learn/week-1`. This decouples a track's identity from which week it happens to be taught in.
- **Every track has an explicit, ordered lesson list** — always given as a fixed count in the source curriculum (5 lessons, 2 sub-tracks, 4 lessons). This means a `Lesson` child entity with an `order` field is needed, not just a track description.
- **Hybrid weeks attach a Challenge to a Track rather than replacing it** — Weeks 2, 3, and 5 are all "Track *plus* Challenge," where the challenge is what makes the track's concept concrete and gradable.
- **Week 4 is the exception that defines the model's flexibility** — it maps to *two* separate things (a real Track for Internet Safety, a non-track fallback with external links for Graphic Design). A week needs to support zero, one, or more Tracks and/or standalone Challenges — never assume exactly one.

**Proposed entities (not yet built, recommended next step):**

| Entity | Purpose |
|---|---|
| `LearningTrack` | `id`, `slug`, `title`, `description` |
| `Lesson` | `id`, `track_id` (FK), `title`, `content`, `order` |
| `CurriculumWeek` | `id`, `week_number`, links to zero or more `LearningTrack` and/or `Challenge` rows |
| `LessonProgress` | Insert-only, per student per lesson — same append-only pattern as `ChallengeAttempt`, used to compute track completion for badge triggers like `track_complete` |

This closes the biggest open item flagged in the main architecture reference doc (Learning Tracks weeks 1–5 content model was previously undesigned).

---

## E. Full technology stack summary

| Category | Technology |
|---|---|
| Frontend + backend framework | Next.js |
| Hosting (app) | Vercel |
| Database, Auth, Storage, Realtime, scheduled jobs | Supabase (Postgres, Row Level Security, `pg_cron`) |
| Client-side Python execution | Pyodide |
| Server-side graded code execution | Piston or Judge0 |
| Sandbox hosting | Fly.io, Railway, or Render (separate from Vercel) |
| Drag-and-drop (Week 1) | `dnd-kit` |
| Typing trainer (Week 2) | Keybr API or custom component |
| Design tool (Week 4) | Canva (external link only) |
| AI prompting (Week 5) | Claude or Gemini API, server-side call only |
| Circuit simulation (Week 6) | Wokwi.com iframe embed |
| Video (Week 7, 8) | YouTube iframe embeds |
| Media storage (Week 8) | Supabase Storage |
| Badge artwork | Adobe Illustrator (design) → SVG/PNG export → Supabase Storage → CDN |

---

## F. Build sequencing note

The Python sandbox (Section B/C above) is genuinely separate infrastructure from "writing Week 3's content" — it needs to exist before Weeks 3, 6, or 7 can function at all, and it carries real security requirements of its own. Treat it as its own line item in the build plan, not something folded into curriculum-writing estimates.

---

## G. Open items

- Confirm pandas/matplotlib availability inside the chosen sandbox engine's execution image (Piston and Judge0 differ in default language/library support — needs verification against whichever is chosen).
- `LearningTrack` / `Lesson` / `CurriculumWeek` / `LessonProgress` entities are proposed but not yet finalized or cross-checked against the badge `trigger_rule` needs from the main reference doc (e.g. `track_complete` triggers).
- Content moderation/guardrail approach for the Week 5 AI widget — flagged for director input given the platform serves minors.
- Rate limiting strategy and cost controls for the Claude/Gemini API calls in Week 5.
- Choice between Piston vs. Judge0 not yet made — worth a short comparison pass (language support, self-hosting complexity, community maintenance) before committing.

---

*End of checkpoint. Use alongside `PawaTech-PyGolfers-Architecture-Reference.md` for full project context.*
