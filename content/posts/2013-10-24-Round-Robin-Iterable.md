---
title:  "Round-Robin Iterable"
category: programming
tags: [java]
date: 2013-10-24
---
I had the task of collecting 50 images from a third-party supplier. Each record 
has a set of albums, an ordered list of images, and a set of featured them picked
from the albums. We want to collect 50 images, starting from the feature and then
going through the albums in a round-robin fashion (the first for each album, the second, and so on). The album may have different sizes.

So if we have the feed containing these image id:

```java
featuredImages: [1, 5, 4, 9]
albumOne: [1, 2, 3, 4]
albumTwo: [5, 6, 7, 8, 9, 10]
albumThree: [11]
albumFour: [12, 13, 14]
```

And we want to collect 10 images we got:

```java
images: [1, 5, 4, 9, 5, 11, 12, 2, 6, 13]
```

The most simple solution I think, has been to use [Guava Iterables](http://docs.guava-libraries.googlecode.com/git-history/release/javadoc/com/google/common/collect/Iterables.html)
to limit the image to 10. 

```java
Iterable<Image> images = limit(concat(featuredImages, albumImages), 10)
```

But how can I obtain the albumImages in the right order (round-robin)? I need a
custom {{Iterator}}, then I have written this one:

```java
public class RoundRobinIterable<T> implements Iterable<T> {
 
    private final Iterable<Iterable<T>> iterables;
 
    public RoundRobinIterable(Iterable<Iterable<T>> iterables) {
 
        checkNotNull(iterables);
 
        this.iterables = iterables;
    }
 
    @Override
    public Iterator<T> iterator() {
 
        final Iterator<Iterator<T>> it = cycle(filter(
                FluentIterable.from(iterables)
                .transform(RoundRobinIterable.<T>iteratorFn())
                .toList(),
                hasNextPr()
        ));
 
        return new UnmodifiableIterator<T>() {
            @Override
            public boolean hasNext() {
                return it.hasNext();
            }
 
            @Override
            public T next() {
                return it.next().next();
            }
        };
 
    }
 
    private enum HasNext implements Predicate<Iterator<?>> {
        INSTANCE;
 
        @Override
        public boolean apply(Iterator<?> input) {
            return input.hasNext();
        }
    }
 
    private static Predicate<Iterator<?>> hasNextPr() {
        return HasNext.INSTANCE;
    }
 
    private static <T> Function<Iterable<T>, Iterator<T>> iteratorFn() {
        return new Function<Iterable<T>, Iterator<T>>() {
            @Override
            public Iterator<T> apply(Iterable<T> input) {
                return input.iterator();
            }
        };
    }
}
```

It leverages on the lazy evaluation of {{Iterator.hasNext()}}, so the 
{{Iterator<Iterator<T>>}} will cycle over the given iterator, skipping the empty
iterators on the fly.

And that's it. Well, actually, no, we want a test, don't we?

```java
public class RoundRobinIterableTest {
 
    @Test
    public void iteratorShouldBeWorkAsExpected() {
 
        List<Integer> numbers = newArrayList(RoundRobinIterable.of(asList(1,2,3,9), asList(4,5), asList(6,7,8)));
        List<Integer> expected = newArrayList(1, 4, 6, 2, 5, 7, 3, 8, 9);
 
        assertThat(numbers, equalTo(expected));
    }
}
```

The full code is available at the [RoundRobinIterable.java gist](https://gist.github.com/filosganga/7134943)

Happy coding!
