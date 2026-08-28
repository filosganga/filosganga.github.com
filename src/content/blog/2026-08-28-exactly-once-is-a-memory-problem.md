---
title: "Exactly-once is a memory problem"
date: 2026-08-28
tags: ["distributed-systems", "kafka", "dynamodb", "scala"]
excerpt: "You will receive the same message twice. The fix isn't a stronger delivery guarantee — it's remembering what you already did, and one database primitive is enough to do it."
image: "/og-exactly-once.png"
draft: true
---

![A technical sheet showing the deduplication record — id, processorId, startedAt, completedAt, expiresOn — and the four states a processor can find, each with its decision](/og-exactly-once.png)

Sooner or later your consumer gets the same message twice.

Not because something is broken. Because at-least-once is what you asked for the
moment you decided you'd rather see a message twice than lose it. A consumer dies
between doing the work and committing the offset; a producer retries a request whose
response never made it back; a rebalance replays a partition from the last commit.
Every one of those is the system working correctly.

So the industry sells you exactly-once, and it's worth being precise about what you're
buying.

## What exactly-once actually covers

Kafka's transactional producer is real and it works. Consume from a topic, transform,
produce to another topic, commit the offsets — all in one transaction, all or nothing.
Within that boundary, exactly-once is not marketing.

The boundary is the whole point. It holds because Kafka owns both ends: the offsets and
the output are in the same system, so they can be committed atomically.

Now put an effect on the other side. Charge a card. Send an email. Call an API you don't
own. Write to a database that isn't Kafka. There is no transaction spanning that — the
external system doesn't participate in Kafka's commit, and it never will. The message is
delivered at least once, the effect happens at least once, and the guarantee stops at the
edge of the system that issued it.

Which turns the problem into a different one:

> **Not "how do I stop receiving it twice", but "how do I know I've already done this".**

That's not a delivery question. It's a memory question.

## The primitive that's enough

The instinct is to reach for coordination — a lock, a lease, something consensus-shaped.
You don't need any of it. Deduplication across nodes needs exactly one thing from your
database:

> **a conditional write that tells you what was there before**

An upsert that returns the previous value, executed with strong consistency. That's it.
If two nodes race, both writes land in some order, and each one learns whether it was
first. No lock, no election, nothing to time out on.

DynamoDB gives you this — a conditional `UpdateItem` with `ReturnValues: ALL_OLD`, on a
strongly consistent write path. So does Cassandra with lightweight transactions. So does
Postgres with `INSERT … ON CONFLICT … RETURNING`. The pattern isn't about DynamoDB; it's
about those two properties, and the shape below works on anything that has them.

## Two phases, because the effect can die

Recording "I did this" *after* the work is not enough — the process can die between the
effect and the record, and the next attempt has no way to know. So you write twice: once
before, once after.

The record is small:

```
id           the signal
processorId  who is processing it
startedAt    when this attempt began
completedAt  when it finished — absent while in flight
expiresOn    when this memory may be forgotten
```

`processorId` is what lets several consumers deduplicate independently. Two services
consuming the same topic have different processor ids, so both get to act on the message;
two instances of the *same* service share one, so only one of them does.

Every attempt starts by writing `startedAt` and reading back whatever was there before.
Four things come back, and each has a different answer:

| What you find | What it means | Decision |
| --- | --- | --- |
| nothing | never seen | **process it** |
| `completedAt` set | already done | **skip** |
| no `completedAt`, `startedAt` old | previous attempt died | **process it** |
| no `completedAt`, `startedAt` recent | another node is on it | **wait** |

The first two are obvious. The other two are where the design actually lives.

## The uncomfortable one

Case three — a stale `startedAt` with no completion — means some previous attempt began
and never finished. Almost always it died. So you retry.

But you cannot tell the difference between *died before the effect* and *died after the
effect, before recording it*. In the second case, retrying does the work twice.

That window is small, and it is not zero. Which is the honest description of what this
buys you: **not the elimination of duplicates, but their reduction to a narrow window
around process death**. If the effect is genuinely dangerous to repeat — money moving —
you want it idempotent on the other side too, keyed by the same id. Deduplication and
idempotency are complementary, not alternatives, and anyone who tells you they've
achieved exactly-once end-to-end has quietly assumed one of them.

## The parameter that is really a domain decision

Case three needs a threshold: how old must `startedAt` be before you decide the attempt
is dead? That's `maxProcessingTime`, and it looks like a config value while being a
statement about your domain.

Set it too low and you declare healthy-but-slow work dead, and process it concurrently
with itself — the exact thing you built this to prevent. Set it too high and a genuinely
crashed message sits untouched for that long before anyone retries it.

There's no safe default, because the right value is "longer than the slowest legitimate
run, shorter than anyone's patience". Nobody but you knows that number, which is why it
shouldn't have a default at all.

Case four falls out of the same reasoning: a recent `startedAt` means somebody is working
right now. You can't process — that's a duplicate — and you can't skip, because the other
attempt might still fail. So you wait, and re-read, until it either completes or ages
into case three.

## Memory has to end

`expiresOn` is the part people skip, and then the table grows forever.

You cannot remember every message you have ever seen. So deduplication is always
**within a window**: a duplicate arriving after the record expires will be processed
again, and that's by design. Pick the window from how late a duplicate can realistically
turn up — the producer's retry budget, the replay window of your broker, how far back an
operator might rewind offsets — and make it comfortably longer than that.

With DynamoDB, `expiresOn` as a TTL attribute means the cleanup is free: the table
evicts old records on its own.

## What you actually end up with

Not exactly-once. Something narrower, and true:

> **Effectively-once, within a bounded time window, for a given processor, provided the
> effect is either fast or idempotent.**

Every clause in that sentence is doing work, and every one of them is a decision you made
— the window, the processor id, the processing timeout. That's more honest than a flag
called `exactly.once=true`, and rather more useful, because you can reason about which
clause is the one that will break.

The implementation of all this is [mnemosyne](https://github.com/filosganga/mnemosyne) —
named after the Greek goddess of memory, which is the entire point. It wraps an effect in
`protect` and runs it once per processor, and it's about as much code as this post
suggests it should be. The interesting part was never the code. It was noticing that the
whole thing reduces to one conditional write, and that your database probably already
does it.
