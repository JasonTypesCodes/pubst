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

/**
 * Type-level tests.
 *
 * These assert things the runtime suite cannot: that the public types reject
 * what they should reject.  `npm run typecheck` fails if any
 * `@ts-expect-error` below stops being an error, so this file is the
 * regression guard for the type surface itself.
 *
 * Nothing here executes; it is excluded from the build and from Mocha.
 */

import Pubst from './Pubst.js';
import type { Handler, Logger, RegisteredTopic, Store, Unsubscribe } from './Pubst.js';

const pubst = new Pubst();

/* --- Store contract ------------------------------------------------- */

class CompleteStore implements Store {
  async registerTopic(
    topicName: string,
    initialVal: unknown = null,
    storeConfig: Record<string, unknown> = {},
  ): Promise<RegisteredTopic> {
    return {topicName, initialVal, storeConfig};
  }
  async getValue(): Promise<unknown> { return null; }
  async setValue(_topicName: string, value: unknown = null): Promise<unknown> { return value; }
  async clearValue(): Promise<unknown> { return null; }
  async getTopicNames(): Promise<string[]> { return []; }
}

// A store missing clearValue is rejected.
// @ts-expect-error - 'clearValue' is missing
class MissingClearValue implements Store {
  async registerTopic(topicName: string): Promise<RegisteredTopic> {
    return {topicName, initialVal: null, storeConfig: {}};
  }
  async getValue(): Promise<unknown> { return null; }
  async setValue(): Promise<unknown> { return null; }
  async getTopicNames(): Promise<string[]> { return []; }
}

// A duck-typed store object still satisfies the contract.
const duckStore: Store = {
  registerTopic: async (topicName) => ({topicName, initialVal: null, storeConfig: {}}),
  getValue: async () => null,
  setValue: async (_t, v) => v,
  clearValue: async () => null,
  getTopicNames: async () => [],
};

/* --- Logger contract ------------------------------------------------ */

const duckLogger: Logger = { warn: () => {} };

// A logger whose warn takes the wrong argument types is rejected.
// @ts-expect-error - warn(source: number) is not assignable
const badLogger: Logger = { warn: (_source: number, _message: string) => {} };

/* --- Generic escape hatches ----------------------------------------- */

// subscribe<string> narrows the handler's value.
const typedUnsub: Unsubscribe = pubst.subscribe<string>('t', value => value.toUpperCase());

// A handler for the wrong value type is rejected.
// @ts-expect-error - (n: number) => void is not a Handler<string>
pubst.subscribe<string>('t', (n: number) => n);

// The object form is narrowed the same way.
// @ts-expect-error - handler must accept a string
pubst.subscribe<string>('t', {handler: (n: number) => n});

// currentVal<T> resolves to T | undefined, not T.
const maybe: Promise<string | undefined> = pubst.currentVal<string>('t');

// @ts-expect-error - the result may be undefined
const definitely: Promise<string> = pubst.currentVal<string>('t');

/* --- Config objects -------------------------------------------------- */

// A topic config with no name is rejected.
// @ts-expect-error - 'name' is required
await pubst.addTopic({default: 1});

// An unknown topic option is rejected.
// @ts-expect-error - 'notAnOption' does not exist on TopicConfig
await pubst.addTopic({name: 't', notAnOption: true});

/* --- Callback aliases ------------------------------------------------ */

const handler: Handler<number> = (value, topic) => { void value.toFixed(2); void topic.length; };

// A matcher may return any truthy value, not just boolean.
pubst.subscribe(t => t.startsWith('a'), handler);
pubst.subscribe(t => t.length, handler);
pubst.subscribe(t => (t ? {} : null), handler);

export type {};
export {
  CompleteStore, MissingClearValue, duckStore, duckLogger, badLogger,
  typedUnsub, maybe, definitely, handler,
};
