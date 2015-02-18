---
layout: post
title :  Pimping JSoup
category : programming
tags : [scala, pattern, jsoup, pimp-my-library]
---
{% include JB/setup %}
I started to develop a web crawler part of a bigger project, then I have to 
choice what kind of HTML parser library I have to use. I have used NekoHTML
in the past and it was pretty good but it doesn't have any helper to select
the DOM elements, you have o use the XPath, very flexible but not so easy.

I have found [JSoup](http://jsoup.org/) to be very cool library, its code is 
well written, clean and the interface is powerful. I love it. I was writing 
a Scala crawler so beside the [JSoup](http://jsoup.org/) interface is pretty 
cool, it is very javish, I prefer to have a better integration with Scala, so 
I started my first [Pimp My Library](http://www.artima.com/weblogs/viewpost.jsp?thread=179766) pattern.

Let talk the code:
{% highlight scala %}
object Jsoup extends Jsoup

trait Jsoup {

  protected[Jsoup] def withDocument[T](url: String)(d: Document => T) = {
    try {
      Right(d(JJSoup.connect(url).get()))
    }
    catch {
      case e: IOException => Left(e)
    }
  }

  implicit def enrichNode(n: Node) = new RichNode(n)

  implicit def enrichElement(x: Element) = new RichElement(x)

  implicit def enrichDocument(x: Document) = new RichDocument(x)

  implicit def enrichElements(xs: Elements) = new RichElements(xs)

}

class RichNode(value: Node) {

  def nextSibling: Option[Node] = value.nextSibling match {
    case null => None
    case x => Some(x)
  }

}


class RichElement(value: Element) extends RichNode(value) {

  def getElementById(id: String): Option[Element] = value.getElementById(id) match {
    case null => None
    case x => Some(x)
  }

  def getElementsByTag(tag: String): Iterable[Element] = 
	Jsoup.enrichElements(value.getElementsByTag(tag))

  def getElementsByClass(tag: String): Iterable[Element] = 
	Jsoup.enrichElements(value.getElementsByClass(tag))

  def getElementsByAttribute(tag: String): Iterable[Element] = 
	Jsoup.enrichElements(value.getElementsByAttribute(tag))

  def getElementsByAttributeStarting(tag: String): Iterable[Element] = 
	Jsoup.enrichElements(value.getElementsByAttributeStarting(tag))

  def getElementsByAttributeValue(k: String, v: String): Iterable[Element] = 
	Jsoup.enrichElements(value.getElementsByAttributeValue(k, v))

  def apply(name: String): Option[String] = Option(value.attr(name))

}

class RichDocument(value: Document) extends RichElement(value) {

  def head = value.head match {
    case null => None
    case x => Some(x)
  }

  def body = value.body match {
    case null => None
    case x => Some(x)
  }

  def select(query: String) = new RichElements(value.select(query))

}

class RichElements(target: Elements) extends Iterable[Element] {

  def iterator: Iterator[Element] = {
    target.asScala.iterator
  }

}
{% endhighlight %}

The code has been upload to github [SSoup](https://github.com/filosganga/ssoup) reporitory. 

Happy coding!
