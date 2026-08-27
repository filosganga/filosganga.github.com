---
title: "Optimistic locking stops at the region border"
date: 2026-08-27
tags: ["dynamodb", "distributed-systems", "aws", "architecture"]
excerpt: "A version check that passes in two regions at once isn't a broken lock — it's a lock answering a different question. What that costs you, and which conflicts are worth resolving versus modelling away."
draft: true
---

Consider a record in a DynamoDB global table, replicated active-active across three
regions. It has three fields:

- `leaseUntil` — a lease expiry, pushed forward whenever the client is active
- `tenantId` — reassigned by a batch job
- `settings` — a JSON blob written by more than one client

Three fields, three systems writing them, none aware of the others. Every write is
guarded by optimistic locking: a `version` attribute and a conditional update.

Writes still went missing.

## A version check that passes twice

Optimistic locking works. Within a region.

Global tables replicate asynchronously, and a conditional expression is evaluated
against the **local** replica. So two regions can both read `version = 10` and both find
the condition satisfied:

```
region A   read v10 → set tenantId = T-9   → write v11   ✓ succeeds
region B   read v10 → set leaseUntil = Nov → write v11   ✓ succeeds
```

Neither write fails. Neither client sees an error. There is nothing to retry, because as
far as each region is concerned nothing went wrong — and note that the two are changing
*different fields*, so there is no disagreement to resolve in the first place.

Replication then reconciles two items that both claim to be version 11, using
last-write-wins on the replication timestamp. Whichever loses takes its field with it: the
tenant reassignment or the lease extension is simply gone, and no one was ever told.

The lock isn't broken. It answers a different question — "did anyone else in *this*
region touch the row since I read it?" — and answers it correctly. Cross-region
concurrency simply isn't visible at the moment of commit. If your mental model is
"the version check protects the record", the region border is where that model stops
being true.

## Last-write-wins is worse than it sounds

It's tempting to accept LWW as the price of active-active. Two things make that price
higher than it looks.

**LWW resolves items, not fields.** If one writer touches `leaseUntil` and another
touches `settings`, the winning item carries its own stale copy of the field it never
modified. You didn't lose a contested write — you lost an *uncontested* one. Two writers
that were never in conflict, because they were changing different things, still clobber
each other because those things happen to share an item.

**LWW knows nothing about your domain.** `leaseUntil` has an invariant: it only ever moves
forward. Nothing in DynamoDB knows that. A delayed event carrying an earlier expiry has a
later replication timestamp, so it wins — and the expiry moves backwards:

```
T0                leaseUntil = Oct 20
T1  region A      extend to Nov 20   (fresh, correct)
T2  region B      extend to Oct 25   (delayed event, stale value)

converged state:  leaseUntil = Oct 25
```

Every replica agrees. Nothing is inconsistent. The system converged on a value that
violates the one rule the field had. That's not eventual consistency being eventual —
it's an invariant being broken *and then replicated everywhere*, which is considerably
harder to notice than a transient disagreement.

## The fix that looks obvious and isn't

The first instinct is to route: pin every write for a given record to a single region and
the problem is gone.

It holds for synchronous client traffic, where the source IP already determines the
region. It falls apart for everything else:

- async event consumers run wherever the consumer happens to be scheduled
- batch jobs run from an arbitrary region
- back-office operations originate wherever the operator is
- clients roam, and their "home" region changes underneath them

Routing covers the slice of traffic that was already the best behaved, and leaves every
source that has no region affinity in the first place. It's not wrong, it's just aimed at
the wrong half of the problem.

## Stop sharing the item

Here's the thing worth noticing: the conflict between `leaseUntil` and `settings` isn't
a conflict at all. Nobody is disagreeing about a value. It's an artifact of the two fields
sharing an item, and therefore sharing a version and a replication timestamp.

So stop sharing:

```
PK: Record#123  SK: #Lease        leaseUntil
PK: Record#123  SK: #Tenant       tenantId
PK: Record#123  SK: #Settings     settings
```

Each item gets its own version. Writers touching different fields now touch different
items and never interact — not because conflicts are resolved better, but because they no
longer exist.

The cost is real: reads amplify from one item to a query over the partition key, item
count grows, and existing records need migrating. The gain is that an entire *class* of
conflict is gone rather than mitigated — and that class is usually the bulk of the
problem, because the highest-frequency path tends to touch several fields in one call
while every other writer lands on top of it.

**The cheapest conflict to resolve is the one you don't have.** Before building a
reconciliation engine, it's worth asking whether the data that keeps colliding has any
reason to live together. Often it's sharing an item because it arrived at the same time
during design, not because anything reads or writes it together.

## What's left is the real problem

After splitting, what remains is genuine contention: **the same field, written by
different sources**. Two lease extensions from two different paths. Two patches to the same
setting, one from a client and one from back-office tooling.

No amount of remodelling makes that go away. Two writers really are disagreeing about one
value, and something has to decide. The question is only whether that decision knows
anything about your domain.

## Give the merge some domain knowledge

Two rungs on this ladder, and they cost very different amounts.

**Per-field timestamps.** If `settings` is a blob patched by several sources, store a
timestamp beside each field rather than for the item as a whole:

```json
{
  "theme": "dark",
  "theme_updatedAt": 1728045000,
  "language": "en-GB",
  "language_updatedAt": 1728043000
}
```

Patches to different fields merge. Patches to the same field resolve by last-write-wins
per field — still arbitrary, but deterministic, and no longer taking the neighbouring
fields down with it. This doubles the storage for the blob and needs no new
infrastructure. For data with no invariants, it's usually enough.

**Event sourcing, where an invariant exists.** For `leaseUntil`, timestamps don't help.
The rule isn't "latest wins", it's "furthest forward wins", and no amount of ordering
metadata expresses that.

So write down intentions instead of states: an append-only log of events
(`LeaseExtended`, carrying the new value and its origin), plus a per-region materialised
view rebuilt from that log. Reconciliation is then free to encode the rule:

```scala
def apply(state: State, e: LeaseExtended): State =
  state.copy(leaseUntil = state.leaseUntil max e.newLeaseUntil)
```

`max` is commutative, associative and idempotent. Arrival order stops mattering.
Duplicates stop mattering. Delayed events stop mattering — the stale one is absorbed with
no effect rather than winning on a timestamp. Every region converges on the same value,
and that value satisfies the invariant by construction.

If that sounds like a CRDT, it is one: a grow-only register. You don't need the whole
event-sourcing apparatus to get it, but once a field needs a merge function this specific,
you need *somewhere* to put that function, and a log of intentions is a good place.

The costs are not small — an events table, streams, consumers, monitoring, event schema
evolution, and a migration. Which is exactly why I'd scope it to the fields that have an
invariant, rather than to the whole record. Event sourcing here is the answer to "this
merge needs to understand the domain", not to "we have a concurrency problem". Reaching
for it because writes are being lost, when the writes were being lost because unrelated
fields shared an item, is a lot of machinery bolted onto a modelling mistake.

## The order I'd work in

1. **Split by writer.** Group fields by what updates them, not by what reads them
   together. Best effort-to-benefit ratio, and it makes everything after it smaller.
2. **Measure what's left.** The remaining conflicts are usually far fewer, and far more
   interesting, than the ones you started with.
3. **Per-field timestamps** where merges are structurally independent.
4. **Event sourcing** only where an invariant exists that last-write-wins can violate.

The question isn't "which consistency pattern do we adopt". It's **which conflicts can I
model away, and which do I actually have to resolve** — two different jobs, and the
second one costs an order of magnitude more than the first. Most of the pain comes from
paying that price for conflicts that were never real.
