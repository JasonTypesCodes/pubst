# AGENTS.md – Pubst

Pubst is a slightly opinionated pub/sub library for JavaScript.  ESM module, Apache 2.0 licensed.  Node 22, no build step for source — just lint, test, and jsdoc generation.

## Key Commands

- `npm run verify` — Lint + test.  This is the CI validation command.  Run this to confirm changes are correct.
- `npm run lint` — ESLint only (`eslint ./src`).
- `npm test` — Mocha test suite (`mocha src/**/*.test.js src/*.test.js`).
- `npm run build-docs` — Generate jsdoc HTML (`jsdoc ./src -r -d ./dist/doc`).  Output goes to `dist/doc/`, which is gitignored.
- `npm run build-browser` — Build browser IIFE bundles via esbuild (`node scripts/build-browser.js`).  Output goes to `dist/browser/`.
- `npm run prepare` — Clean + build-docs + build-browser.  Runs automatically on `npm install`.

## Code Style & Conventions

### Always

- 2-space indentation, LF line endings, UTF-8.
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
- Classes must be declared separately from their `export default` statement.  Write `class Foo {}` then `export default Foo;` — not `export default class Foo {}`.  This is required for jsdoc to recognize them as classes.
- All classes and public methods must have JSDoc `/** */` comments.  jsdoc ignores undocumented code entirely.
- Test files are co-located with their source: `Foo.js` has `Foo.test.js` in the same directory.
- Tests use Mocha + Chai (expect style) + Sinon + sinon-chai.
- All new code must include appropriate unit tests.
- No new linting errors may be introduced.  Run `npm run lint` to check.
- ESLint config extends `eslint:recommended` — no additional plugins or custom rules beyond what is in `eslint.config.mjs`.
- New dependencies must be pinned to an exact version — no `^` or `~` range syntax.  Use `npm install --save-exact` when adding packages.

### Never

- Do not modify files in `dist/` — they are generated and gitignored.
- Do not commit `node_modules/` or `dist/`.
- Do not use `require()` or CommonJS syntax — this is an ESM-only project (`"type": "module"` in `package.json`).

## Architecture

- **Entry point:** `src/Pubst.js` — the core pub/sub class.
- **`src/store/`** — Pluggable store interface.  `InMemoryStore` is the default and serves as the reference implementation.  Custom stores must implement these async methods: `registerTopic`, `getValue`, `setValue`, `clearValue`, `getTopicNames`.
- **`src/logger/`** — Pluggable logger interface.  `ConsoleLogger` (default) and `SilentLogger`.  Custom loggers must implement `warn(source, message)`.
- **`src/util/utils.js`** — Internal utility functions.
- The constructor does not call `configure()` — the instance is ready to use immediately with default settings.  Consumers call `await pubst.configure(...)` only if they need to customize the logger, store, or pre-register topics.
- `subscribe` is the only synchronous public method.  All others (`configure`, `addTopic`, `addTopics`, `publish`, `currentVal`, `clear`, `clearAll`) are async.

## Testing Patterns

- Sinon fake timers are used to control `setTimeout(0)` delivery.  Subscriber callbacks are scheduled via `setTimeout(0)` and require `clock.tick(1)` to fire in tests.
- `subscribe` is synchronous but priming reads from the async store.  Tests must call `await flushPromises()` before `clock.tick(1)` when asserting on subscriber priming behavior.  The `flushPromises` helper is defined at the top of `Pubst.test.js`.
- When testing with custom loggers or stores, create stub objects with `sinon.spy()` methods rather than importing the real implementations.

## CI

- GitHub Actions workflow: `.github/workflows/verify.yml`
- Runs on every push: `npm ci` → `npm run verify` → `npm run prepare`
- Node 22 on ubuntu-latest
