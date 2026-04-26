# Pubst

[![Verify](https://github.com/JasonTypesCodes/pubst/actions/workflows/verify.yml/badge.svg)](https://github.com/JasonTypesCodes/pubst/actions/workflows/verify.yml)

Pubst is a slightly opinionated pub/sub library for JavaScript.

Each Pubst instance acts as a single broker for any number of topics.  Any number of modules sharing a single instance of Pubst can exchange data through it's publish and subscribe mechanisms

Pubst has a few other features worth noting:

  + Subscribers can register a default value to receive in the event that their topic does not have a value set or has a value of `null`.

  + By default, subscribers are primed with the last value published on the topic (or their default).

  + By default, subscribers will not receive subsequent calls when the same value is published to a topic more than once.

  + A subscriber can listen for updates to a given topic, or can provide a matcher function that determines which topics the subscriber should receive updates for.

  + Pubst supports pluggable store implementations for custom persistence strategies.

## Breaking Changes (v0.7.0)

  + **`subscribe` no longer accepts `RegExp` as the first argument.**  Use a matcher function instead.  A matcher function receives a topic name string and should return a truthy value if the subscriber should receive updates for that topic.  If the matcher throws an error, the error is logged as a warning and the match is skipped.

#### Migrating from RegExp to matcher functions

```js
// Before (v0.6.0) - RegExp
pubst.subscribe(/SELECTED\..*/, handler);

// After (v0.7.0) - Wrap the regex in a function
pubst.subscribe(t => /SELECTED\..*/.test(t), handler);

// Or, take advantage of more expressive matching logic:
pubst.subscribe(t => t.startsWith('SELECTED.'), handler);
```

## Breaking Changes (v0.6.0)

  + **The constructor no longer accepts configuration or calls `configure()`.**  The instance is ready to use immediately with default settings.  Call `await configure()` if you need to customize the logger, store, or pre-register topics.

  + **Most methods are now async.**  `configure`, `addTopic`, `addTopics`, `publish`, `currentVal`, `clear`, and `clearAll` now return Promises and can be `await`-ed.

  + **`subscribe` remains synchronous** and continues to return an unsubscribe function immediately.  Priming of subscribers with existing values happens asynchronously in the background.

## Basic Usage

While it isn't necessarily required, it is a good idea to configure your Pubst instance and the topics you will use in a single file and then export the instance so that other modules can consume them.  This keeps your configuration and available topics together.

```js
// pubst-broker.js
import Pubst from 'pubst';

const pubst = new Pubst();

export async function init() {
  await pubst.configure({
    topics: [
      {
        name: 'FAVORITE_COLOR',
        doPrime: false
      }
    ]
  });
}

export { pubst };
```

```js
// File1.js
import { pubst } from './pubst-broker.js';

await pubst.addTopic({
  name: 'NAME',
  default: 'World'
});
```

```js
// File2.js
import { pubst } from './pubst-broker.js';

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
// File3.js
import { pubst } from './pubst-broker.js';

await pubst.publish('NAME', 'Jill');
```

```
Hello Jill!
```

If the topic is cleared, the subscriber is again called with their default value.
```js
await pubst.clear('NAME');
```

```
Hello World!
```

A subscriber is free to override the default value for their topics.

## Browser Usage

Browser-ready bundles are included in the `dist/browser/` directory of the npm package.  Include the script via a `<script>` tag and `window.pubst` will be available as a pre-instantiated Pubst instance.

```html
<script src="pubst-browser-0.7.0.min.js"></script>
<script>
  (async () => {
    await pubst.configure({showWarnings: false});

    pubst.subscribe('my.topic', value => {
      console.log('Received:', value);
    });

    await pubst.publish('my.topic', 'hello');
  })();
</script>
```

**Note:** If you need to customize the instance (e.g. suppress warnings, provide a custom store, or pre-register topics), call `await pubst.configure(...)` before use.  Otherwise, the instance is ready to use immediately.

Both unminified (`pubst-browser-{version}.js`) and minified (`pubst-browser-{version}.min.js`) builds are provided, each with a corresponding source map.

## API

### `async configure(configOptions)`

Sets Pubst configuration.  Must be called after construction.

#### Available options:

  + `showWarnings` (default: true) - Show warnings in the console.
  + `logger` (default: ConsoleLogger) - A custom logger to send warning messages to.  If provided, `showWarnings` is ignored.
  + `store` (default: InMemoryStore) - A custom store implementation for persisting topic values.  See [Custom Stores](#custom-stores) for details.
  + `topics` - An array of topic configurations.

#### Example

```js
const pubst = new Pubst();

await pubst.configure({
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

### `async addTopic(topicConfig)` or `async addTopics(topicConfigArrays)`

Sets the configuration for a new topic.  Registers the topic in the store.

#### Available options:

  + `name` (*REQUIRED*) - A string representing the name of the topic.
  + `default` (default: undefined) - The default value presented to subscribers when the topic is undefined or null.
    + This can be overridden by subscribers.
  + `eventOnly` (default: false) - Set this to `true` if this topic will not have payload data.
  + `doPrime` (default: true) - Should new subscribers automatically receive the last published value on the topic?
    + This can be overridden by subscribers.
  + `allowRepeats` (default: false) - Alert subscribers of all publish events, even if the value is equal (by strict comparison) to the last value sent.
    + This can be overridden by subscribers.
  + `storeConfig` (default: {}) - Store-specific configuration that is passed through to the store's `registerTopic` method.  This allows custom store implementations to receive topic-level configuration.  The InMemoryStore ignores this value.

#### Examples

```js
await pubst.addTopics([
  {
    name: 'game.started',
    default: false,
    doPrime: true
  },
  {
    name: 'player.guess',
    default: -1,
    allowRepeats: true,
    doPrime: false
  },
  {
    name: 'player.won',
    eventOnly: true,
    doPrime: false
  }
]);

await pubst.addTopic({
  name: 'player.name',
  default: 'Player 1'
});
```

### `async publish(topic, payload)`

Publishes a value to a topic.
Topic names are expected to be strings.
Payloads should be treated as immutable.

While `publish` is async, its resolution is not based on all subscribers being called.  It resolves when the value to publish has been safely stored.  For performance reasons, calling subscribers remains an asynchronous action.

#### Examples

```js
await pubst.publish('SELECTED.COLOR', 'blue');
await pubst.publish('current.user', {
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

Registers a subscriber to one or more topics.  This method is synchronous and returns an unsubscribe function immediately.

The first argument may be a string or a matcher function.
If a string is provided, the handler will be called for all updates for that topic.
If a function is provided, it will be called with each topic name and should return a truthy value to indicate the subscriber wishes to receive updates for that topic.  If the matcher function throws an error, the error is logged as a warning and the match is skipped.

The second argument may be a handler function that is called when updates are published to the topic, or a configuration object for the subscription.
The configuration object is necessary if you want to change default configuration options for this subscription.

Available options are:
  + `handler` - (Required) - The handler to call when the topic is updated.
  + `default` - (Default: undefined) - Default value for this sub.
  + `doPrime` - (Default: true) - Should the handler be primed with the last value?
  + `allowRepeats` - (Default: false) - Should the handler be called when the value doesn't change?

The handler will be called on topic updates.
It will be passed the new value of the topic as the first argument, and the name of the topic as the second argument.

**Note:** Priming of subscribers with existing store values happens asynchronously.  The handler will be called after the store read resolves.

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

#### Example 2 - Matcher function for multiple topics

```js
pubst.subscribe(
  t => t.startsWith('SELECTED.'), // Matches all topics starting with 'SELECTED.'
  (payload, topic) => {           // A handler function
    if (topic === 'SELECTED.COLOR') {
      doSomethingWithColor(payload);
    } else if (topic === 'SELECTED.FOOD') {
      doSomethingWithFood(payload);
    }
  },
  'EMPTY'             // Default value
);
```

#### Example 3 - Matcher function using a regex

```js
pubst.subscribe(
  t => /^user\..*\.updated$/.test(t), // Use regex inside a matcher
  (payload, topic) => {
    handleUserUpdate(payload, topic);
  }
);
```

#### Example 4 - Subscription Configuration

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

### `async currentVal(topic[, defaultValue])`

Gets the current value of a topic.
If a defaultValue is provided and the topic is currently `undefined` or `null`, the defaultValue will be returned.

#### Example

```js
  const color = await pubst.currentVal('SELECTED.COLOR', 'red');
```

### `async clear(topic)`

Clears a given topic by publishing a `null` to it.
Subscribers that provided a default value will receive their default.

#### Example

```js
await pubst.clear('SELECTED.COLOR');
```

### `async clearAll()`

Clears all known topics.

#### Example

```js
await pubst.clearAll();
```

## Custom Stores

Pubst uses an in-memory store by default, but you can provide your own store implementation for custom persistence strategies (e.g. localStorage, IndexedDB, a remote API, etc.).

A custom store must implement the following async methods:

| Method                                              | Description                                    |
|-----------------------------------------------------|------------------------------------------------|
| `registerTopic(topicName, initialVal, storeConfig)` | Called when a topic is configured via `addTopic`.  `initialVal` is `null` for new topics.  `storeConfig` is the topic-level store configuration passed through from the topic's `storeConfig` option. |
| `getValue(topicName)`                               | Retrieve the current value for a topic.        |
| `setValue(topicName, value)`                        | Store a new value for a topic.                 |
| `clearValue(topicName)`                             | Clear the value for a topic (set to null).     |
| `getTopicNames()`                                   | Return an array of all registered topic names. |

All methods must return a Promise (or be declared `async`).

The built-in `InMemoryStore` class serves as the reference implementation.
