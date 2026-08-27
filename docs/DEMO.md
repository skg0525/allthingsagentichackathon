# Demo — script and recording playbook

Everything you need to record the ~4 minute submission video. **Mechanics first**
(section A), then the **word-for-word beats** (section B).

---

# A · How to record

---

## 1. What to record with

**Use QuickTime Player.** It ships with macOS, records screen + mic in one file,
and produces no watermark or time limit.

> File → New Screen Recording → click the ˅ next to the record button →
> **Microphone: MacBook Pro Microphone** (or your headset) → Record Selected
> Portion or Entire Screen.

Alternatives if you want a webcam bubble or easier trimming: **OBS Studio**
(free, more setup) or **Loom** (free tier caps at 5 min — fine, but it watermarks
and hosts on their domain).

**Do not use a phone pointed at the screen.** Judges notice.

### Audio matters more than video
A crisp voice over a plain screen beats a beautiful screen with echoey laptop
audio. Use headphones with an inline mic if you have any. Record in a room with
soft furnishing. Close the window.

---

## 2. Set the stage (10 minutes before)

**Display resolution.** The three-pane console needs width. Set your display to
**1512×982 or wider** (System Settings → Displays → "More Space" is usually too
small — pick the middle option). Below ~1280px the preference rail hides itself
and you lose the tradition picker on camera.

**Browser.** Chrome, one window, **no other tabs visible**. Hide the bookmarks
bar (⌘⇧B). Zoom at 100% (⌘0).

**Clean the desktop.** Hide everything: `⌥⌘H` to hide others. Turn on Do Not
Disturb — a Slack notification mid-take means starting over.

**Tabs, in this order, left to right.** Pre-authenticate all of them:

| # | Tab | Why |
|---|---|---|
| 1 | Zillow, filter panel open | The problem, 0:00–0:40 |
| 2 | VastuNest UI | The whole demo |
| 3 | Cloud Run console — services list | Proof, 2:55 |
| 4 | Cloud Run → vastunest-agent → LOGS | Proof: live Gemini calls |
| 5 | Firestore → `buyerProfiles` → `demo_buyer_1` | Proof: the weight you change |
| 6 | Cloud Scheduler → `vastunest-overnight` | Proof: the agent runs unattended |
| 7 | Architecture diagram (PNG) | Close, 3:25 |

---

## 3. Reset (right before you hit record)

**Close the VastuNest tab first.** A scan still streaming in an open tab refills
the perception cache the moment the reset clears it — you would start recording
believing the analysis is live when it is coming from cache. The script now
refuses to run while a scan is in flight, but closing the tab avoids the whole
problem.

```bash
./deploy/demo-reset.sh
```

Against the deployed backend:

```bash
API=https://vastunest-agent-xxxx.run.app ./deploy/demo-reset.sh
```

It clears the perception cache, resets learned preferences, sets the tradition
back to Vastu, wipes old briefs, and runs the overnight agent once so
*"While you were away"* has real content when you load the page.

It ends by verifying that **no demo property is cached** and that the agent brief
survived. If either check fails it exits non-zero and tells you what to do — do
not record until it passes clean.

Then load the UI — and **do not click Analyze**. That click belongs on camera.

---

## 4. Decide how you are proving liveness

Perception ships pre-computed, so the app is instant out of the box. That is
deliberate — vision latency is Google's and it swings wildly, and no demo should
be a coin flip on their capacity. But it means **clicking Analyze on a seeded
cache is not a live demonstration**, and you must not present it as one.

Two honest options. Pick one before you record:

**Option A — seeded, prove liveness on one property (recommended).**
Leave the seed in place. The scan returns in about a second, which keeps the
demo tight. Then open one property and hit **Re-read the plans**, and narrate:

> "That was cached. Watch it actually read one — this is a real call to Gemini,
> right now."

Costs ~15 seconds and proves the same thing as waiting two minutes.

**Option B — fully cold.**
Run `./deploy/demo-reset.sh --cold`, which drops the seed too. Everything is
read live on camera. More impressive if the API cooperates, and a long silence
if it does not.

**Do a throwaway run 10 minutes before the real take either way.** It tells you
what kind of API day it is, which decides Option A vs B.

---

## 5. Shot list

