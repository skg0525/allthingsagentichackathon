# Bonus points — blog post and social post

Both are optional but cheap. The blog is ~10 minutes to publish on dev.to.

---

## 1. Blog post

**Where:** [dev.to](https://dev.to/new) — free, no approval wait, publishes instantly.
Must be **public**, not draft or unlisted.

**Title:**

```
I let Gemini score houses for me. Then I found out it was lying.
```

**Tags:** `googlecloud`, `gemini`, `ai`, `webdev`

**Body — paste as Markdown:**

---

*I created this post for the purposes of entering the All Things Agentic Hackathon.*

My wife and I have looked at twenty-two houses this year. We still haven't bought one.

It isn't that nothing's available. It's that what rules a house out for us isn't on Zillow. You can filter beds, baths and price. You can't filter which way the front door faces — and for my family, Vastu isn't negotiable. You can't filter "is there a real bedroom downstairs with a full bath" for my parents who are moving in. You can't filter whether the backyard is flat enough for a toddler, or whether the lot backs onto a four-lane road.

None of that is a field in any listing feed. All of it is sitting in the floor plan and the satellite photo.

So it isn't a search problem. It's a seeing problem.

## The first version was a lie

I built something over a weekend that looked like it was analysing floor plans. Scores, findings, confident write-ups about entrance orientation and yard grade.

Then I read my own code. The image-fetching was commented out. Every "analysis" was the model guessing from the street address. It had never seen a single drawing.

It was also slow — 30 seconds a scan — and three of five aerial images were 404ing behind a loading spinner that never resolved.

## The fix was a split, not a better prompt

The thing that made it work was deciding what the model is *for*.

**Gemini does perception. Code does judgement.**

The model gets two images and one question: what is physically in this drawing? Where's the front door. Which quadrant is the kitchen. Does the downstairs bathroom have a tub in it, or just a toilet and a sink. It never sees my preferences and never produces a score.

A scoring engine in TypeScript takes those findings and decides what they're worth *to me*.

That one separation bought four things I didn't expect:

**It made results cacheable.** Perception depends only on the images, so it's computed once per house. Changing a preference re-scores from cache in 23 milliseconds with zero model calls.

**It made scores reproducible.** Same house, same number, every time. You can compare houses across weeks and the comparison means something.

**It made the rulebook swappable.** Vastu and Feng Shui are lookup tables, not prompts. They genuinely disagree — a south-facing entrance is a flaw in one and the classical ideal in the other — so switching re-ranks the whole list without calling Gemini at all.

**It made accuracy measurable.** Which turned out to matter most.

## You can't measure a model against data you scraped

I generate the floor plans with Gemini 3.1 Flash Image, from written specs. That sounds like a shortcut. It's the opposite.

If I'd scraped real listings, I'd have no answer key. I could show you a confident-looking output and neither of us could tell whether it was right.

Because I wrote the spec each drawing was made from, I know the correct answer for every one. So there's a harness that replays the agent's readings against that truth:

```
exact     39/42   93%
adjacent   3/42    7%     (one compass point out on a hand-drawn plan)
wrong      0/42    0%
```

Nothing read backwards. And it runs offline in about a second, so anyone can re-run it.

The three "adjacent" misses are the model saying North where the spec said North-East. That's the disagreement two surveyors would have.

## Four things I only learned by deploying

**`gemini-3.5-flash` was the wrong default.** On identical two-image requests it once took **59 seconds to return a 503**. `gemini-3.5-flash-lite` answered the same request in 1.5 seconds at the same accuracy. Both satisfy the hackathon's model requirement. I now run a fallback chain and record which model produced each reading.

**503 UNAVAILABLE is not 429 RESOURCE_EXHAUSTED.** I spent an evening assuming I was rate-limited. Every single failure was capacity on Google's side. Enabling billing doesn't fix it. A fallback chain does.

**The Firestore client throws an *uncaught* exception when credentials are missing** — from a deferred gRPC stub, outside any try/catch around the call that triggered it. The process just dies seconds after boot. You have to check for credentials before constructing the client.

**Cloud Run throttles CPU to near zero between requests.** OpenTelemetry's batch processor never fires its timer, so buffered spans die with the container. Export per-span instead.

## The part that took three tries

Feedback was supposed to be the good bit: say what you think in plain English, watch it re-rank.

It didn't work. Rejecting a house moved its score by about a point. Sometimes *up*.

The maths was fine and the design was wrong. Feedback adjusted global weights, and a score is a weighted average over seven dimensions — so one weight moving 0.2 shifts the total by under a point. Worse, raising the weight of a dimension a house scores *well* on raises that house. I rejected the top-ranked property three times and watched it stay top-ranked.

Weights express what you like in general. They cannot express *not this one*.

The fix was to record a verdict against the specific property. Reject a house and it drops to 25 and falls to the bottom, flagged. Global weight learning still happens beside it — it's just no longer asked to do a job it structurally can't.

I'd been tuning numbers when the actual problem was a missing concept.

## Where it ended up

It runs unattended. Cloud Scheduler triggers it every morning; it reads whatever hit the market overnight and decides on its own whether anything is worth surfacing. Staying quiet is a valid outcome — an agent that pings you about every new listing is a worse email alert.

When you've picked what's worth seeing, it plans the day: orders the stops by geography, allocates time, says what to check at each door based on what it found in the plan, and hands back a Google Maps route.

Built on Gemini 3.5 Flash-Lite through the Google GenAI SDK, running on Cloud Run with Firestore, Cloud Scheduler and Cloud Trace.

Code: https://github.com/skg0525/allthingsagentichackathon

I'm still house hunting. But I'm touring the right three instead of the wrong twenty-two.

---

## 2. Social post

**LinkedIn** (better fit than X for this):

```
I've toured 22 houses this year and still haven't bought one.

Not because nothing's available — because what rules a house out for us isn't a
filter on any listing site. Which way the front door faces (Vastu, non-negotiable
in my family). Whether the downstairs bathroom has a tub for my parents. Whether
the yard is flat enough for a toddler.

None of that is in the listing data. All of it is in the floor plan and the
satellite image.

So I built VastuNest for the All Things Agentic Hackathon. Gemini 3.5 Flash-Lite
reads the drawings and reports what's physically there. Separate code decides what
that's worth to me — the model never sees my preferences and never produces a
score.

That split meant I could actually measure it: 93% exact against known ground
truth, 0% wrong, across 42 fields.

It also runs without me. Cloud Scheduler wakes it every morning, it reads whatever
came on the market overnight, and it decides on its own whether anything is worth
telling me about.

Built on Google Cloud — Cloud Run, Firestore, Cloud Scheduler.

#AllThingsAgenticHackathon
```

Attach the demo video or a screenshot of the ranked list.

**If you post on X**, cut to the first three paragraphs plus the hashtag.

---

## Do the blog first

It's worth more. The social post takes two minutes after.

Both links go in the optional fields at the bottom of the Devpost form.
