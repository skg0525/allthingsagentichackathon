# Design notes and project plan

Internal working doc: why the system is shaped the way it is, what was measured,
and the constraints the codebase must not drift from.

---

**Status as of 27 Aug 2026.** Deadline 31 Aug. Four days left.

---

## 1. The problem, stated honestly

I have toured 20+ houses and cannot find one. The reason is not that inventory is
bad — it is that **the things that disqualify a house are not filterable**:

| What actually matters to us | Can Zillow/Redfin filter it? |
|---|---|
| Main entrance facing East or North (Vastu — or South, under Feng Shui) | ❌ Not in the data at all |
| A real bedroom on the ground floor **with a full bath** | ⚠️ "Main floor bed" flag exists, lies constantly |
| Flat, private, fenced backyard — not a drainage slope | ❌ Only lot size |
| Doesn't back onto a four-lane road (toddler) | ❌ |
| Walkable, near the train (we've walked everywhere for 12 years) | ⚠️ Separate sites |
| Mixed Indian/white neighbourhood | ❌ |
| Young enough that the roof and HVAC aren't my problem | ⚠️ Year built only |

Every one of the ❌ rows is visible in the **floor plan** or the **satellite
image**. That is the whole insight: this is a multimodal perception problem
wearing a search-filter costume.

## 2. What we built

An agent that reads the drawings, recovers those facts, scores them against a
profile it keeps learning, and re-ranks continuously.

**The design decision everything else follows from:**

> Gemini does **perception**. Code does **judgement**.

The model is asked exactly one question — *"what is physically in this drawing?"*
It never sees the buyer's weights and never produces a score.

Three things fall out of that:

1. **It caches.** Perception depends only on the images, so it is computed once
   per property, ever. A re-rank is **23ms** and cannot make a model call.
2. **It's reproducible.** The same house always scores the same, so comparing
   houses across weeks means something.
3. **It's auditable.** Every claim ships with the evidence sentence the model
   used. Open the plan and check its work.

## 3. Measured state

| Metric | Before | Now |
|---|---|---|
| Properties | 5 | 8 |
| Re-rank (cached readings) | 29,800ms | **23ms** |
| First analysis (live vision, 10 properties) | 29,800ms + fabricated | varies with API load; shipped pre-computed so it is not on the critical path |
| Images actually sent to Gemini | **0** (fetch was commented out) | 2 per property |
| Perception accuracy vs ground truth | n/a — output was hallucinated from the address | **93% exact, 7% adjacent, 0% wrong** (42 fields) |
| Directional traditions | Vastu, hardcoded | Vastu + Feng Shui, swappable data |
| Feedback box reachability | 3,239px down a 331px pane | docked, always visible |
| Opens with | an auto-scanned grid | nothing scored, until you ask |
| Broken aerial images | 3 of 5 (HTTP 404) | 0 |
| Feedback endpoint | HTTP 500 (Firestore, no credentials) | works, with a local fallback |
| Asset payload | 10.5 MB | 1.7 MB |

## 4. Autonomy — the thing that actually scores

The rubric's biggest slice is *"How much real-world friction does the agent
remove **on its own**? We reward autonomous action... with little to no
hand-holding"* — **40%**. The hackathon's own tagline is *"Most AI today waits
for you to ask. The next generation doesn't."*

So there are two paths through this system:

| Path | Trigger | What happens |
|---|---|---|
| **Reactive** | you click | Analyse the shortlist, re-rank, teach it something |
| **Autonomous** | Cloud Scheduler, 06:00 daily | Pull what's new on the market, read every floor plan and aerial unprompted, score against the profile, **decide alone** whether to surface anything |

The decision is the point. A run that finds nothing writes a brief saying so and
does **not** notify. An agent that pings you about every new listing is a worse
email alert. Verified: 2 new listings → one at 91/100 flagged *worth touring*,
one at 35/100 silently filed. A second cron fire finds nothing and stays quiet.

## 5. Track fit

**The Collaborative Partner** is the right primary track:

- The agent **asks for feedback** on every property and **captures it** as free text.
- It **interprets** that text into concrete weight deltas (`feedbackInterpreter.ts`).
- It **persists** them (Firestore) and **shows the buyer what it learned** —
  `yard 0.95 → 1.00`, with a plain-English note.
- It **adapts**: every property re-ranks immediately, for free.

Also credible for **Best Multimodal UX** (the agent-overlay pins on the floor
plan, the evidence grid) and **Best Architectural Design** (the perception/
judgement split, caching, the tradition-as-data swap, and the degradation story).

## 6. What is left to do

**The todo list lives in [`SUBMISSION.md`](../SUBMISSION.md).** It is the single
place tracking outstanding work, so it cannot drift out of sync with a copy here.

## 7. Honest risk list

- **The dataset is generated, not real MLS.** Say so plainly in the video. Frame
  it as a reproducible fixture with known ground truth — that is *why* `npm run
  verify` can exist, and it is a strength, not an apology. Do not imply it's live
  Zillow data.
- **Vision latency is Google's, not ours, and it swings hard.** The identical
  two-image request measured 1.5s and 23s in different windows, and
  `gemini-3.5-flash` was observed spending 59s to return a 503. This is why the
  perception cache is committed: the demo never depends on catching a good
  window. Prove liveness with a single-property re-read instead.
- **The model 503s under load.** That is Google-side capacity, not quota —
  billing does not fix it. The fallback chain handles it, but rehearse with a
  warm cache so a bad API day cannot sink the recording.
- **Do not present either tradition as objectively correct.** Say plainly that
  they are cultural frameworks and that the tool makes yours explicit.

## 8. After the hackathon — make it real

Replace `mockListings.ts` with a real feed and the rest of the system is unchanged:

1. MLS/IDX feed or a Redfin/Zillow export for listing facts.
2. Google Static Maps Satellite API for real aerials (needs a Maps key).
3. Floor plans are the hard part — many listings have them as PDFs or images;
   the perception layer already accepts either.
4. Cloud Scheduler → Pub/Sub → the existing scan endpoint, running nightly,
   emailing anything scoring above a threshold. The agent loop is already built;
   this is just a trigger and a mail step.

---

# Constraints this codebase must not drift from

## 1. Submission identity
- **Project:** VastuNest
- **Primary track:** The Collaborative Partner
  (asks for feedback, captures it, adapts a persistent profile, re-ranks)
- **Secondary targets:** Best Multimodal UX, Best Architectural Design
- **Deadline:** August 31, 2026

## 2. Mandatory tech — do not drift

| Requirement | Our choice | Status |
|---|---|---|
| Gemini **3.5 or newer** | `gemini-3.5-flash-lite` via `@google/genai` | ✅ |
| Availability fallback | `gemini-3.5-flash` → `gemini-3-flash-preview` | ✅ |
| Google agent framework | Google GenAI SDK (`@google/genai`) | ✅ |
| ≥1 Google Cloud infra service | **Cloud Run** (both services) + **Firestore** | ✅ |
| Bonus: Gemma / Veo / Lyria | not met — `gemini-3.1-flash-image` is still Gemini | ⬜ |

Model IDs are set in `backend/.env`, never hardcoded at a call site.

## 3. Judging rubric alignment

### Innovation & Operational Utility — 40%
The agent recovers facts that **do not exist in any listing feed**: entrance
orientation, kitchen quadrant, whether a main-floor bath has a tub, yard grade,
road adjacency. It reads them off the floor plan and the aerial. No portal filter
can do this. It then acts on them autonomously — ranking, flagging, and
re-ranking without being asked.

Critically, it does this **unprompted**. Cloud Scheduler runs the agent every
morning; it pulls new market listings, reads their floor plans and aerials with
no human in the loop, and decides on its own whether anything justifies a
notification. Staying silent is a deliberate outcome, not a failure.

It also supports **two directional traditions** (Vastu and Feng Shui) that
genuinely disagree, so the tool serves a Chinese household as readily as an
Indian one — and makes the cultural framework explicit rather than smuggling one
in as if it were objective.

### Architectural Discipline & Tech Stack — 30%
- **Perception and judgement are separated.** Gemini answers "what is in this
  drawing?"; `scoringEngine.ts` decides "how well does that fit?" The model never
  sees the buyer's weights and never emits a score.
- **Because of that split, perception caches.** It depends only on the images, so
  a re-rank re-runs arithmetic only: **23ms**, zero model calls. A preference or
  tradition change can never trigger a vision call.
- **Graceful degradation everywhere.** Missing GCP credentials → local JSON store.
  Model 503 → next model in the chain. Vision fails entirely → "Unknown"
  perception and an honest degraded trace, never a fabricated answer.
- **Bounded resources.** Bounded scan concurrency, per-request timeout, capped
  retry rounds, bounded memory documents. Public deployment adds per-IP throttles
  and a per-instance daily model-call budget, both visible on `/api/health`.
- **Judgement is data, not prompt.** Traditions are rule tables in
  `data/traditions.ts`. Adding a third is a data change, not a code change.

### Demo & Production Readiness — 30%
- `npm run verify` (live) and `npm run verify:seed` (offline, instant) both score
  the agent's readings against known ground truth: **93% exact, 7% adjacent,
  0% outright wrong** across 42 fields.
- `/api/health` reports the live model, memory backend, Cloud Run revision, the
  in-flight scan count and the remaining daily model budget.
- Dockerfiles for both services; `min-instances=0` / `max-instances=2`, so idle
  cost is zero and the ceiling is known. `deploy/teardown.sh` removes everything.

## 4. Hard rules for this codebase

1. **Never fabricate a spatial fact.** If the vision pass fails, the field reads
   `Unknown` and the trace says why. A plausible guess is worse than a gap — the
   entire value proposition is that these readings can be trusted.
2. **Ground truth stays out of `mockListings.ts`.** Entrance direction, yard
   grade and the main-floor suite must be recovered from pixels, or the demo is
   theatre.
3. **Never present a tradition as objective truth.** Vastu and Feng Shui are
   cultural frameworks. The UI names the active one, explains its reasoning, and
   lets the user switch. It must never imply one is correct.
4. **No secrets in the repo.** `.env` is gitignored; `.env.example` carries
   placeholders only.
5. **Every user-visible claim ships with its evidence.**
6. **The app opens empty.** No auto-scan. A judge must see the agent work.
7. **The autonomous path must never be decorative.** `/api/agent/run` is the
   real cron target, it is idempotent, and its notify decision is made by the
   agent — not hardcoded to always fire.
