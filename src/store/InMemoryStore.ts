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

import type { RegisteredTopic, Store } from '../types.js';

/**
 * Default store implementation.  Holds topic values in memory.
 *
 * This is also the reference implementation of {@link Store} — a custom
 * store only has to match the same shape.
 */
class InMemoryStore implements Store {

  #store = new Map<string, unknown>();

  /**
   * Register a new topic in the store.
   *
   * @param topicName - The name of the topic to register.
   * @param initialVal - The initial value for the topic.
   * @param storeConfig - Store-specific configuration, passed through from
   *   the topic's `storeConfig` option.  InMemoryStore does not use it, but
   *   custom stores may (persistence keys, TTL settings, and so on).
   */
  async registerTopic(
    topicName: string,
    initialVal: unknown = null,
    storeConfig: Record<string, unknown> = {},
  ): Promise<RegisteredTopic> {
    this.#store.set(topicName, initialVal);

    return Promise.resolve({
      topicName: topicName,
      initialVal: initialVal,
      storeConfig: storeConfig
    });
  }

  /**
   * Retrieve the current value for a topic.
   *
   * Resolves with `undefined` if the topic has not been registered or set.
   */
  async getValue(topicName: string): Promise<unknown> {
    return Promise.resolve(this.#store.get(topicName));
  }

  /**
   * Store a new value for a topic.  Resolves with the value that was stored.
   */
  async setValue(topicName: string, value: unknown = null): Promise<unknown> {
    this.#store.set(topicName, value);
    return Promise.resolve(value);
  }

  /**
   * Clear the value for a topic by setting it to `null`.
   */
  async clearValue(topicName: string): Promise<null> {
    this.#store.set(topicName, null);
    return Promise.resolve(null);
  }

  /**
   * Get the names of all topics that have been registered.
   */
  async getTopicNames(): Promise<string[]> {
    return Promise.resolve([...this.#store.keys()]);
  }
}

export default InMemoryStore;
