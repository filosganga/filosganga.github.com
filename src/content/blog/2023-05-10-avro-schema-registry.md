---
title: "Harnessing the power of Avro and the Schema Registry"
date: 2023-05-10
tags: ["kafka", "avro", "schema-registry", "data"]
excerpt: "Why Avro is worth the extra moving parts on Kafka, what the five bytes in front of every message are for, and how the serializer and the schema registry keep incompatible data off your topics."
canonicalUrl: "https://medium.com/@filippodeluca/harnessing-the-power-of-avro-and-the-schema-registry-for-seamless-data-integration-4158403c7b49"
---

> Originally published on [Medium](https://medium.com/@filippodeluca/harnessing-the-power-of-avro-and-the-schema-registry-for-seamless-data-integration-4158403c7b49).

When embarking on the journey of incorporating Kafka into your distributed architecture,
one crucial decision is to choose a shared format among options like JSON, Protobuf,
String, or Avro.

Each format has its advantages and disadvantages. JSON is widely recognised and
supported, which makes it a popular choice. Avro stands out for its schema evolution
capability, enabling independent evolution of producer and consumer schemas within
specified compatibility rules. Protobuf offers great flexibility, although it requires
manual evolution of codecs.

Selecting the appropriate format involves weighing familiarity, schema evolution needs,
and flexibility against your specific requirements.

## The Avro format

Avro is a data serialization system developed by the Apache Software Foundation. It
provides a compact and efficient way to serialize structured data for storage or
transmission. It also supports schema evolution, meaning you can read data written with a
newer schema version using an older one.

Avro payloads can be encoded in either JSON or binary, but binary encoding is by far the
more common. So when people talk about reading Avro, they typically mean reading
binary-encoded Avro.

Unlike JSON, which is schema-free and self-descriptive, **in Avro you need the schema in
order to read the payload at all**. That single fact drives everything that follows.

## Schema compatibility

Compatibility between two schemas falls into one of these categories:

- **Forward compatibility** — a payload written with a new schema can be read using an
  older schema.
- **Backward compatibility** — a payload written with an older schema can be read using a
  newer schema.
- **Full compatibility** — both of the above hold.

To read an Avro payload correctly you need *two* schemas: the one the payload was written
with, and the stable schema the reader expects. The Avro SDK uses both — it reads the
payload with the writer schema and adapts it to the reader schema. That's what lets a
consumer keep a consistent view of the data while schemas evolve underneath it.

## The Kafka–Avro format

A Kafka message consists of a key, a value, and a set of headers. The Avro serializer can
encode the key, the value, or both.

Since reading a payload requires knowing the schema it was written with, the Avro Kafka
serializer uses a specific wire format with **five bytes of padding** in front of the
payload:

- The first byte — the *magic byte* — is always `0`. It marks the message as Avro
  encoded, which is useful when a topic carries messages in more than one format (though
  mixing formats on a topic is generally not a good idea).
- The next four bytes hold the **schema ID** obtained from the schema registry.
- The remainder is the actual content, in Avro binary encoding.

This way an Avro-encoded message can be identified and decoded while carrying just enough
schema information to do it.

## The schema registry

The schema registry, a component of the Confluent platform, manages and preserves Avro
schemas and enforces the required compatibility level as they evolve.

It introduces three concepts:

- **Schema** — the Avro schema itself, defining structure and types.
- **Subject** — the owner of a schema. In Kafka terms, it maps to either the key or the
  value part of a topic's messages.
- **Subject version** — each version captures the evolution of a subject over time, and
  may be associated with a different schema.

Note that **the relationship between a topic and its schemas exists only at the client
level**. By convention the (de)serializer associates the value and key of a topic with a
subject: the value of topic `foo` maps to subject `foo-value`.

Whenever a subject is associated with a new schema its version is incremented, and the
registry checks the new version against the previous one according to the compatibility
level configured for that subject.

## The schema dance

Putting it together — here's how serializer, deserializer and registry interact.

When a producer creates a message, the Avro serializer:

1. Attempts to register the schema against the subject.
2. Receives a new schema ID if the schema is compatible with the previous one; otherwise
   it errors out.
3. Encodes the payload with that schema ID, as described above.

This happens only the first time the serializer meets a given schema — afterwards it uses
the cached schema ID.

When a consumer receives an Avro-encoded message, the deserializer:

1. Extracts the schema ID from the payload.
2. Fetches the corresponding schema from the registry.
3. Decodes the payload using the local reader schema together with the downloaded writer
   schema.

Two guarantees fall out of this:

- **It is impossible to write a message to Kafka with an incompatible schema.**
- **Data on a topic is always associated with a schema.**

## In closing

Choosing the right data format for a Kafka-based architecture matters. Avro's schema
evolution lets producer and consumer schemas move independently while staying within
compatibility rules, so the system can grow without breaking the data contract.

The schema registry is what makes that work in practice: it handles availability,
versioning and compatibility control, and the serializer and deserializer lean on it to
encode and decode transparently. Together they mean you can exchange data across topics
knowing compatibility is enforced and every payload can still be read.
