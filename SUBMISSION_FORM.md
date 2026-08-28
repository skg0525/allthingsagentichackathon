# Devpost form — copy and paste

Everything the form asks for, ready to go. Fields marked **⚠ CHECK** need your
input before you paste.

---

## Project name

```
VastuNest
```

## Elevator pitch (200 char limit)

```
Zillow can't tell you which way the front door faces. VastuNest reads floor plans and satellite images with Gemini, scores homes against the criteria that actually rule them out, and works overnight.
```

*(196 characters)*

---

## About the project

Paste as Markdown.

```markdown
## The problem

We have toured 22 houses and still haven't bought one.

The reason isn't that there's nothing available. It's that the things which
actually rule a house out for us aren't filters on any listing site:

- Which direction the front door faces. That's Vastu, and it isn't negotiable in my family.
- Whether the ground-floor bathroom has a tub, or only a toilet and a sink — my parents will be staying with us.
- Whether the backyard is flat and fenced, or drops away into a drainage problem. We have a toddler.
- Whether the lot backs onto a four-lane road.

None of that is a field in any listing feed. All of it is sitting in the floor
plan and the satellite image. So it isn't a search problem. It's a vision
problem.

## What it does

VastuNest sends Gemini two images per property — the floor plan and the aerial —
and asks one question: what is physically in this drawing? It comes back with the
entrance direction, the kitchen quadrant, whether a main-floor bathroom contains
a tub, the yard grade, and whether the lot abuts a major road. Every claim quotes
the visual evidence it came from.

A TypeScript scoring engine, not the model, turns that into a match score against
a preference profile. Tell it "it fronts a four-lane road, that's a dealbreaker
with a toddler" and it converts that into weight changes, saves them to
Firestore, and re-ranks everything.

It also runs without being asked. Cloud Scheduler triggers it every morning; it
reads whatever hit the market overnight and decides on its own whether anything
justifies telling you. Staying quiet is a valid outcome — an agent that pings you
about every new listing is just a worse email alert.

When you've decided what's worth seeing, it plans the day: orders the stops by
geography, allocates realistic time at each one, says what to verify at each door
given what it already found in the plan, and returns a Google Maps route.

## How I built it

The decision everything else follows from: **Gemini does perception, code does
judgement.** The model is never shown the buyer's weights and never asked for a
score.

That split buys three things:

1. **Perception caches.** It depends only on the images, so it's computed once
   per property. A re-rank costs 23ms and no model call.
2. **Scores are reproducible.** The same house scores the same number every time,
   so comparing houses week over week means something.
3. **The rulebook is swappable.** Vastu and Feng Shui are rule tables, not code.
   They genuinely disagree — a south-facing entrance is a flaw in one and the
   classical ideal in the other — so switching re-ranks the entire list without
   calling Gemini at all.

Stack: Gemini 3.5 Flash-Lite through the Google GenAI SDK, two Cloud Run services
at min-instances 0, Firestore for the preference profile and agent briefs, Cloud
Scheduler for the overnight cycle, Cloud Trace for OpenTelemetry spans, Secret
Manager for the key. Next.js 16 and Tailwind on the front.

## What I learned

**Measuring the model mattered more than choosing it.** The floor plans and
aerials are generated from written specs with Gemini 3.1 Flash Image, which is
the only reason ground truth is knowable. `npm run verify:seed` scores the
agent's readings against that answer key offline: 93% exact, 0% wrong across 42
fields. Nothing read backwards. With scraped listings I'd have had no answer key
and no way to tell a confident output from a correct one.

**gemini-3.5-flash was the wrong default.** Measured on identical two-image
requests, it once took 59 seconds to return a 503. gemini-3.5-flash-lite answered
the same request in 1.5 seconds at equal accuracy. Both satisfy the model
requirement. I now run a fallback chain and record which model produced each
reading.

**503 UNAVAILABLE is not 429 RESOURCE_EXHAUSTED.** Every failure I hit was
capacity on Google's side, not my quota. Enabling billing doesn't fix it. A
fallback chain does.

**Three bugs could only surface on Cloud Run.** The Firestore client throws an
uncaught exception when credentials are missing, from a deferred gRPC stub
outside any try/catch. The local fallback then crashed writing beside the app,
because the filesystem is read-only outside /tmp. And OpenTelemetry's batch
processor never flushes, because CPU is throttled to near zero between requests.

**A cache clear that races a live scan is worse than no clear.** It reports
success and silently refills. `/api/cache/clear` now refuses while a scan is in
flight.

## Challenges

The honest one: the first version was a lie. It looked like it was analysing
floor plans, but the image-fetching code was commented out — every audit was
hallucinated from the street address. Scans took 30 seconds, three of five
aerial images were 404ing, and the feedback endpoint returned 500 on every call.
Rebuilding it around the perception/judgement split is what made the rest
possible.
```

