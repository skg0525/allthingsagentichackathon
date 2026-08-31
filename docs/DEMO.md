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
| 4 | [Agent logs](https://console.cloud.google.com/run/detail/us-central1/vastunest-agent/logs?project=gen-lang-client-0460749914) |
| 5 | [Firestore data](https://console.cloud.google.com/firestore/databases/-default-/data?project=gen-lang-client-0460749914) |
| 6 | [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler?project=gen-lang-client-0460749914) |
| 7 | The architecture diagram |

Those links go straight to the right page — no clicking through menus on camera.

**Firestore is in the Google Cloud console, not Firebase.** Same database, two
front ends; the Firebase console only shows projects created through Firebase.
Use the link above. Once it loads, click `buyerProfiles` in the collection list,
then the `demo_buyer_1` document.

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

## 3:20 – 3:35 · Close

**Architecture diagram.**

> "One decision drives all of it. Gemini does perception — what's in the drawing.
> Code does judgement — what that means for me. The model never sees my weights
> and never produces a score.
>
> That's why it reads these plans 93% exactly right against known ground truth,
> and why you can re-run that check yourself in a second.
>
> I'm still house hunting. But I'm touring the right three instead of the wrong
> twenty-two."

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

# Before you upload

- [ ] Watch it back with headphones
- [ ] Under 4:00
- [ ] The `.run.app` URL is legible at least once
- [ ] No personal data, no notifications on screen
- [ ] Upload to YouTube as **public**, not unlisted
- [ ] Upload early — processing can take hours