| Time | Tab | What you're doing |
|---|---|---|
| 0:00 | 1 | Scroll Zillow's filters. Name what's missing. |
| 0:40 | 2 | The brief screen. **Lead with "While you were away" — the agent ran overnight, unprompted, and found a 91.** Then read your priorities. |
| 1:00 | 2 | Click **Analyze**. Narrate as cards land. |
| 1:20 | 2 | Open the winner. Floor plan tab. Point at the overlay pins. Read an evidence quote *verbatim*. |
| 1:45 | 2 | Click the worst one. Three red flags. Say why it was rejected. |
| 2:00 | 2 | Click **Feng Shui**. 75 Trailview goes 4th → 1st. |
| 2:25 | 2 | Switch back to Vastu. Open the docked **Teach the agent** bar. Type the critique live. Show the weight move and the re-rank. |
| 2:55 | 3,4,5,6 | Cloud Run services → logs → Firestore doc → Scheduler job. |
| 3:25 | 7 | Architecture. The perception/judgement point. Close. |

**Optional, if you have 15 spare seconds:** click **Analyse a plan** and drop in
a real floor plan from anywhere. It answers "does this only work on your data?"
before a judge can ask it.

---

## 5b. If you would rather not narrate live

You do not have to be a good speaker to make a good demo video. But read this
first, because there is a line here worth not crossing.

**What the rules ask for:** *"a live, unedited demo."* That is about the
**screen capture** — they want to see the app actually working, not a montage
that hides a failure. It is not a rule about your audio track.

**So: keep the screen recording as one continuous take. Treat the audio
separately.** That is honest and it is what most polished submissions do.

### The approach I would pick: Descript

<https://descript.com> — free tier is enough.

1. Record screen + your live narration in one take, as normal.
2. Drop it into Descript. It transcribes automatically.
3. **Remove filler words** — one click strips every "um", "uh", "like", and
   awkward pause across the whole recording.
4. **Studio Sound** — one toggle. Makes laptop-mic audio sound like a podcast.
5. If a sentence came out badly, retype it and **Overdub** speaks it in your own
   cloned voice, matched to the surrounding audio.

This keeps your voice, which matters — judges are hearing whether a real person
solved a real problem. It just removes the parts you do not like.

### If you would rather not use your voice at all

Record the screen silently, then generate narration from the script:

