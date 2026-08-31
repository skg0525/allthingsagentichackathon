# Demo script

Record tomorrow. Target **3:35**. Judges stop watching at 4:00, so leave buffer.

---

# Before you record

**1. Close every VastuNest tab.** Then reset the **deployed** stack — this is the
one the video shows, and it is not the same as your laptop:

```bash
API=https://vastunest-agent-555426598641.us-central1.run.app ./deploy/demo-reset.sh --cold
```

Wait for `no demo property is cached`. Without the `API=` prefix the script
resets your local server and the recording will still be served from cache.

If you only want to un-cache without the rest:

```bash
curl -X POST "https://vastunest-agent-555426598641.us-central1.run.app/api/cache/clear"
```

**2. Open these tabs, in this order, already signed in:**

| # | Tab |
|---|---|
| 1 | Zillow, filter panel showing |
| 2 | https://vastunest-ui-555426598641.us-central1.run.app |
| 3 | [Cloud Run services](https://console.cloud.google.com/run?project=gen-lang-client-0460749914) |
| 4 | [Agent logs](https://console.cloud.google.com/logs/query;query=resource.type%3D%22cloud_run_revision%22%20resource.labels.service_name%3D%22vastunest-agent%22;duration=PT1H?project=gen-lang-client-0460749914) |
| 5 | [Firestore data](https://console.cloud.google.com/firestore/databases/-default-/data?project=gen-lang-client-0460749914) |
| 6 | [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler?project=gen-lang-client-0460749914) |
| 7 | The architecture diagram (PNG, open in Preview) |

**Firestore is in the Google Cloud console, not Firebase.** Same database, two
front ends; the Firebase console only lists projects created through Firebase.
Use the link above, then click `buyerProfiles` in the collection column, then
`demo_buyer_1`.

**Tab 4 goes to Logs Explorer, not the service's Logs tab.** The per-service logs
URL 404s; Logs Explorer with a filter is stable and shows more anyway. It opens
pre-filtered to the agent, last hour.

### What to actually point at

You have about 25 seconds for all four. One thing per tab, then move.

| Tab | Point at |
|---|---|
| Cloud Run | The two service rows — `vastunest-agent` and `vastunest-ui`, both `us-central1`. That is the whole proof: two services, running, on Google Cloud. Ignore the Scaling/Errors/Billing charts. |
| Logs | Any line mentioning the model or a scan. Just scroll a little so real log lines are moving on screen. |
| Firestore | The `demo_buyer_1` document — expand `propertyFeedback` to show the rejection you created a minute earlier, and `weights`. |
| Scheduler | The `vastunest-overnight` row: schedule `0 6 * * *`, state **Enabled**, and the Last run column. |

Do a dry pass through these four before recording — console pages can be slow to
load the first time and you do not want that on camera.

**3. Display at 1512px or wider**, browser at 100% zoom, bookmarks bar hidden,
Do Not Disturb on.

**4. Record in short clips, one per beat.** The organizers explicitly recommend
this: *"Record in short clips. Then you can redo one part without filming it all
again."* Cut them together after. You are not doing this in one take.

---

# The script

## 0:00 – 0:15 · Hook

**Open cold on the app, on a floor plan, agent overlay pins visible. No title
card. Talk immediately.**

> "Gemini just read this floor plan. It can tell me the front door faces east,
> the kitchen is in the south-east corner, and the only bathroom on the ground
> floor has no tub in it."

**Click the aerial tab.**

> "And from the satellite image — flat backyard, fenced, backing onto woodland,
> not a road."

**Add this as a text overlay in editing — do not read it out:**
`Gemini 3.5 Flash-Lite · Google GenAI SDK · Cloud Run + Firestore`

Their checklist asks you to name the model and framework clearly. A caption does
that without spending seconds of narration on it.

---

## 0:15 – 0:45 · The problem

**Cut to Zillow, then Redfin. Scroll each filter panel for a few seconds.**
Showing both is better than one — it makes the point that this is the whole
industry, not one site's gap.

> "We've toured twenty-two houses and still haven't bought one. Beds, baths,
> price — that's everything you can filter on.
>
> What actually rules a house out for us: the entrance has to face east or north,
> that's Vastu and it's not negotiable in my family. A real ground-floor bedroom
> with a full bath, for my parents. A flat yard, because we have a toddler. Not
> backing onto a four-lane road.
>
> None of that is a field anywhere. All of it is in the drawings."

---

## 0:45 – 1:05 · It ran without me

**Back to the app. Point at "While you were away".**

> "It doesn't wait to be asked. Cloud Scheduler ran this at six this morning. Two
> new listings came on the market, it read both floor plans, and it decided one —
> 18 Wren Hollow Court — was worth waking me up for. The other one it scored,
> looked at, and said nothing about.
>
> That decision is the product. An agent that pings you about every new listing
> is just a worse email alert."

---

## 1:05 – 1:45 · The evidence

**Click Analyze. Talk over the cards landing. Cut the dead time in editing.**

> "Two images per property go to Gemini — floor plan and aerial — with one
> question: what is physically in this drawing?"

**Open the top result. Scroll to "What the agent saw".**

> "And it shows its work. Every claim quotes the evidence."

**Read one aloud, verbatim.**

**Click the worst property.**

> "This one it rejected. South-facing entrance, no bedroom on the main floor, and
> it caught from the satellite image that it fronts a four-lane road. It didn't
> score low — it broke rules I told it were non-negotiable."

---

## 1:45 – 2:15 · It learns *(the strongest beat — do not cut)*

**Go back to 18 Wren Hollow Court, sitting at number one.**

> "This is its top pick. I went and saw it, and I didn't like the street."

**Open "Teach the agent". Click 👎. Paste — do not type:**

```
Not for me. The street felt wrong when we drove it.
```

**Hit Teach. Let it land.**

> "First to last.
>
> And that's the point — it's not just adjusting a slider somewhere. It recorded
> a verdict about this specific house, wrote it to Firestore, and re-ranked
> everything in twenty-three milliseconds without calling the model once. It
> already knows what's in those drawings."

---

## 2:15 – 2:35 · The rulebook swaps

> "Vastu is an Indian tradition. Plenty of families use a different one, so the
> compass rules are a table, not code."

**Click Feng Shui. Point at 75 Trailview Court moving up.**

> "Same house, same reading — a south-facing entrance is a flaw in Vastu and the
> ideal in Feng Shui. The agent didn't change its mind about what it saw. Only
> the rulebook did."

**Switch back to Vastu.**

---

## 2:35 – 2:55 · It acts

**Click "Plan a tour" → Plan.**

> "And once I know what's worth seeing, it plans the day. Ordered by geography.
> Forty-five minutes at the 1969 house instead of thirty, because that's the one
> with the aging systems. And what to check at each door — from what it found in
> the plan."

**Click "Open in Google Maps."** It opens in a new tab and renders a real
multi-stop driving route. Let it draw, then close the tab and come back.

> "And that's a real route I can send to my phone."

*(The route is built from coordinates, so it resolves properly. The street
addresses themselves are invented — see the dataset note below.)*

---

## 2:55 – 3:20 · Google Cloud proof *(required)*

**Point at the header badges — already on screen.**

> "Gemini 3.5 Flash-Lite, Firestore, and the live Cloud Run revision."

Then one tab each, fast:

1. **Cloud Run** — two services, min-instances 0
2. **Logs** — the Gemini calls
3. **Firestore** — `buyerProfiles/demo_buyer_1`, the verdict you just created
4. **Cloud Scheduler** — `vastunest-overnight`, enabled, 06:00 daily

---

## 3:20 – 3:35 · Architecture and close

**Full-screen the diagram.** Trace it with your cursor as you talk — left to
right, following the arrows. Roughly one sentence per hop.

> "Two ways in — me in the browser, or Cloud Scheduler on a cron. Both hit the
> same agent on Cloud Run."

*(cursor: Buyer and Cloud Scheduler → Agent API)*

> "Perception sends the floor plan and the aerial to Gemini and gets back what's
> physically in them. That result goes in a cache, because it depends only on the
> images."

*(cursor: Perception ↔ Gemini, then ↔ Perception cache)*

> "Scoring is separate, and it's ordinary code. It reads my weights out of
> Firestore and decides what those findings are worth to me. The model never sees
> a weight and never produces a score."

*(cursor: Perception → Scoring ↔ Firestore)*

> "And that one separation is the whole design. It's why re-ranking is twenty-three
> milliseconds instead of a model call, why the same house scores the same every
> time, and why swapping Vastu for Feng Shui doesn't touch Gemini at all.
>
> It also means I can measure it. It reads these plans 93% exactly right against
> known ground truth, and you can re-run that check yourself in about a second.
>
> I'm still house hunting. But now I'm touring the right three instead of the
> wrong twenty-two."

**If you're short on time**, the minimum is the third paragraph — the separation
and why it matters. The hop-by-hop walk is what makes it feel considered, but the
point survives without it.

---

# Timing

| Beat | Ends |
|---|---|
| Hook | 0:15 |
| Problem | 0:45 |
| Overnight run | 1:05 |
| Evidence | 1:45 |
| **It learns** | 2:15 |
| Tradition switch | 2:35 |
| Tour | 2:55 |
| **Cloud proof** | 3:20 |
| Close | **3:35** |

**Running long?** Cut the tradition switch (2:15–2:35). Never cut the overnight
run, the learning beat, or the Cloud proof — those are scored.

---

# Editing

The organizers recommend it: *"Use jump cuts to remove pauses, ums, and dead air.
Cut all load times and waiting. Speed up slow sections."*

- **Cut every wait.** The scan and the feedback call both take 10–30 seconds.
  None of that belongs in the video.
- **Don't type on camera.** Paste.
- **[Descript](https://descript.com)** does all of this: filler removal in one
  click, Studio Sound for laptop-mic audio, easy jump cuts.
- **Use your voice if you can.** They prefer it. But their checklist also says
  *"an AI voiceover beats silence or mumbling"* — so if narrating makes you
  freeze, [ElevenLabs](https://elevenlabs.io) over the script is a fine choice.

**The one thing you cannot do:** fake a result. No mockups, no slideware. Cutting
dead air is editing. Showing something that didn't happen is not.

---

# Say this about the dataset

**Where:** right after you read an evidence quote, around **1:30** — the moment a
judge starts wondering where these plans came from. Keep it to two sentences on
camera and let the README carry the detail.

Do not claim it is live MLS data, and do not use privacy as the excuse — listings
are public and a judge will know. The real reason is better:

> "These floor plans are generated, deliberately. If I'd scraped real listings I'd
> have no answer key — I could show you a confident-looking output and neither of
> us could tell if it was right. Because I wrote the spec these were drawn from, I
> know the correct answer for every one. That's why I can tell you it scores 93%
> exact across 42 fields, and why you can re-run that yourself."

**The short on-camera version (two sentences):**

> "These floor plans are generated on purpose — because I wrote the spec they
> were drawn from, I know the right answer for every one. That's how I can tell
> you it reads them 93% exactly right, and how you can check that yourself."

If you have 15 spare seconds, **drop a real floor plan into "Analyse a plan"**.
One unseen plan read correctly beats any claim about your dataset.

---

# How to actually record this

## The tool

**QuickTime Player** — already on your Mac, no watermark, no time limit.

**On macOS 15, QuickTime hands off to the Screenshot toolbar, and its microphone
defaults to None.** This is why a recording comes back silent. QuickTime's own
mic dropdown does not apply.

> Press **⌘⇧5** → click **Options** → under **Microphone** select
> **MacBook Pro Microphone** (it starts on None) → set **Save to → Desktop** →
> then **Record Selected Portion** and drag a box around just the browser.

If the Microphone menu is empty, grant permission in
**System Settings → Privacy & Security → Microphone** for **Screenshot** and
**QuickTime Player**.

**Record five seconds and play it back before every session.** Discovering silent
audio after a good take is the worst way to lose twenty minutes.

### Or skip QuickTime and record in Descript

You are editing there anyway. It captures screen and mic together, shows a live
input meter so you can see your voice registering before you start, and the clips
land straight in the timeline — no stitching step. It also avoids the silent-audio
problem entirely.

Recording a *selected portion* is how you avoid showing the dock and your other
windows. Drag the box to the browser's edges and nothing outside it is captured.

If you'd rather record full screen: **auto-hide the dock** first
(System Settings → Desktop & Dock → "Automatically hide and show the Dock"), and
turn on **Do Not Disturb** so no notification banners appear.

## Record one segment at a time

This is what the organizers recommend, and it is much easier than one take:

1. Set up the screen for a beat
2. Hit record, do that beat, stop
3. If it came out badly, redo just that beat
4. Stitch them in order afterwards

You'll end up with eight short clips. Name them `01-hook.mov`, `02-problem.mov`
and so on so the order is obvious when you assemble.

## Stitching them together

**[Descript](https://descript.com)** — drop all the clips in, they appear as one
timeline. Then: remove filler words in one click, Studio Sound on the audio, and
drag to cut the waiting. Export as MP4.

**Free alternative:** iMovie handles joining clips and trimming fine. It won't
strip "ums" automatically.

## What to do about waiting

Two beats have dead time — the scan (10–30s) and the feedback call (10–30s).
**Cut them in editing.** Record the click, stop recording, wait, start recording
again when the result is on screen. Nobody wants to watch a spinner and their
checklist says to cut it.

## Before the real take

Do one **dry run of all eight beats** without recording, with a stopwatch. You
are looking for friction: a tab that needs a login, a slow render, a step you
forgot. Fix those, then record.

---

# Before you upload

- [ ] Watch it back with headphones
- [ ] Under 4:00
- [ ] The `.run.app` URL is legible at least once
- [ ] No personal data, no notifications on screen
- [ ] Upload to YouTube as **public**, not unlisted
- [ ] Upload early — processing can take hours

---
