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
 * @summary Default in-memory store implementation for Pubst.
 *
 * @description
 * <p>
 * InMemoryStore is the default store used by Pubst when no custom store is
 * provided.  It holds topic values in a plain object in memory.
 * </p>
 *
 * <p>
 * This class also serves as the reference interface for custom store
 * implementations.  Any custom store provided to Pubst via the `store`
 * configuration option must implement the same set of async methods:
 *
 *  <ul>
 *    <li>`registerTopic(topicName, initialVal, storeConfig)` - Called when a topic is configured via `addTopic`.</li>
 *    <li>`getValue(topicName)` - Retrieve the current value for a topic.</li>
 *    <li>`setValue(topicName, value)` - Store a new value for a topic.</li>
 *    <li>`clearValue(topicName)` - Clear the value for a topic (set to null).</li>
 *    <li>`getTopicNames()` - Return an array of all registered topic names.</li>
 *  </ul>
 * </p>
 *
 * <p>
 * All methods must return a Promise (or be declared async).
 * </p>
 */
export default class InMemoryStore {

  #store = {};

  /**
   * @summary Register a new topic in the store.
   *
   * @param {string} topicName - The name of the topic to register.
   * @param {*} [initialVal=null] - The initial value for the topic.
   * @param {Object} [storeConfig={}] - Store-specific configuration passed
   *   through from the topic's `storeConfig` option.  InMemoryStore does not
   *   use this value, but custom store implementations may use it for their
   *   own initialization (e.g. persistence keys, TTL settings, etc.).
   *
   * @returns {Promise<Object>} Resolves with an object containing the
   *   `topicName`, `initialVal`, and `storeConfig` that were registered.
   */
  async registerTopic(topicName, initialVal = null, storeConfig = {}) {
    this.#store[topicName] = initialVal;

    return Promise.resolve({
      topicName: topicName,
      initialVal: initialVal,
      storeConfig: storeConfig
    });
  }

  /**
   * @summary Retrieve the current value for a topic.
   *
   * @param {string} topicName - The name of the topic.
   *
   * @returns {Promise<*>} Resolves with the current value, or `undefined`
   *   if the topic has not been registered or set.
   */
  async getValue(topicName) {
    return Promise.resolve(this.#store[topicName]);
  }

  /**
   * @summary Store a new value for a topic.
   *
   * @param {string} topicName - The name of the topic.
   * @param {*} [value=null] - The value to store.
   *
   * @returns {Promise<*>} Resolves with the value that was stored.
   */
  async setValue(topicName, value = null) {
    this.#store[topicName] = value;
    return Promise.resolve(value);
  }

  /**
   * @summary Clear the value for a topic by setting it to null.
   *
   * @param {string} topicName - The name of the topic to clear.
   *
   * @returns {Promise<null>} Resolves with `null`.
   */
  async clearValue(topicName) {
    this.#store[topicName] = null;
    return Promise.resolve(null);
  }

  /**
   * @summary Get the names of all topics that have been registered.
   *
   * @returns {Promise<string[]>} Resolves with an array of topic name strings.
   */
  async getTopicNames() {
    return Promise.resolve(Object.keys(this.#store));
  }
}
