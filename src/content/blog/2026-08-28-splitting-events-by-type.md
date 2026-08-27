---
title: "Splitting events by type breaks the only ordering you had"
date: 2026-08-28
tags: ["kafka", "event-sourcing", "distributed-systems", "architecture"]
excerpt: "Three ways to lay out domain events across Kafka topics. One of them looks like the tidy option and quietly costs you the ability to rebuild state at all."
image: "/og-splitting-events-by-type.png"
draft: true
---

![Three Kafka topic layouts drawn as a technical sheet: one topic per entity with several event types, one topic of self-contained snapshots, and one topic per event type — the last one marked as having no ordering between its partitions](/og-splitting-events-by-type.png)

Take a model everyone already knows: GitHub-style organizations. Users, organizations,
and a membership between them carrying a role. The organization can be created, renamed
and deleted; members join, change role, and leave.

Six things that can happen. The question is how they get laid out across Kafka topics —
and the answer decides what you're able to rebuild later, which is not obvious until the
day you need to rebuild something.

There are three layouts people reach for.

## Layout 1 — one topic per entity, several event types

```
topic: github_organization_v1

OrganizationCreated(organizationId, name)
OrganizationUpdated(organizationId, name)
OrganizationDeleted(organizationId)
MemberJoined(organizationId, memberId, role)
MemberRoleUpdated(organizationId, memberId, role)
MemberLeft(organizationId, memberId)
```

Each event is an atomic change: something that happened, at a point in time, to one
organization. The topic is the journal of those changes. Current state is a fold over
everything so far.

## Layout 2 — one topic per entity, one self-contained event type

```
topic: github_organization_v1

OrganizationUpdated(organizationId, name, members)
```

Every event carries the whole organization. Nothing is a delta; each message supersedes
the one before it.

## Layout 3 — one topic per event type

```
topic: github_organization_created_v1        OrganizationCreated(...)
topic: github_organization_updated_v1        OrganizationUpdated(...)
topic: github_organization_deleted_v1        OrganizationDeleted(...)
topic: github_organization_memberJoined_v1   MemberJoined(...)
topic: github_organization_memberRole_v1     MemberRoleUpdated(...)
topic: github_organization_memberLeft_v1     MemberLeft(...)
```

One topic, one schema, one meaning. This is the one that looks tidiest on a whiteboard,
and it's the one I'd argue hardest against.

## The question that settles it

Not "which is cleanest". This one:

> **What still holds when two of these events happen close together?**

Kafka's ordering guarantee is narrower than people remember. It is not per topic. It is
**per partition**: messages appended to one partition are read in the order they were
appended, and that is the entire promise. Across partitions there is no relationship at
all — no global clock, no cross-partition sequence, nothing.

Which partition a message lands in comes from its key. Key everything by
`organizationId` and every event for one organization goes to one partition, in order,
forever. Layouts 1 and 2 both get this for free.

Layout 3 cannot get it at any price. `MemberJoined` and `MemberRoleUpdated` live in
different topics, therefore different partitions, therefore in no defined order relative
to each other. A consumer reading both can legitimately see the role change before the
join. Not because anything is broken — because you asked two independent logs to describe
one story.

You can rebuild the ordering, of course. Buffer events, sort by an embedded timestamp,
hold them until you're reasonably confident nothing older is still coming. You've now
written a reordering buffer in every consumer, with a watermark, and made it somebody's
job to pick the timeout. That machinery is the price of the layout, and it's usually
discovered after the layout has shipped.

## Why layout 3 is tempting anyway

Almost always for one reason: **one topic, one schema**. It feels typed. A consumer of
`github_organization_memberJoined_v1` knows exactly what it's getting, and the schema
never has to be a union of six things.

That reason is false, and it's worth knowing why, because it's the only real argument for
the layout. A topic is not restricted to one schema. With the Confluent Schema Registry,
the subject naming strategy is configurable: the default `TopicNameStrategy` gives you one
subject per topic and thus one schema, but `TopicRecordNameStrategy` keys the subject by
topic *and* record type, so a single topic can carry several event types, each with its
own schema, each evolving under its own compatibility rules. ([More on how Avro and the
registry fit together](/blog/2023-05-10-avro-schema-registry/).)

So you can have both: a single ordered log per entity, and precise schemas per event type.
Layout 3 trades away ordering to buy something it never had to pay for.

## Layouts 1 and 2 are the real choice: delta or snapshot

Both keep the ordering. They differ in what a single message contains, and that difference
shows up somewhere unexpected.

**Layout 1 writes deltas.** Messages stay small — `MemberJoined` carries one member, not
all of them. The log is the history: you can replay to any point in time and see the
organization as it was, which is what people usually mean by event sourcing. The cost is
that the log only grows, and reconstructing current state means reading all of it.

**Layout 2 writes snapshots.** Each message is complete, so a consumer needs exactly one
message per organization to know its state. The cost is that messages grow with the
entity — an organization with 5,000 members ships 5,000 members on every single role
change — and the history is gone: each event overwrites the meaning of the last, so
there's no "as it was on Tuesday" to replay.

## The bit that isn't a config flag

Here's what makes this a modelling decision rather than a topic setting: **log compaction
is only available to layout 2.**

Compaction keeps the most recent message per key and discards the rest. On snapshots,
that's exactly right — the latest one is complete by construction, and everything older is
genuinely redundant. The topic stops growing without bound, and a new consumer bootstraps
state by reading one message per key instead of the entire history.

Run compaction over deltas and you destroy the data. `MemberJoined` and `MemberLeft` for
the same key are not redundant with each other; they're two different facts, and keeping
only the newest turns the log into nonsense. So layout 1 needs retention by time or size,
and once events start ageing out you can no longer rebuild from the beginning — you need
periodic snapshots stored somewhere else, which is a second mechanism to build and
operate.

That's the actual trade:

| | Layout 1 — deltas | Layout 2 — snapshots |
|---|---|---|
| Ordering | per-key, free | per-key, free |
| Message size | small, constant | grows with the entity |
| History | complete, replayable | last state only |
| Compaction | not applicable | yes |
| Bootstrapping a consumer | read the whole log | one message per key |
| Unbounded growth | yes — needs retention + snapshots | no |

## What I'd pick

**Layout 1 by default.** Small events, full history, ordering for free, and the log means
what event sourcing says it means: a record of what happened, not a record of what things
currently look like. Most domains want that, and the ones that don't usually discover they
did.

**Layout 2 when the entity is bounded and you mostly want current state.** If nobody is
going to replay history, and the entity can't grow arbitrarily, compaction is a real
operational gift: the topic pays for itself and consumers start fast. It's a legitimate
choice, not a compromise.

**Layout 3 never.** It gives up the one guarantee Kafka actually offers, in exchange for a
schema constraint that the registry can lift without it.

The general shape of it: **your topic layout is not a naming convention, it's a decision
about what remains true when things happen at once.** Both of the layouts worth using key
by entity, because that's what puts causally related events in the same partition — and
same partition is the only place Kafka promises anything.
