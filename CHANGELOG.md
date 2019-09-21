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
