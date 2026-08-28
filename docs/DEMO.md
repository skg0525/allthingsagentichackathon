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
| 7 | Architecture diagram (PNG) | Close, 3:35 |
| 8 | A real floor plan image, downloaded | The optional credibility beat |

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
| 2:55 | 2 | **Plan a tour** → route + what to check at each door → open Google Maps. |
| 3:15 | 3,4,5,6 | Cloud Run services → logs → Firestore doc → Scheduler job. |
| 3:35 | 7 | Architecture. The perception/judgement point. Close. |

**If you have 15 spare seconds anywhere:** **Analyse a plan**, drop in a real
floor plan from a listing you found online. It answers "does this only work on
your own data?" before a judge can ask it.

---

## 5b. Narration and editing — the official rules

Two things in the organizers' written checklist override earlier advice,
including advice I gave you:

**Editing is not just allowed, it is recommended.** Their words: *"Use jump cuts
to remove pauses, ums, and dead air. Cut all load times and waiting. Speed up
slow sections. Record in short clips, then you can redo one part without filming
it all again."* So record beat by beat and cut it together. Do not sit through a
50-second scan on camera.

**AI voiceover is acceptable.** Their words: *"Not comfortable narrating? An AI
voiceover beats silence or mumbling."* The live Q&A said they prefer a real
voice, and that is still true, but a clean AI read beats a hesitant human one.

So the ranking is:

1. Your voice, recorded in short clips, filler removed in Descript
2. An AI voiceover from the script, if narrating makes you tense up
3. A mumbled single take — worst option, avoid

**Do not type live.** Their checklist says so explicitly. Paste the feedback
text, or cut to the result.

### The tools

