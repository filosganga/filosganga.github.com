---
layout: post
title :  Round-Robin Iterable
category : programming
tags : [Java, Pattern, Guava]
---
{% include JB/setup %}
It is a solution I have written because my collegue was struggling to write a 
code that was collecting one element for each list in an ordered way and 
accepting list of different size.

The problem was collecting 50 images from a third party supplier. Each record 
has a set of albums, a ordered list of image, and a set of featured images pick
from the albums. We want to collect 50 images, starting from the feature and then
going trough the albums in a round-robin fashon (the first for each album, the 
second and so on). The album may have different size.

So if we have the feed containing these image id:

    featuredImages: [1, 5, 4, 9]
    albumOne: [1, 2, 3, 4]
    albumTwo: [5, 6, 7, 8, 9, 10]
    albumThree: [11]
    albumFour: [12, 13, 14]

And we want to collect 10 images we got:

    images: [1, 5, 4, 9, 5, 11, 12, 2, 6, 13]
    
The most simple solution I have think to to has been to use [Guava Iterables](http://docs.guava-libraries.googlecode.com/git-history/release/javadoc/com/google/common/collect/Iterables.html)
to limit the image to 10. 

{% highlight java %}
Iterable<Image> images = limit(concat(featuredImages, albumImages), 10)
{% endhighlight %}

But how can I obtain the albumImages in the right order (round-robin)? I need a
custom {{Iterator}}, then I have written this one:

{% highlight java %}
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
{% endhighlight %}

It leverage on the lazy evaluation of {{Iterator.hasNext()}} so the 
{{Iterator<Iterator<T>>}} will cycle over the given iterator, skipping the empty
iterators on the fly.

And that's it. Well actually no, we want a test, don't we?

{% highlight java %}
public class RoundRobinIterableTest {
 
    @Test
    public void iteratorShouldBeWorkAsExpected() {
 
        List<Integer> numbers = newArrayList(RoundRobinIterable.of(asList(1,2,3,9), asList(4,5), asList(6,7,8)));
        List<Integer> expected = newArrayList(1, 4, 6, 2, 5, 7, 3, 8, 9);
 
        assertThat(numbers, equalTo(expected));
    }
}
{% endhighlight %}

The full code is available at the [RoundRobinIterable.java gist](https://gist.github.com/filosganga/7134943)

Happy coding!
