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

Read these out loud once before recording. If a line makes you stumble, change it
— your words beat mine every time.

---

## 0:00 – 0:20 · Hook

**Open cold on the app, floor plan showing with the agent's pins on it.**

> "We've looked at twenty-two houses this year. Still haven't bought one.
>
> The problem is what matters to us isn't on Zillow or redfin. You can filter beds, baths,
> price. You can't filter which way the front door faces or hows the backyard, or how diverse is the neighborhood
>
> So I built this. It reads the floor plan, analyze the neighborhood and finds something for our need.
>
> Look — it just told me this front door faces east, kitchen is in south east,  bedroom is in south west.

**Text overlay, added in editing — don't say it:**
`VastuNest · Gemini 3.5 Flash-Lite · Google GenAI SDK · Cloud Run + Firestore`

---

## 0:20 – 0:45 · What you can't filter

**Cut to Zillow, then Redfin. Scroll the filters.**

> "Beds. Baths. Price. Square feet. That's all you get.
>
> Here's what actually decides it for us. The front door has to face east or
> north — that's Vastu, it's a Hindu tradition, and my family won't budge on it.
> We need a real bedroom downstairs with a full bath. A flat yard, because we've
> got a toddler. And nothing backing onto a main road.
>
> None of that is a checkbox anywhere. But all of it is right there in the floor
> plan and the satellite photo."

**Back to the app.**

> "So it's not really a search problem. It's a seeing problem."

---

## 0:45 – 1:05 · It ran on its own

**Point at "While you were away".**

> "And it doesn't wait for me. This ran at six this morning on a schedule. Two
> new houses came on the market overnight. It read both floor plans and decided
> this one was worth telling me about.
>
> The other one, it looked at and said nothing. That's the part I care about. I
> don't want an alert every time something gets listed."

---

## 1:05 – 1:45 · How it knows

**Click Analyze. Talk while cards land. Cut the wait in editing.**

> "Every house gets two pictures sent to Gemini. The floor plan and the aerial
> shot. And one question — what's actually in this drawing?"

**Open the top result. Scroll to "What the agent saw".**

> "And it shows you where it got that from."

**Read one evidence quote out loud, exactly as written.**

> "Quick thing about the data — these floor plans are generated on purpose. I
> wrote the spec they were drawn from, so I know the right answer for every one.
> That's how I can tell you it gets ninety-three percent of them exactly right,
> and how you can check that yourself."

**Click the worst property.**

> "This one it threw out. Front door faces south. No bedroom downstairs at all.
> And from the satellite picture it worked out the house fronts a four-lane road.
> It didn't just score it low — it broke rules I'd told it were non-negotiable."

---

## 1:45 – 2:15 · It learns *(don't cut this)*

**Go back to the house sitting at number one.**

> "This is its top pick right now. But I went and saw it, and I didn't like the
> street."

**Open "Teach the agent". Click 👎. Paste — don't type:**

```
Not for me. The street felt wrong when we drove it.
```

**Hit Teach. Cut the wait.**

> "And it's gone. First to last.
>
> It didn't just save my comment somewhere. It remembered that I turned this
> house down, wrote that to Firestore, and re-sorted everything. Took twenty-three
> milliseconds, and it never called the model — it already knows what's in those
> drawings."

---

## 2:15 – 2:35 · Different rules

> "Vastu's an Indian thing. Plenty of people use something else. So the compass
> rules are just a table I can swap."

**Click Feng Shui. Point at 75 Trailview Court moving up.**

> "Same house. Same reading. But a south-facing door is bad in Vastu and good in
> Feng Shui. Nothing changed about what the agent saw — only the rulebook."

**Switch back to Vastu.**

---

## 2:35 – 2:55 · It books the day

**Click "Plan a tour" → Plan.**

> "Once I know what I want to see, it plans the day. It's grouped them by area.
> Forty-five minutes at the 1969 house instead of thirty, because that's the one
> where I need to look at the furnace. And it tells me what to check at each
> door, based on what it found in the plan."

**Click "Open in Google Maps."** Let the route draw, then close the tab.

> "And that's a real route I can pull up on my phone."

---

## 2:55 – 3:20 · Running on Google Cloud *(required)*

**Point at the header badges — already on screen.**

> "That's the model, Firestore, and the live Cloud Run version, straight off the
> health endpoint."

Then one tab each, fast:

1. **Cloud Run** — "Two services. Both scale to zero."
2. **Logs** — "Those are the Gemini calls."
3. **Firestore** — "And there's the house I just turned down."
4. **Scheduler** — "This is the job that ran at six this morning."

---

## 3:20 – 3:35 · How it works, and close

**Full-screen the diagram. Trace it with your cursor.**

> "Two ways in. Me, or the scheduler. Both hit the same agent.
>
> This part sends the pictures to Gemini and gets back what's in them. That gets
> cached, because it only depends on the images.
>
> And this part is just code. It reads my preferences out of Firestore and works
> out what those findings are worth to me. Gemini never sees my preferences and
> never gives a score.
>
> That split is the whole thing. It's why re-ranking is instant, why the same
> house always scores the same, and why I can actually measure whether it's
> reading the plans right.
>
> I'm still house hunting. But now I'm seeing the right three instead of the
> wrong twenty-two."

---

# Timing

| Beat | Ends |
|---|---|
| Hook | 0:20 |
| What can't be filtered | 0:45 |
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

# If a judge asks about the data

The dataset is generated. Say so plainly — the two-line version is already in the
1:05 beat. Do not claim it is live MLS data, and do not reach for privacy as the
reason; listings are public and a judge will know.

The real reason is stronger anyway: if you scrape real listings you have no answer
key, so you cannot tell a confident answer from a correct one. These were drawn
from a written spec, so the correct answer is known for every one. That is what
`npm run verify:seed` checks, and it is why 93% means something.

If you have fifteen spare seconds, drop a real floor plan into **Analyse a plan**
on camera. One unseen plan read correctly beats any argument about your dataset.

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
