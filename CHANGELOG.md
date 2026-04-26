## v0.6.0 - Apr 26 2026

### Breaking Changes

  + The constructor no longer accepts configuration or calls `configure()`.  Consumers must now create a Pubst instance and then `await configure()` separately.
  + `configure`, `addTopic`, `addTopics`, `publish`, `currentVal`, `clear`, and `clearAll` are now async and return Promises.
  + `subscribe` remains synchronous.  Priming of subscribers with existing values now happens asynchronously.
  + Removed the `validator` topic configuration option.

### New Features

  + **Pluggable store support.**  Pubst now delegates value storage to a configurable store implementation.  A custom store can be provided via the `store` option in `configure()`.  The built-in `InMemoryStore` is used by default.
  + **`storeConfig` topic option.**  Topic configurations now accept a `storeConfig` property that is passed through to the store's `registerTopic` method, allowing custom stores to receive topic-level configuration.
  + **`showWarnings` configuration option re-added.**  Setting `showWarnings: false` in `configure()` suppresses console warnings without requiring a custom logger.

### Other Changes

  + Extracted logging behavior to `ConsoleLogger` and `SilentLogger` classes, with support for custom logger implementations via the `logger` configuration option.
  + Logger interface updated to accept a source identifier (e.g. `'Pubst.publish'`) alongside the message.
  + Added Apache 2.0 license headers to all source files.
  + Dependency updates.

## v0.5.3 - Apr 11 2026
  + Fixes bug where not all usages of warn had been updated to use the private method
  + Dependency updates.

## v0.5.2 - Mar 03 2026
  + Minor refactoring -- moves utilities to separate file
  + Dependency updates.

## v0.5.0 - Jan 29 2026
  + Converted project to ESM module.  This is a **BREAKING** change.

## v0.4.2 - Sep 20 2019
  + Dependency updates.
  + Fixes new linting errors.
  + New repository url.

## v0.4.1 - Dec 10 2018
  + Dependency updates to address https://github.com/dominictarr/event-stream/issues/116

## v0.4.0 - Sep 21 2018
  + Adds `validator` option to topic configuration.

## v0.3.0 - Sep 11 2018
  + Adds topic configuration

## v0.2.1 - Apr 27 2018
  + Adds documentation

## v0.2.0 - Mar 08 2018
  + Adds `doPrime` subscription configuration option
  + Adds `allowRepeats` subscription configuration option

## v0.1.1 - Feb 20 2018
  + Adds support for creating a subscription with a config object

## v0.1.0 - Feb 14 2018
  + Adds RegExp support to subscriptions

## v0.0.9 - Jan 30 2018
  + Added `configure` method
  + Added `showWarnings` configuration setting to disable warnings from printing to console

## v0.0.8 - Jan 17 2018
  + Added `clear` method
  + Added `clearAll` method

## v0.0.7 - Jan 16 2018
  + Nothing of consequence

## v0.0.6 - Jan 04 2018
  + Adds support for AMD modules and browser globals.  Based on `returnExports.js` from [UMD](https://github.com/umdjs/umd).

## v0.0.5 - Jan 04 2018
  + Adds basic console message when publishing to a topic that has no matching subscribers.  I will likely make this configurable later.

## v0.0.4 - Jan 02 2018
  + Fixes race condition that caused subscribers to be called with topic value at time of subscriber call instead of published value.
