# Pubst

[![Verify](https://github.com/JasonTypesCodes/pubst/actions/workflows/verify.yml/badge.svg)](https://github.com/JasonTypesCodes/pubst/actions/workflows/verify.yml)

Pubst is a slightly opinionated pub/sub library for JavaScript.

Like many other JavaScript pub/sub libraries, Pubst acts as a single central broker for any number of topics.
You can publish to a topic in one component/class/module and any other component/class/module that has subscribed to that topic will receive a call with the updated payload.

Pubst has a few other features worth noting:

  + Subscribers can register a default value to receive in the event that their topic does not have a value set or has a value of `null`.

  + By default, subscribers are primed with the last value published on the topic (or their default).

  + By default, subscribers will not receive subsequent calls when the same value is published to a topic more than once.

  + A subscriber can listen for updates to a given topic, or can provide a regular expression that matches the strings of all topics they would like to receive updates for.

## Basic Usage

While it isn't necessarily required, it is a good idea to configure the topics you are going to use.

```js
// File1.js
const pubst = require('pubst');

pubst.addTopic({
  name: 'NAME',
  default: 'World'
});
```

```js
// File2.js
const pubst = require('pubst');

pubst.subscribe('NAME', name => {
  console.log(`Hello ${name}!`);
});

```
Because the topic has a default value of 'World' and the topic is currently empty, the subscriber is primed with the default value.
```
Hello World!
```
When another module publishes 'Jill' on the 'NAME' topic, the subscriber is called with the new value.


```js
// File2.js
const pubst = require('pubst');

pubst.publish('NAME', 'Jill');
```

```
Hello Jill!
```

If the topic is cleared, the subscriber is again called with their default value.
```js
pubst.clear('NAME');
```

```
Hello World!
```

A subscriber is free to override the default value for their topics.

## API

### `configure(configOptions)`

Sets global Pubst configuration.

#### Available options:

  + `showWarnings` (default: true) - Show warnings in the console.
  + `topics` - An array of topic configurations.

#### Example

```js
pubst.configure({
  showWarnings: false,
  topics: [
    {
      name: 'user.basicInfo',
      default: {
        lastName: 'No User Logged In',
        firstName: 'No User Logged In'
      }
    }
  ]
});
```

### `addTopic(topicConfig)` or `addTopics(topicConfigArrays)`

Sets the configuration for a new topic.

#### Available options:

  + `name` (*REQUIRED*) - A string representing the name of the topic.
  + `default` (default: undefined) - The default value presented to subscribers when the topic is undefined or null.
    + This can be overridden by subscribers.
  + `eventOnly` (default: false) - Set this to `true` if this topic will not have payload data.
  + `doPrime` (default: true) - Should new subscribers automatically receive the last published value on the topic?
    + This can be overridden by subscribers.
  + `allowRepeats` (default: false) - Alert subscribers of all publish events, even if the value is equal (by strict comparison) to the last value sent.
    + This can be overridden by subscribers.
  + `validator` - A validation function to assert that published values are valid before they are sent to subscribers.

#### Examples

```js
pubst.addTopics([
  {
    name: 'game.started',
    default: false,
    doPrime: true,
    validator: payload => {
      const valid = typeof payload === 'boolean';
      if (!valid) {
        return {
          valid,
          messages: [
            'Value must be a boolean'
          ]
        };
      }

      return {
        valid
      };
    }
  },
  {
    name: 'player.guess',
    default: -1,
    allowRepeats: true,
    doPrime: false,
    validator: payload => ({
      valid: typeof payload === 'number'
    })
  },
  {
    name: 'player.won',
    eventOnly: true,
    doPrime: false
  }
]);

pubst.addTopic({
  name: 'player.name',
  default: 'Player 1'
});
```

### `publish(topic, payload)`

Publishes a value to a topic.
Topic names are expected to be strings.
Payloads should be treated as immutable.

#### Examples

```js
pubst.publish('SELECTED.COLOR', 'blue');
pubst.publish('current.user', {
  name: 'Some User',
  permissions: [
    'BORING.THINGS.VIEWER'
  ]
});
```
**NOTE:** Mutating payloads received by a subscriber is a really bad idea.
You may be changing data that other portions of your application are using.
This is likely to result in terrible bugs that are difficult to find.

### `subscribe(topic, handler|subscriptionConfig[, defaultValue])`

Registers a subscriber to one or more topics

The first argument may be a string or a regular expression.
If a string is provided, the handler will be called for all updates for that topic.
If a regular expression is provided, the handler will be called for all topics that match the regular expression.

The second argument may be a handler function that is called when updates are published to the topic, or a configuration object for the subscription.
The configuration object is necessary if you want to change default configuration options for this subscription.

Available options are:
  + `handler` - (Required) - The handler to call when the topic is updated.
  + `default` - (Default: undefined) - Default value for this sub.
  + `doPrime` - (Default: true) - Should the handler be primed with the last value?
  + `allowRepeats` - (Default: false) - Should the handler be called when the value doesn't change?

The handler will be called on topic updates.
It will be passed the new value of the topic as the first argument, and the name of the topic as the second argument.

#### Example 1 - Basic usage

```js
pubst.subscribe(
  'SELECTED.COLOR', // The topic you are subscribing to
  color => {        // A handler function
    doSomethingWithColor(color);
  },
  'red'             // Default value
);
```

#### Example 2 - Multiple topics

```js
pubst.subscribe(
  /SELECTED.*/, // This matches all strings that start with 'SELECTED'
  (payload, topic) => {        // A handler function
    if (topic === 'SELECTED.COLOR') {
      doSomethingWithColor(payload);
    } else if (topic === 'SELECTED.FOOD') {
      doSomethingWithFood(payload);
    }
  },
  'EMPTY'             // Default value
);
```

#### Example 3 - Subscription Configuration

```js
pubst.subscribe(
  'SELECTED.COLOR', // The topic you are subscribing to
  {
    // The handler
    handler: color => (doSomethingWithColor(color)),
    // Default value
    default: 'red',
    // Do not prime the handler with the last value on subscribe
    doPrime: false,
    // Call the handler even when published value did not change
    allowRepeats: true
  }
);
```

### `currentVal(topic[, defaultValue])`

Gets the current value of a topic.
If a defaultValue is provided and the topic is currently `undefined` or `null`, the defaultValue will be returned.

#### Example

```js
  const color = pubst.currentVal('SELECTED.COLOR', 'red');
```

### `clear(topic)`

Clears a given topic by publishing a `null` to it.
Subscribers that provided a default value will receive their default.

#### Example

```js
pubst.clear('SELECTED.COLOR');
```

### `clearAll()`

Clears all known topics.

#### Example

```js
pubst.clearAll();
```

## Future Plans

In the not-so-far future I would like to:

  1. Add hooks for persistence strategies.
  2. Experiment with creating a React library that makes linking topics with props mostly painless.
