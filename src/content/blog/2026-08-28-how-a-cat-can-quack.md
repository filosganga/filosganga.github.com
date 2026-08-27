---
title: "How a cat can quack"
date: 2026-08-28
tags: ["scala", "type-classes", "functional-programming"]
excerpt: "Duck typing says: if it quacks, it's a duck. Type classes say something stranger and more useful — it is not a duck, it never was, and you taught it to quack anyway."
image: "/og-how-a-cat-can-quack.png"
draft: false
---

![A cat drawn as a technical diagram, with a duck bill fitted over its muzzle and labelled "quack module — fitted externally, type unchanged"](/og-how-a-cat-can-quack.png)

Duck typing has a slogan, and the slogan is good:

> If it looks like a duck, swims like a duck, and quacks like a duck, then it
> probably is a duck.

The appeal is obvious. You stop caring what something *is* and start caring what
it can *do*. A function works on anything that happens to have the right shape,
and you never have to make two unrelated libraries agree on a common base class.

There are two things wrong with it, and only one of them is the one people
usually mention.

## The problem everyone talks about

Nothing checks the shape until you run the program. Pass something without a
`quack` and you find out in production, at the call site, at the worst possible
moment. That's the familiar complaint about dynamic typing, and it's real.

## The problem that actually matters

Even with the check, the slogan quietly demands that **the object already knows
how to quack**. The capability has to be baked into the thing.

So what happens when it isn't? You have a `Cat`, or an `Int`, or a class from a
library you didn't write and can't change, and you need it to quack. Duck typing
has no answer: the duck test only tells you whether something passes, never how
to make it pass.

Inheritance has an answer, but it comes with a deadline. `class Cat extends
Quacks` works only if you decide *at the moment you define `Cat`* that quacking
matters. Miss that moment — or don't own `Cat` at all — and the door is closed.
For `Int` it was closed decades ago.

## Teach it instead

Type classes make a different move, and once you see it you can't unsee it:

**The cat is not a duck. It never was. And you can teach it to quack anyway.**

The capability doesn't live in the type. It lives in a separate piece of
evidence that says "here's how *this* type quacks", written by whoever needs it,
whenever they need it, without touching the type at all.

## Writing one

Start with the capability, on its own, as a trait parameterised by the type it
applies to:

```scala
trait Quacks[A]:
  extension (a: A) def quack: String
```

That's the whole declaration. It says: for some type `A`, there is a way to make
an `A` quack. Note what it does *not* say — nothing about cats, nothing about
ducks, no requirement that `A` inherit from anything.

Now the evidence. A `given` is an instance of that trait for one specific type:

```scala
case class Cat(name: String)

given Quacks[Cat] with
  extension (c: Cat) def quack = s"${c.name} says quack"
```

`Cat` is untouched. It doesn't extend anything, doesn't know `Quacks` exists,
and would compile fine if you deleted the given tomorrow. The knowledge of *how
a cat quacks* lives outside the cat.

That's the whole idea. Everything else is mechanics.

## Using one

A function asks for the evidence rather than for a shape:

```scala
def makeItQuack[A: Quacks](a: A): String = a.quack
```

`[A: Quacks]` is a context bound — sugar for "and also take a `Quacks[A]`". The
compiler goes looking for one at the call site, and if it can't find it, the
call doesn't compile:

```scala
makeItQuack(Cat("Silvestro"))   // Silvestro says quack
makeItQuack("hello")            // error: no given instance of Quacks[String]
```

That second line is the payoff. The duck test's failure mode was a runtime
surprise. Here it's a compile error naming exactly what's missing.

## The part that makes it worth the trouble

Here's the move inheritance can't make:

```scala
given Quacks[Int] with
  extension (n: Int) def quack = List.fill(n)("quack").mkString(" ")
```

```scala
makeItQuack(3)   // quack quack quack
```

`Int` is not yours. It predates your program by decades, it's final, and no
amount of design foresight in 2004 was going to include your `Quacks` trait. It
quacks anyway.

Now replace `Int` with a type from a library you depend on — a `UserId` from
some SDK, a case class generated from a schema — and the same thing works. You
can give a capability to a type you don't own, without forking it, without
wrapping it, without asking its author for anything.

Wrappers get you partway there, but they cost you: now you have `QuackableInt`
alongside `Int`, and every boundary in your program needs to remember which one
it's holding. Type classes leave the type alone.

## You have already been using them

None of this is exotic. Scala's standard library is full of it — `Ordering[A]`
is exactly this pattern, which is why `sort` works on types the sorting code has
never heard of. So is `Numeric[A]`.

Cats is built on it: `Show[A]`, `Eq[A]`, `Monoid[A]`. So is every JSON library
worth using — circe's `Encoder[A]` is a type class, and deriving one for your
case class is exactly the act of teaching a type to quack.

Once the shape is familiar, a lot of Scala library design stops looking arbitrary.

## When not to reach for one

Type classes buy you a specific thing: the ability to add a capability, later,
from outside, to a type you may not control. If you don't need that, you're
paying indirection for nothing.

If `Cat` is yours and quacking is genuinely part of being a cat, write a method.
It's simpler, it's easier to find, and nobody has to reason about implicit
scope. The type class earns its keep when the capability is separable from the
type — when it belongs to a library, a protocol, a serialisation format, or
anything else that shouldn't get a vote in how `Cat` is defined.

The test I use: *could two different codebases reasonably want this to work two
different ways?* If yes, it doesn't belong inside the type.

---

Duck typing asks whether something already quacks. Type classes let you decide
that it does — after the fact, from the outside, for a type that will never be a
duck and doesn't need to be.