---

## Built with

Add these as tags (25 max):

```
gemini · google-genai-sdk · gemini-3.5-flash-lite · gemini-3.1-flash-image ·
google-cloud · cloud-run · firestore · cloud-scheduler · cloud-trace ·
secret-manager · opentelemetry · google-maps · typescript · node.js · express ·
next.js · react · tailwindcss · server-sent-events · docker · zod · vision-ai ·
multimodal · computer-vision
```

---

## Form answers

| Field | Answer |
|---|---|
| **Category** | **Collaborative Partner** |
| Submitter type | ⚠ CHECK — Individuals, unless you have a team |
| Country of residence | United States |
| Organization name | Leave blank (not entering Startup Excellence) |
| **Date started** | ⚠ CHECK — the date you actually opened the first file |
| Code repo | `https://github.com/skg0525/allthingsagentichackathon` |
| Reproducible testing instructions in README? | **Yes** |
| Hosted project URL | `https://vastunest-ui-555426598641.us-central1.run.app` |
| Testing instructions | See below |
| **Which Google SDK** | **Google GenAI SDK (google-genai)** |
| **Which Google Cloud services** | **Cloud Run** and **Firestore** (tick both) |
| Architecture diagram | Upload the PNG exported from `docs/architecture.mmd` |
| Which Google AI models | See below |
| Startup prize | Skip |
| Bonus content link | ⚠ Blog post, if you write one |
| Bonus social link | ⚠ Your post with #AllThingsAgenticHackathon |

### Testing instructions (judges only)

```
No login required — open the hosted URL and click "Analyze 10 properties".

Everything is already deployed and warm, so results appear in about a second.
To watch the agent make live Gemini calls instead, click "Re-read the plans"
(takes roughly a minute).

Proof it runs on Google Cloud, visible in the app header:
  gemini-3.5-flash-lite · Firestore · Cloud Run <revision>

Or hit the health endpoint directly:
  https://vastunest-agent-555426598641.us-central1.run.app/api/health

Worth trying:
- "Plan a tour" — the agent orders your shortlist by geography and returns a
  Google Maps route
- "Analyse a plan" — drop in any floor plan it has never seen
- Switch Vastu to Feng Shui in the left rail; the ranking changes because the
  two traditions disagree about a south-facing entrance
- The "While you were away" panel is the result of the unattended 6am run

To verify the accuracy claim yourself, from the repo:
  cd backend && npm run verify:seed
```

### Which Google AI models

```
Gemini 3.5 Flash-Lite — primary vision model, reads every floor plan and aerial
Gemini 3.5 Flash — first fallback when the primary is saturated
Gemini 3 Flash Preview — second fallback
Gemini 3.1 Flash Image — generates the floor plan and aerial dataset at build time
```

---

## Before you hit submit

- [ ] Category selected (Collaborative Partner)
- [ ] Repo link opens in an incognito window
- [ ] Architecture diagram **uploaded**, not just described
- [ ] Video public on YouTube, under 4:00, shows Google Cloud proof
- [ ] Video uploaded early — processing can take hours
- [ ] Hosted URL pasted
- [ ] Date started filled in
- [ ] Terms accepted

**After the deadline the submission locks.** Don't touch the repo, the video, or
the deployed services until winners are announced. If you want to keep building,
fork it and work there.
