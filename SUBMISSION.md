# Submission checklist — All Things Agentic Hackathon

**Deadline: 31 August 2026.** Everything Devpost asks for, in order, with what
to paste where.

---

## 1. Mandatory tech — all three required, all three met

| Requirement | Our answer | Status |
|---|---|---|
| Gemini **3.5 or newer**, via Gemini API or Vertex AI | `gemini-3.5-flash-lite` through the Google GenAI SDK. Falls back to `gemini-3.5-flash`, then `gemini-3-flash-preview` | ✅ |
| ≥1 Google agent framework (ADK, GenAI SDK, Antigravity SDK, GenKit) | **Google GenAI SDK** (`@google/genai`) — structured `responseSchema`, `thinkingLevel`, system instructions | ✅ |
| ≥1 Google Cloud infra service (Cloud Run, Cloud SQL, Firestore, GKE, Pub/Sub) | **Cloud Run** (both services) + **Firestore** (profiles, briefs) + **Cloud Scheduler** (the autonomous cycle) | ✅ deployed |

**On the "extra Google AI models" bonus:** the rules name *"Gemma, Veo or Lyria."*
We use `gemini-3.1-flash-image`, which is still Gemini — so **do not claim this
bonus**. It is a genuine technical point worth mentioning in the write-up, but it
is not what that line is asking for.

If you want the bonus properly, the cheapest real option is **Veo**: generate a
short establishing clip per property from the exterior image. Half a day, and it
strengthens the Multimodal UX angle. Only worth it if the deploy and video are
already done.

---

## 2. Track

**The Collaborative Partner.** It asks for feedback on every property, captures
it as free text, interprets it into concrete weight changes, persists them, shows
you what it learned, and re-ranks. Secondary fits: Best Multimodal UX, Best
Architectural Design.

---

## 3. What to submit

### ✅ Hosted project URL — LIVE

**https://vastunest-ui-555426598641.us-central1.run.app**

Agent API: https://vastunest-agent-555426598641.us-central1.run.app
Health:    https://vastunest-agent-555426598641.us-central1.run.app/api/health

Project `gen-lang-client-0460749914` · region `us-central1`. No custom domain
needed — Cloud Run's own hostname is a valid hosted URL.

> The rules say the app need not be live at judging time, so you can delete the
> services after recording to keep spend at zero. `min-instances=0` means idle
> cost is already ~$0.

### ✅ Public code repository
`https://github.com/skg0525/allthingsagentichackathon`

If you keep it private, share it with `testing@devpost.com` and
`cloudhackathons@google.com`.

### ⬜ Text description

**Features and functionality** — draft:

> VastuNest is an autonomous home-buying agent that reads what listing portals
> can't index. Zillow filters on price, beds and baths; it has no filter for
> which way the front door faces, whether the ground-floor bathroom actually has
> a tub, whether the backyard is flat or drops away, or whether the lot backs
> onto a four-lane road. None of that is in the listing data — all of it is in
> the floor plan and the satellite image.
>
> Gemini 3.5 Flash reads both and reports what it sees, citing the visual
> evidence for every claim. A deterministic scoring engine — not the model —
> turns that into a match score against a preference profile the agent keeps
> learning. Tell it "it fronts a four-lane road, that's a dealbreaker with a
> toddler" and it converts that into weight changes, persists them to Firestore,
> and re-ranks every property in 23ms.
>
> It also runs without you. Cloud Scheduler triggers an overnight cycle that
> pulls new market listings, reads their floor plans unprompted, and decides on
> its own whether anything justifies a notification. Staying silent is a
> deliberate outcome.
>
> Directional rules are data, not code. Vastu Shastra and Feng Shui genuinely
> disagree — a south-facing entrance is a Vastu flaw and the Feng Shui ideal — so
> switching tradition re-orders the entire list with no model call.

**Technologies used:** Gemini 3.5 Flash (vision + structured output) via the
Google GenAI SDK; Gemini 3.1 Flash Image; Cloud Run; Firestore; Cloud Scheduler;
Secret Manager; Next.js 16, Tailwind v4, TypeScript.

