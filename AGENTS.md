# AGENTS.md – Pubst

Pubst is a slightly opinionated pub/sub library for JavaScript, written in TypeScript.  ESM module, Apache 2.0 licensed.  Node 22.  Source is compiled: `dist/` holds the published JavaScript, declarations and source maps, and is what `main`/`exports` point at.

## Key Commands

- `npm run verify` — Lint + typecheck + test.  This is the CI validation command.  Run this to confirm changes are correct.
- `npm run lint` — ESLint only (`eslint .`), covering `src/`, `scripts/` and the config itself.
- `npm run typecheck` — `tsc -p tsconfig.json`.  Type-checks everything **including tests**, emits nothing.
- `npm test` — Mocha test suite (`mocha`; config lives in `.mocharc.json`).  Tests run through the `tsx` loader, which strips types but does **not** check them — that is `typecheck`'s job.
- `npm run build` — Compile to `dist/` (`tsc -p tsconfig.build.json`).  Emits JS, `.d.ts` and source maps.
- `npm run build-docs` — Generate TypeDoc HTML (`typedoc`).  Output goes to `dist/doc/`, which is gitignored and excluded from the published package.
- `npm run build-browser` — Build browser IIFE bundles via esbuild (`node scripts/build-browser.js`).  Output goes to `dist/browser/`.
- `npm run prepare` — Clean + build + build-browser + build-docs.  Runs automatically on `npm install` and `npm ci`.

## Code Style & Conventions

### Always

- 2-space indentation, LF line endings, UTF-8.
- Source files are TypeScript (`.ts`).  There is no JavaScript in `src/`.
- Relative imports use the **`.js`** extension even though the file on disk is `.ts` (`import { isSet } from './util/utils.js'`).  This is what `moduleResolution: nodenext` requires: the specifier names the emitted file.  `tsx` and esbuild both understand it.
- All source files must include the Apache 2.0 license header:
  ```
  /*
   *  Copyright 2017-2026 Jason Schindler
   *
   *  Licensed under the Apache License, Version 2.0 (the "License");
   *  you may not use this file except in compliance with the License.
   *  You may obtain a copy of the License at
   *
   *    http://www.apache.org/licenses/LICENSE-2.0
   *
   *  Unless required by applicable law or agreed to in writing, software
   *  distributed under the License is distributed on an "AS IS" BASIS,
   *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   *  See the License for the specific language governing permissions and
   *  limitations under the License.
   */
  ```
- Classes are declared separately from their `export default` statement.  Write `class Foo {}` then `export default Foo;` — not `export default class Foo {}`.  This originally existed so jsdoc would recognize them; TypeDoc does not need it, but it remains the house style.
- All classes and public methods must have `/** */` doc comments.  Do **not** repeat types in them — no `@param {string}`, no `@returns {Promise<void>}`.  TypeDoc reads types from the signature and warns about duplicates.  Use `@param name - description` and prose.
- Test files are co-located with their source: `Foo.ts` has `Foo.test.ts` in the same directory.
- Tests use Mocha + Chai (expect style) + Sinon + sinon-chai.
- All new code must include appropriate unit tests.
- No new linting errors may be introduced.  Run `npm run lint` to check.
- ESLint config composes `@eslint/js` recommended with `typescript-eslint` recommended.  Keep additions minimal and justified; put them in `eslint.config.mjs`.
- New dependencies must be pinned to an exact version — no `^` or `~` range syntax.  `.npmrc` sets `save-exact = true`, so a plain `npm install` already pins.
- `typescript` is pinned to **6.0.3** deliberately.  Do not bump it to 7.x: TypeScript 7 is the native port and ships no JS compiler API, so `typescript-eslint` and `typedoc` cannot work against it yet.

### Never

- Do not modify files in `dist/` — they are generated and gitignored.
- Do not commit `node_modules/` or `dist/`.
- Do not use `require()` or CommonJS syntax — this is an ESM-only project (`"type": "module"` in `package.json`).
- Do not use TypeScript syntax that cannot be erased — no `enum`, no `namespace`, no parameter properties, no decorators.  `erasableSyntaxOnly` enforces this so the sources stay runnable by any type-stripping loader.
- Do not add `@types/node`.  The library is environment-agnostic; `lib: ["ES2022", "DOM"]` supplies `setTimeout`, `console` and `window`, and `@types/node` would wrongly type `setTimeout`'s return as `NodeJS.Timeout`.

## Architecture

- **Entry point:** `src/Pubst.ts` — the core pub/sub class.  It also re-exports the public types, so `import type { Store } from 'pubst'` works off the package root.
- **`src/types.ts`** — The shared public type surface: `Store`, `Logger`, `Handler`, `TopicMatcher`, `Unsubscribe`, `RegisteredTopic`, `PubstConfig`, `TopicConfig`, `SubscriptionConfig`.  These are the contracts; keep them here rather than scattering them across implementation files.
- **`src/store/`** — Pluggable store.  `InMemoryStore` is the default and the reference implementation of the `Store` interface.  `src/store/index.ts` is the barrel behind the `pubst/store` subpath export.
- **`src/logger/`** — Pluggable logger.  `ConsoleLogger` (default) and `SilentLogger`, both implementing `Logger`.  `src/logger/index.ts` backs the `pubst/logger` subpath export.
- **`src/util/utils.ts`** — Internal utility functions.  The `isSet`/`isNotSet`/`isDefined`/`isUndefined` helpers are type predicates.
- The `Store` and `Logger` contracts are **structural**.  A duck-typed object still works; `implements` is available but not required.  Do not convert them to abstract base classes.
- The constructor does not call `configure()` — the instance is ready to use immediately with default settings.  Consumers call `await pubst.configure(...)` only if they need to customize the logger, store, or pre-register topics.
- `subscribe` is the only synchronous public method.  All others (`configure`, `addTopic`, `addTopics`, `publish`, `currentVal`, `clear`, `clearAll`) are async.

## Testing Patterns

- Sinon fake timers are used to control `setTimeout(0)` delivery.  Subscriber callbacks are scheduled via `setTimeout(0)` and require `clock.tick(1)` to fire in tests.  The `tsx` loader does not interfere with fake timers.
- `subscribe` is synchronous but priming reads from the async store.  Tests must call `await flushPromises()` before `clock.tick(1)` when asserting on subscriber priming behavior.  The `flushPromises` helper is defined at the top of `Pubst.test.ts`.
- When testing with custom loggers or stores, create stub objects with `sinon.spy()` methods rather than importing the real implementations.  Type the stubs against `Store` / `Logger` — the shared `createStubStore()` helper in `Pubst.test.ts` does this, and it doubles as the proof that the interfaces stay duck-type friendly.
- A few cases deliberately exercise calls that TypeScript rejects (missing arguments, an invalid handler, a topic config with no `name`).  Route those through an explicit cast with a comment rather than loosening the production types.

## CI

- GitHub Actions workflow: `.github/workflows/verify.yml`
- Runs on every push: `npm ci` → `npm run verify`.  `npm ci` triggers `prepare`, so the full build is already covered; do not re-add a separate `npm run prepare` step.
- Node 22 on ubuntu-latest