**[Descript](https://descript.com)** — record in clips, one click removes every
"um", Studio Sound fixes laptop-mic audio, and jump cuts are trivial. This is the
whole workflow in one tool.

**[ElevenLabs](https://elevenlabs.io)** — if you go the AI voiceover route, paste
the script and lay the audio over your screen clips.

**[Adobe Podcast Enhance](https://podcast.adobe.com/enhance)** — free, cleans
audio quality only.

### The rule that still holds

No mockups and no slideware. Every frame has to be the real thing running. Cutting
dead air is editing; faking a result is not.

## 6. Delivery

- **Don't read the script.** Know the five beats and talk. Stumbling sounds live;
  reading sounds canned, and the rules ask for unedited.
- **Say the numbers out loud.** "Ninety-one out of a hundred." "Twenty-three to
  seventy-five." Judges skim; spoken numbers stick.
- **Never say "as you can see."** Say what you want them to see.
- **Silence is fine** while the scan runs. Better than filler.
- **If something breaks, keep going and say so.** A recovered failure reads as
  real. A suspiciously perfect take reads as edited.

## 7. Be honest about the dataset — and make it an asset

You will be tempted to imply this is real listing data, or to justify not using
real data on privacy grounds. **Don't do either.** Listings are public; a judge
who knows real estate will know that, and a weak excuse costs you more
credibility than the thing you were excusing.

There is a genuinely strong reason, and it is simply true:

> "These floor plans are generated, deliberately. If I'd scraped real listings I
> would have no answer key — I could show you a confident-looking output and
> neither of us could tell whether it was right. Because I wrote the spec these
> were drawn from, I know the ground truth for every one. So I can tell you it
> scores 93% exact across 42 fields, with nothing read backwards, and you can
> re-run that yourself in the repo in about a second."

Then prove it generalises rather than asserting it: **drop in a real floor plan
on camera.** One unseen plan read correctly does more than any claim about your
dataset.

That reframe is worth rehearsing. It turns the obvious objection into the reason
you can make a measurable claim at all — which is something almost nobody else in
the field will be able to say.

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

**Target 3:40, not 4:00.** Judges stop watching at four minutes — an overrun means
your close and your Cloud proof are simply never seen. Leave buffer.

**Show the project working in the first 10 to 15 seconds.** That is from the
organizers' checklist, and it is tighter than the 30 seconds mentioned in the
Q&A. No title card, no intro, no sign-in. Open already logged in, on a result.

**Say the model and framework out loud.** Their checklist: *"which Gemini model
and which agent framework you used — say them clearly, don't bury them."* The
line is in the hook below.

---

## 0:00 – 0:30 · The hook

**Open on the app, already on a floor plan with the agent's overlay pins showing.**
No preamble. No title card. Talk immediately.

> "This is a floor plan. Gemini 3.5 Flash-Lite just read it, and it can tell me
> the front door faces east, the kitchen is in the south-east corner, and the only
> bathroom on the ground floor has no tub in it.
>
> [*click the aerial tab*]
>
> From the satellite image: flat backyard, fenced, backing onto woodland rather
> than a road.
>
> Zillow has a filter for none of that."

**On-screen text instead of saying it:** put `Gemini 3.5 Flash-Lite · Google GenAI
SDK · Cloud Run + Firestore` as a caption here. Their checklist asks for the model
and framework to be explicit, and a caption costs no seconds.

---

## 0:30 – 0:55 · Why it matters (fast)

**Cut to Zillow's filter panel for a few seconds only.**

> "We've toured twenty-two houses. Beds, baths, price — that's all you can filter
> on. But what actually rules a house out for us is whether the entrance faces
> east, because that's Vastu and it's not negotiable in my family. Whether there's
> a real ground-floor bedroom with a full bath for my parents. Whether the yard is
> flat enough for a toddler. Whether it backs onto a four-lane road.
>
> None of that is a field. All of it is in the drawings."

**Back to the app.**

---

## 0:55 – 1:15 · It already ran without me

**Point at "While you were away".**

> "And it doesn't wait for me. Cloud Scheduler ran this at six this morning. Two
> new listings hit the market, it read both of them, and it decided one — this
> one, 89 out of 100 — was worth waking me up for. The other scored 35 and it
> stayed quiet.
>
> That decision is the whole product. An agent that pings you about every new
> listing is just a worse email alert."

---

## 1:15 – 2:05 · The evidence

Click **Analyze**. Talk while cards land.

> "Every one of these gets two images sent to Gemini — the floor plan and the
> aerial — and one question: what is physically in this drawing?"

**Open the winner. Scroll to "What the agent saw."**

> "And it shows its work. Every claim has the evidence it used." [*read one aloud*]

**Click the worst one (35/100).**

> "Here's one it rejected. South-facing entrance. No bedroom on the main floor.
> And it caught from the satellite image that it fronts a four-lane road. It
> didn't score low — it broke rules I told it were non-negotiable."

---

## 2:05 – 2:25 · The rulebook is swappable

> "Vastu is an Indian tradition. Plenty of families use a different one. So the
> compass rules are a table, not code. Watch fourth place."

**Click Feng Shui.** *(75 Trailview: 4th → 1st, compass 23 → 75.)*

> "Fourth to first. Same house, same reading — a south entrance is a flaw in Vastu
> and the ideal in Feng Shui. The agent didn't change its mind about what it saw.
> Only the rulebook did. And that took no model call at all."

**Switch back to Vastu.**

---

## 2:25 – 2:50 · It learns

**Open the docked "Teach the agent" bar. Pick 👎. PASTE the text — do not type it
live, their checklist says so:**

```
It fronts a four-lane road. With a toddler that's a dealbreaker.
```

> "It turns that into weights — community safety, 0.75 to 0.95 — writes it to
> Firestore, and re-ranks everything in twenty-three milliseconds, because
> re-ranking doesn't need the model at all."

---

## 2:50 – 3:10 · It acts

**Click "Plan a tour" → Plan.**

> "And when I've decided what's worth seeing, it plans the day. Ordered by
> geography — both Alpharetta houses first, Brookhaven on the way back. Forty-five
> minutes at the 1969 house instead of thirty, because that's the one with the
> aging systems. And what to check at each door, from what it already found in the
> plan."

**Click "Open in Google Maps."** Let the real route render.

---

## 3:10 – 3:30 · Google Cloud proof (MANDATORY)

**Point at the header badges first — they're already on screen.**

> "Gemini 3.5 Flash-Lite, Firestore, and the live Cloud Run revision."

Then, fast, one tab each:
1. **Cloud Run console** — two services, min-instances 0
2. **Logs** — the Gemini calls
3. **Firestore** — `buyerProfiles/demo_buyer_1`, the 0.95 you just created
4. **Cloud Scheduler** — `vastunest-overnight`, enabled, 06:00

---

## 3:30 – 3:45 · Close

**Architecture diagram.**

> "One decision drives all of it: Gemini does perception, code does judgement. The
> model answers what's in the drawing. It never sees my weights and never produces
> a score.
>
> That's why the same house scores the same every time, why every claim comes with
> evidence, and why I can tell you it reads these plans 93% exactly right — because
> I know the ground truth and you can re-run that yourself.
>
> I'm still house hunting. But now I'm touring the right three instead of the
> wrong twenty-two."

---

## Timing discipline

| Beat | Ends | Cumulative |
|---|---|---|
| Hook | 0:30 | 0:30 |
| Problem | 0:55 | 0:55 |
| Overnight run | 1:15 | 1:15 |
| Live evidence | 2:05 | 2:05 |
| Tradition switch | 2:25 | 2:25 |
| Feedback | 2:50 | 2:50 |
| Tour | 3:10 | 3:10 |
| **Cloud proof** | 3:30 | 3:30 |
| Close | 3:45 | **3:45** |

**If you are running long, cut the tradition switch (2:05–2:25).** It is the most
impressive beat and the least load-bearing. The Cloud proof, the overnight run and
the feedback loop are all scored requirements.

**Never cut the overnight brief or the Cloud proof.**