**Cost and abuse controls:** Cloud Run `min-instances=0` / `max-instances=2`;
per-IP throttles on every route that can trigger a model call; a per-instance
daily model-call budget surfaced on `/api/health`; perception caching so a
re-rank costs nothing.

**Other data sources:** Curated fixture dataset of 10 properties. Floor plans and
aerials generated with Gemini 3.1 Flash Image from written scene briefs, which is
what makes the ground truth knowable — see `npm run verify`. Neighbourhood
figures (Walk Score, transit, school ratings, crime index, diversity) are
representative values for the Atlanta north-metro corridor.

**Findings and learnings:** see the section at the bottom of `README.md`.

### ✅ Spin-up instructions
In `README.md` under **Spin-up** and **Deploy to Google Cloud**.

### ⬜ Architecture diagram
Mermaid diagram in `README.md`. **Export it to PNG** for the Devpost gallery —
paste the block into <https://mermaid.live> and download.

### ⬜ ~4-minute demo video
Script and recording playbook: `docs/DEMO.md`.

Must contain, per the rules:
- [ ] The problem
- [ ] Value proposition
- [ ] The app working
- [ ] **Visible proof the backend runs on Google Cloud** — Cloud Run console,
      the `.run.app` URL, Vertex/Gemini logs, the Firestore document
- [ ] Upload as **public** on YouTube

---

## 4. Bonus points (optional, cheap, worth doing)

### ⬜ Publish a build write-up
Medium, dev.to, or YouTube. Must be **public**, not unlisted, and must state it
was created for this hackathon.

Angle that will actually get read: *"I let Gemini score houses and it lied to me
— so I stopped letting it score anything."* The perception/judgement split, the
93% verification harness, and the 29.8s → 23ms story are the substance.

Required line: *"I created this content for the purposes of entering the All
Things Agentic Hackathon."*

### ⬜ Social post
LinkedIn or X with **`#AllThingsAgenticHackathon`**. A 20-second clip of the
tradition switch re-ordering the list is the most watchable moment.

### ⬜ Extra Google AI model (Gemma / Veo / Lyria)
Not currently met — see the note in section 1. `gemini-3.1-flash-image` is
Gemini, not one of the three named families.

---

## 5. Judging rubric — where we stand

**Innovation & Operational Utility (40%)** — recovers facts no portal indexes;
runs autonomously on a schedule and decides alone whether to speak. Strong.

**Architectural Discipline & Tech Stack (30%)** — perception separated from
judgement; deterministic reproducible scoring; caching that follows from that
split; Firestore with graceful local fallback; model fallback chain; bounded
concurrency, timeouts and retries; honest degradation (`Unknown`, never a
fabricated answer). Strong.

**Demo & Production Readiness (30%)** — verification harness proving 93% exact
across 42 fields, reproducible offline via `npm run verify:seed`; `/api/health`
reporting live model, memory backend and Cloud
Run revision; one-command deploy; demo reset script that verifies its own work.
**Gated on the deploy actually happening.**

---

## 6. Remaining, in order

1. ✅ **Pushed to GitHub** — https://github.com/skg0525/allthingsagentichackathon
2. ✅ **Deployed to Cloud Run** — UI, agent, Firestore and Cloud Scheduler all live
3. ⬜ Export the architecture diagram to PNG ([mermaid.live](https://mermaid.live))
4. ⬜ Record the video (`docs/DEMO.md`)
5. ⬜ Fill in the Devpost form
6. ⬜ Bonus: blog post + social post
7. ⬜ **After recording:** `./deploy/teardown.sh gen-lang-client-0460749914`

### Live proof shots for the video

| Tab | What it shows |
|---|---|
| https://vastunest-ui-555426598641.us-central1.run.app | The app |
| https://vastunest-agent-555426598641.us-central1.run.app/api/health | `"memoryBackend":"firestore"`, the model, the Cloud Run revision |
| Cloud Run console | Two services, `min-instances 0` |
| Firestore console | `buyerProfiles/demo_buyer_1` — the weights the agent learned |
| Cloud Scheduler | `vastunest-overnight`, 06:00 daily |
