
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