- **ElevenLabs** (<https://elevenlabs.io>) — the most natural TTS available. Paste
  the script from section B, pick a voice, export, lay it over the screen capture.
- **Play.ht** or **Murf.ai** — comparable, sometimes cheaper.

Honest trade-off: fully synthetic narration is noticeably smoother, but it also
reads as more detached, and some judges respond less warmly to a project that
sounds like a product ad than one that sounds like a person who has toured
twenty-two houses and is frustrated. Given that your story *is* personal, I would
keep your voice and just clean it up.

### Free audio-only cleanup

**Adobe Podcast Enhance** (<https://podcast.adobe.com/enhance>) — free, no signup
needed for short clips. Upload your audio, it removes room echo and noise. Does
not remove filler words, but fixes bad mic quality in seconds.

### Whichever you choose

- Say plainly in the Devpost description if you used AI narration. It is not
  against the rules and nobody minds; being caught not mentioning it is worse.
- **Do not cut the screen capture** to hide a slow scan or an error. If something
  goes wrong, narrate it. A recovered failure is more convincing than a demo with
  no rough edges.

## 6. Delivery

- **Don't read the script.** Know the five beats and talk. Stumbling sounds live;
  reading sounds canned, and the rules ask for unedited.
- **Say the numbers out loud.** "Ninety-one out of a hundred." "Twenty-three to
  seventy-five." Judges skim; spoken numbers stick.
- **Never say "as you can see."** Say what you want them to see.
- **Silence is fine** while the scan runs. Better than filler.
- **If something breaks, keep going and say so.** A recovered failure reads as
  real. A suspiciously perfect take reads as edited.

## 7. Be honest about the dataset

Say this, roughly, around 1:00:

> "These floor plans and aerials are generated — it's a fixture set, and that's
> deliberate: because I wrote the ground truth, I can actually measure whether
> the agent reads them correctly. It scores 93% exact across 42 fields. Here's
> the harness."

Then, if you do the upload beat, drop in a real plan. Claiming live MLS data you
don't have is the fastest way to lose credibility in Q&A.

---

## 8. Before you upload

- [ ] Watch it back the whole way through, with headphones
- [ ] Audio audible throughout, no clipping
- [ ] No personal data on screen — email, other tabs, notifications
- [ ] The `.run.app` URL is legible at least once
- [ ] Under 4:00
- [ ] Upload to YouTube as **public** (not unlisted — the rules require public
      for the bonus content, and public is safer for the main submission too)
- [ ] Title it with the project name and the hackathon

---

# B · What to say

The judge has to watch the agent do work it could not have done in advance.

---

## 0:00 – 0:40 · The problem (talking over a screen recording of Zillow)

> "We've toured twenty-two houses. We still haven't bought one. Not because
> nothing's available — because the things that disqualify a house aren't
> filterable.
>
> [*scrolling Zillow's filter panel*]
> Beds. Baths. Price. Square feet.
>
> Here's what actually decides it for us. Our main entrance has to face east or
> north — that's Vastu, a Hindu architectural tradition, and it's not negotiable
> in my family. We need a real bedroom on the ground floor with a *full* bath,
> not a study and a powder room. The backyard has to be flat and fenced, because
> we have a toddler. And it can't back onto a four-lane road.
>
> None of those are filters. None of them are even *fields*.
>
> But every single one of them is visible — in the floor plan, and in the
> satellite image. That's not a search problem. That's a vision problem."

**On screen:** Zillow filters, then cut to a floor plan and an aerial side by side.

---

## 0:40 – 1:05 · The agent already worked

**On screen:** VastuNest opens on the brief. Do NOT scroll past the green panel.

> "So I built an agent that reads them. And the first thing you see is what it
> did overnight, before I opened this."

**Point at "While you were away".**

> "Cloud Scheduler ran it at six this morning. Two new listings hit the market.
> It read both floor plans and both satellite images without being asked, scored
> them against my profile, and decided one of them — 18 Wren Hollow Court, 91 out
> of 100 — was worth waking me up for. The other scored 35 and it stayed quiet
> about it.
>
> That decision is the product. An agent that pings you about every new listing
> is just a worse email alert."

**Then scroll to the brief and the candidate strip.**

> "Below that is my profile — main-floor bedroom with a full bath, required. Max
> commute thirty minutes. And ten properties I'm already considering, none of
> them scored. Nothing here is precomputed."

Click **Analyze**.

---

## 1:05 – 2:00 · The agent works (LIVE — do not use the cache)

Cards fill in one at a time as each vision pass resolves. Talk over it.

> "Each property, it's sending Gemini 3.5 Flash two images — the floor plan and
> the aerial — and asking one question: what is physically in this drawing?
> It never sees my preferences. It doesn't produce a score. It just reports what
> it sees."

When the top result lands, open it.

> "This one scored 89. Here's *why* — and this is the part I care about."

**Open the floor plan tab. Point at the overlay pins.**

> "It found the front door on the east side. Kitchen in the south-east. Primary
> bedroom south-west. That's textbook Vastu — and it read all of it off the
> drawing."

**Scroll to 'What the agent saw'.**

> "And it shows its work. Every claim has the evidence sentence it used."
>
> [*read one aloud*] "'The floor plan shows the covered porch and foyer located
> on the eastern side of the main floor layout.' I can open the plan and check
> that."

**Now click the WORST property (38/100).**

> "And here's the one it rejected. South-facing entrance. No bedroom on the main
> floor at all. And it caught this from the satellite image — it fronts a
> four-lane road. Three hard-constraint violations. It's not that this house
> scored low. It's that it broke rules I told it were non-negotiable."

---

## 2:00 – 2:25 · The tradition switch

**Point at the left rail, then click Feng Shui.**

> "One more thing. Vastu is an Indian tradition — my wife is white, I'm Indian,
> and plenty of families use a different system entirely. So the compass rules
> are a swappable table, not hardcoded logic.
>
> Watch fourth place." [*point at 75 Trailview Court, 60/100*]
>
> [*click Feng Shui*]
>
> "It just went from fourth to **first**. Its compass score went from 23 to 75.
> Same house, same floor plan, same reading — because a south-facing entrance is
> a flaw in Vastu and the *classical ideal* in Feng Shui. Nothing about what the
> agent saw changed. Only the rulebook did.
>
> That's the separation I care about: perception is fixed, judgement is
> configurable. And it took no model call at all."

**Switch back to Vastu before continuing.**

*(Verified ranking. Vastu: 101 → 105 → 108 → **106**. Feng Shui: **106** → 101 →
105 → 108.)*

---

## 2:25 – 2:55 · The collaborative loop (the money shot)

> "Now here's what makes it a partner instead of a filter."

**Select 87 Oak Ridge Court (the 37/100). Click the docked "Teach the agent" bar
at the bottom. Pick 👎. Type live — do not paste:**

```
It fronts a four-lane road. With a toddler that's an absolute
dealbreaker, and the yard has no real fence.
```

Submit. Wait for the response.

> "It didn't just save that comment. It turned it into weights."

**Point at the before → after.**

> "Community and safety, 0.75 to 0.95. Backyard, 0.95 to 1.00. That's written to
> Firestore, and it persists across sessions."

**Point at the list re-ordering.**

> "And every property just re-ranked. That took thirty-six milliseconds, because
> re-ranking doesn't need the model at all — the perception is already cached.
> The only thing that changed is how much I care."

---

## 2:55 – 3:25 · Google Cloud proof (MANDATORY)

**Cut to the browser. Have these tabs open in advance.**

1. The header badges — `gemini-3.5-flash-lite`, `Firestore`, `Cloud Run · <revision>`
   > "That's live, off the health endpoint."
2. **Cloud Run console** — both services, `min-instances 0`.
   > "Backend and frontend, both on Cloud Run, both scaling to zero."
3. The `.run.app` URL in the address bar.
4. **Cloud Run logs** — show the Gemini vision calls with timings.
5. **Firestore console** — open the `buyerProfiles` document, show the weight
   you just changed and the learned note.
   > "There's the 0.95 I just created."

---

## 3:25 – 4:00 · Architecture & close

**Show the architecture diagram.**

> "Two paths through this system. The one you drove — you click, it analyses.
> And the one you didn't — Cloud Scheduler, every morning at six, no human in
> the loop at all."


> "One decision drives this whole system: **Gemini does perception, code does
> judgement.** The model only answers 'what's in this drawing?' It never sees my
> weights and never emits a score. A deterministic scoring engine does that.
>
> That buys four things. It's **reproducible** — same house, same number, every
> time, so I can compare houses across weeks. It's **auditable** — every claim
> ships with its evidence. It **caches**, because perception only depends on the
> images: a full live analysis takes about a minute, a re-rank takes thirty-six
> milliseconds. And it's **pluggable** — you saw the whole tradition swap out
> without the model being called once.
>
> It also degrades honestly. If the vision call fails, the field reads 'Unknown'
> and the trace says why. It never guesses. For something this consequential, a
> plausible fabrication is worse than a gap.
>
> I'm still house hunting. But now I'm touring the right three houses instead of
> the wrong twenty-two."

---

## Pre-flight checklist

- [ ] Run `./deploy/demo-reset.sh` — it does all of the below in one go
- [ ] Confirm its output says `cache 0 entries`, or the scan will not be live
- [ ] Confirm "While you were away" has content when you load the page
- [ ] Backend deployed, `/api/health` returns `firestore` + a real revision
- [ ] Cloud Run console, logs, and Firestore tabs open and pre-authenticated
- [ ] Zillow tab open on the filter panel
- [ ] Screen at 1512px+ so all three panes show
- [ ] Do one full dry run and time it — first analysis varies a lot with API load
- [ ] Record audio in one take; no cuts (rules say unedited)

## Timing risk — read this before recording

**Vision latency is Google's, and it is not stable.** Measured on this repo,
identical two-image requests:

| Model | Good window | Bad window |
|---|---|---|
| `gemini-3.5-flash-lite` (primary) | 1.5–3s | ~23s, or a 503 |
| `gemini-3.5-flash` | ~10s | **59s to return a 503** |

That is why the seed exists and why `flash-lite` is primary. It is also why
Option A above is the safer recording: a single live re-read is 15 seconds of
proof instead of two minutes of hoping.

**If you go cold and it drags:** the scan streams, so narrate the first card the
moment it lands rather than waiting for all ten.

If you are over time overall, the tradition switch (2:00–2:25) is the cut. It is
the most impressive beat but the least load-bearing — the Google Cloud proof, the
feedback loop and the overnight-agent opening are all scored requirements and
cannot be dropped.

**Never cut the overnight brief.** "Autonomous action with little to no
hand-holding" is 40% of the score, and that panel is the only place the demo
shows it.
