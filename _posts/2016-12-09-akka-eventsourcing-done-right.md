---
layout: post
title :  Akka event sourcing done right
category : programming
tags : [Scala, Akka, Event Sourcing]
---
{% include JB/setup %}
At the end of the past summer, I have been captured by a very interesting discussion about `Commands` and `Events` between Viktor Klang and Martin Thompson:

{% include 2016-12-09-akka-eventsourcing-done-well-files/mjpt77-tweet.html %}

This is an interesting point of view, there is no distinction between an Event and a Command, for the application point of view they are external stimuli. The Command captures the user intention to modify the application status.

I have been reasoning how the Akka persistence application are usually designed. The persistent actor flow looks
like this usually:

1. A Command is Received by the Actor
2. The Command is translated in an Event based on the Actor status.
3. The Event is persisted
4. The Actor status is modified in response to the event

This flow has a major drawback in the 2nd step. If the logic of translating this Command (or the Stimolus) is bugged the original intention is lost. 

An example of this pattern is:

{% highlight scala %}
case class Person(name: String, birthday: LocalDate)

object PersonActor {
  case class RenamePerson(name: String)
  case class PersonUpdated(person: Person)
}

class PersonActor extends PersistentActor {
  import PersonActor._

  override def persistenceId: String = "person-${self.path}"

  private var person: Person = Person("noOne", LocalDate.now())

  override def receiveCommand: Receive = {
    case RenamePerson(newName) =>

      if(newName != person.name) {
        persist(PersonUpdated(person.copy(name = newName))) { evt =>
          person = evt.person
          sender ! akka.Done
        }
      } else {
        sender ! akka.Done
      }
  }

  override def receiveRecover: Receive = {
    case PersonUpdated(newPerson) =>
      person = newPerson
  }

}

{% endhighlight %}

This example is extremely simple. But if the check `newName != person.name` is bugged, we will lose some events, without any way to recover them
that makes the usage of the CQRS patter pointless.

In the application I am working at the moment, a persistent Actor is responding to some external events received
from a bunch of Kafka topics. These events are transformed into local events before persisting them. This transformation, that depends on the current Actor status, contains a lot of business rules that can change in the future. A bug in this logic makes the whole event sourcein architecture pointless.

I think that a much better model is to apply this logic after the event has been persisted:

1. A Command is Received by the Actor
2. The Command is persisted
3. The Command is applied to the Actor status, that is modified.

{% highlight scala %}
object BetterPersonActor {
  case class RenamePerson(name: String)
}

class BetterPersonActor extends PersistentActor {
  import BetterPersonActor._

  override def persistenceId: String = "person-${self.path}"

  private var person: Person = Person("noOne", LocalDate.now())

  override def receiveCommand: Receive = {
    case evt:  RenamePerson =>
      persist(evt){ _ =>
        handleRenamePerson(evt)
        sender() ! akka.Done
      }
  }

  override def receiveRecover: Receive = {
    case evt:  RenamePerson => handleRenamePerson(evt)
  }

  private def handleRenamePerson(evt: RenamePerson): Unit = {
    if(person.name != evt.name) {
      person = person.copy(name = evt.name)
    }
  }
}
{% endhighlight %}

What I am proposing is to drop the 2nd step completely and treat the external Command as an Event, storing it in the Journal. In this case, even if we have a bug in the code that applies the command to the status, we can fix it and, it will be applied retroactively. I have also find that storing the Command in the journal surprisely, at least for me, make the schema evolution easier as the commands are usually more concise and don't contain stale data. 

I am very keen to know what are the community thoughts about this approach.