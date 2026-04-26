import {
  hasOwnProperty,
  isDefined,
  isSet,
  valueOrDefault
} from "./util/utils.js";

import ConsoleLogger from "./logger/ConsoleLogger.js";
import SilentLogger from "./logger/SilentLogger.js";
import InMemoryStore from "./store/InMemoryStore.js";

/**
 *  Pubst - A slightly opinionated pub/sub library for JavaScript.
 *
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
 *
 * @file Pubst.js
 * @author Jason Schindler
 * @copyright Jason Schindler 2017-2026
 * @description A slightly opinionated pub/sub library for JavaScript.
 */

const DEFAULT_TOPIC_CONFIG = {
  name: '',
  default: undefined,
  eventOnly: false,
  doPrime: true,
  allowRepeats: false,
  storeConfig: {}
};

const ALLOWED_SUB_PROPS = [
  'topic',
  'handler',
  'default',
  'doPrime',
  'allowRepeats'
];

function buildConfig(base, extensions) {
  const result = {};

  for (const key in base) {
    result[key] = base[key];
  }

  for (const key in extensions) {
    if (hasOwnProperty(result, key)) {
      result[key] = extensions[key];
    }
  }

  return result;
}

/**
 * @summary A slightly opinionated pub/sub utility for Javascript
 */
class Pubst {

  #logger = new ConsoleLogger();

  #store = new InMemoryStore();
  #stringSubs = {};
  #fnSubs = [];
  #topics = {};

  /**
   * @summary Creates a new Pubst instance.
   *
   * @description
   * <p>
   * Creates a new Pubst instance.  After creation, call `await configure()`
   * to set up the instance with your desired configuration.
   * </p>
   *
   * @example
   * const pubst = new Pubst();
   * await pubst.configure({ showWarnings: false });
   */
  constructor() {
  }

  /**
   * @summary Set Pubst configuration.
   *
   * @param {Object} config - Your configuration
   *
   * @returns {Promise<void>}
   *
   * @description
   * <p>
   * Available options are:
   *  <ul>
   *    <li>`logger` (default: ConsoleLogger) - Logger to send warning messages to.</li>
   *    <li>`showWarnings` - If logger isn't provided, this option switches between the use of ConsoleLogger and SilentLogger</li>
   *    <li>`store` (default: InMemoryStore) - A store implementation for persisting topic values.
   *        Custom stores must implement the same async interface as InMemoryStore:
   *        `registerTopic`, `getValue`, `setValue`, `clearValue`, and `getTopicNames`.</li>
   *    <li>`topics` - An array of topic configurations. (See: `addTopic` for topic configuration options)</li>
   *  </ul>
   * </p>
   */
  async configure(userConfig = {}) {
    if (userConfig.logger) {
      this.#logger = userConfig.logger
    } else if (hasOwnProperty(userConfig, 'showWarnings') && !userConfig.showWarnings) {
      this.#logger = new SilentLogger();
    }

    if (userConfig.store) {
      this.#store = userConfig.store;
    }

    if (Array.isArray(userConfig.topics)) {
      await this.addTopics(userConfig.topics);
    }
  }

  /**
   * @summary Configure a new topic.
   *
   * @param {Object} newTopicConfig - Topic configuration
   *
   * @returns {Promise<Object>} Resolves with the result of registering
   *   the topic in the store.
   *
   * @description
   * <p>
   * Allows you to configure a new topic in pubst.
   *
   * Available options are:
   *  <ul>
   *    <li>`name` (<strong>REQUIRED</strong>) - A string representing the name of the topic.</li>
   *    <li>
*         `default` (default: undefined) - The default value presented to subscribers when the topic is undefined or null.
*         This can be overridden by subscribers.
   *    </li>
   *    <li>
   *      `eventOnly` (default: false) - Set this to true if this topic will not have payload data.
   *    </li>
   *    <li>
   *      `doPrime` (default: true) - Should new subscribers automatically receive the last published value on the topic?
   *      If no valid value is present, new subscribers will be primed with the default value (if configured).
   *      This can be overridden by subscribers.
   *    </li>
   *    <li>
   *      `allowRepeats` (default: false) - Alert subscribers of all publish events, even if the value is equal (by strict comparison) to the last value sent.
   *      This can be overridden by subscribers.
   *    </li>
   *    <li>
   *      `storeConfig` (default: {}) - Store-specific configuration that is passed through to the store's
   *      `registerTopic` method.  This allows custom store implementations to receive topic-level
   *      configuration (e.g. persistence keys, TTL settings, etc.).
   *    </li>
   *  </ul>
   * </p>
   */
  async addTopic(newTopicConfig) {
    const topic = buildConfig(DEFAULT_TOPIC_CONFIG, newTopicConfig);

    if (!topic.name) {
      throw new Error('Topics must have a name.');
    }

    if (this.#topics[topic.name]) {
      this.#logger.warn(
        'Pubst.addTopic',
        `The '${topic.name}' topic has already been configured.  The previous configuration will be overwritten.`
      );
    }

    this.#topics[topic.name] = topic;

    return await this.#store.registerTopic(topic.name, null, topic.storeConfig);
  }

  /**
   * @summary Configure new topics.
   *
   * @param {Array<Object>} newTopicConfigs - Topic configurations
   *
   * @returns {Promise<void>}
   *
   * @description
   * <p>
   * Allows you to configure new topics.  This will call `addTopic` with each item passed.
   * Topics are registered sequentially.
   * For available options, see `addTopic`.
   */
  async addTopics(topics) {
    for (const topic of topics) {
      await this.addTopic(topic);
    }
  }

  #getStringSubsFor(topic) {
    return Array.isArray(this.#stringSubs[topic]) ? this.#stringSubs[topic] : [];
  }

  #getFnSubsFor(topic) {
    return this.#fnSubs.filter(sub => {
      try {
        return sub.topic(topic);
      } catch (e) {
        this.#logger.warn('Pubst.subscribe', `Matcher function threw an error for topic '${topic}': ${e.message}`);
        return false;
      }
    });
  }

  #addSub(subscriber) {
    if (typeof subscriber.topic === 'string') {
      if (!this.#topics[subscriber.topic]) {
        this.#logger.warn('Pubst.addSub', `Adding a subscriber to non-configured topic '${subscriber.topic}'`);
      }
      this.#stringSubs[subscriber.topic] = this.#getStringSubsFor(subscriber.topic).concat(subscriber);
    } else if (typeof subscriber.topic === 'function') {
      const matchCount = Object.keys(this.#topics).filter(topic => {
        try {
          return subscriber.topic(topic);
        } catch (e) {
          this.#logger.warn('Pubst.addSub', `Matcher function threw an error while checking topic '${topic}': ${e.message}`);
          return false;
        }
      }).length;
      if (matchCount === 0) {
        this.#logger.warn('Pubst.addSub', `Adding a function matcher subscriber that matches no configured topics.`);
      }
      this.#fnSubs.push(subscriber);
    } else {
      throw new Error('Unable to add subscriber.  Topic is not a string or a function');
    }
  }

  #removeSub(subscriber) {
    if (typeof subscriber.topic === 'string') {
      this.#stringSubs[subscriber.topic] = this.#getStringSubsFor(subscriber.topic).filter(sub => sub !== subscriber);
    } else if (typeof subscriber.topic === 'function') {
      this.#fnSubs = this.#fnSubs.filter(sub => sub !== subscriber);
    }
  }

  #allSubsFor(topic) {
    return this.#getStringSubsFor(topic).concat(this.#getFnSubsFor(topic));
  }

  #getTopicConfig(topic) {
    return this.#topics[topic] || buildConfig(DEFAULT_TOPIC_CONFIG, {name: topic});
  }

  #scheduleCall(sub, payload, topic) {
    const topicConfig = this.#getTopicConfig(topic);

    const defVal = typeof sub.default === 'undefined' ? topicConfig.default : sub.default;
    const eventOnly = hasOwnProperty(sub, 'eventOnly') ? sub.eventOnly : topicConfig.eventOnly;
    const allowRepeats = hasOwnProperty(sub, 'allowRepeats') ? sub.allowRepeats : topicConfig.allowRepeats;
    const value = eventOnly ? topic : valueOrDefault(payload, defVal);

    if (eventOnly || allowRepeats || sub.lastVal !== value || sub.lastTopic !== topic) {
      setTimeout(() => {
        sub.handler(value, topic);
        sub.lastVal = value;
        sub.lastTopic = topic;
      }, 0);
    }
  }

  /**
   * @summary Publish to a topic
   *
   * @param {string} topic - The topic to publish to
   * @param {*} payload The payload to publish
   *
   * @returns {Promise<void>}
   */
  async publish(topic, payload) {
    if (!this.#topics[topic]) {
      this.#logger.warn('Pubst.publish', `Received a publish for '${topic}', but that topic has not been configured.`);
    }

    await this.#store.setValue(topic, payload);
    const storedValue = await this.#store.getValue(topic);
    const subs = this.#allSubsFor(topic);

    if (subs.length === 0) {
      this.#logger.warn('Pubst.publish', `There are no subscribers that match '${topic}'!`);
    } else {
      subs.forEach(sub => {
        this.#scheduleCall(sub, storedValue, topic);
      });
    }
  }

  /**
   * @summary Subscribe to one or more topics
   *
   * @param {string|Function} topic - The topic to receive updates for.
   *   If a string is provided, the handler will be called for all updates
   *   for that topic.  If a function is provided, it will be used as a
   *   matcher: it receives a topic name string and should return a truthy
   *   value if the subscriber should receive updates for that topic.
   *   If the matcher function throws an error, the error is logged as a
   *   warning and the match is skipped.
   * @param {Function|Object} handler - Either your handler function or
   *                                    a subscription configuration object
   * @param {*} default - (Optional) Value to send when topic is empty
   *
   * @returns {Function} - A function that will remove this
   *                       subscription from getting further updates.
   *
   * @description
   * <p>
   * The first argument may be a string or a matcher function.
   * If a string is provided, the handler will be called for all
   * updates for that topic.  If a function is provided, it will be
   * called with each topic name and should return a truthy value to
   * indicate that the subscriber wishes to receive updates for that topic.
   * If the matcher function throws, the error is logged as a warning
   * and the subscriber will not receive the update for that topic.
   * </p>
   *
   * <p>
   * The second argument may be a function or an object.  The object
   * is necessary if you want to provide configuration options for
   * this subscription.  Available options are:
   *  <ul>
   *    <li>`default` - (Default: undefined) - Default value for this sub.</li>
   *    <li>`doPrime` - (Default: true) - Should the handler be primed with
   *        the last value?</li>
   *    <li>`allowRepeats` - (Default: false) - Should the handler be called
   *        when the value doesn't change?</li>
   *    <li>`handler` - (Required) - The handler to call.</li>
   *  </ul>
   * </p>
   *
   * <p>
   * The handler will be called on topic updates.  It will be passed
   * the new value of the topic as the first argument, and the name of
   * the topic as the second argument.
   * </p>
   *
   * <p>
   * Note: Subscribe is synchronous and returns an unsubscribe function
   * immediately.  Priming of subscribers with existing values happens
   * asynchronously via the store.
   * </p>
   */
  subscribe(topic, handler, def) {
    let subscription;

    if (typeof handler === 'function') {
      subscription = {topic, default: def, handler};
    } else if (typeof handler === 'object') {
      subscription = {};
      Object.keys(handler)
        .filter(key => ALLOWED_SUB_PROPS.includes(key))
        .forEach(key => {
          subscription[key] = handler[key];
        });

      subscription.topic = topic;
    }

    this.#addSub(subscription);

    if (typeof topic === 'string') {
      this.#store.getValue(topic).then(storeVal => {
        const topicConfig = this.#getTopicConfig(topic);
        const defToUse = isDefined(def) ? def : topicConfig.default;
        const val = valueOrDefault(storeVal, defToUse);
        const doPrime = hasOwnProperty(subscription, 'doPrime') ? subscription.doPrime : topicConfig.doPrime;

        if (doPrime && (topicConfig.eventOnly || isSet(val))) {
          this.#scheduleCall(subscription, val, topic);
        }
      });
    } else if (typeof topic === 'function') {
      this.#store.getTopicNames().then(names => {
        const matchingNames = names.filter(key => {
          try {
            return topic(key);
          } catch (e) {
            this.#logger.warn('Pubst.subscribe', `Matcher function threw an error for topic '${key}': ${e.message}`);
            return false;
          }
        });

        matchingNames.forEach(key => {
          this.#store.getValue(key).then(storeVal => {
            const topicConfig = this.#getTopicConfig(key);
            const defToUse = isDefined(def) ? def : topicConfig.default;
            const val = valueOrDefault(storeVal, defToUse);
            const doPrime = hasOwnProperty(subscription, 'doPrime') ? subscription.doPrime : topicConfig.doPrime;

            if (doPrime && (topicConfig.eventOnly || isSet(val))) {
              this.#scheduleCall(subscription, val, key);
            }
          });
        });
      });
    }

    return () => {
      this.#removeSub(subscription);
    };
  }

  /**
   * @summary Get the current value of a topic.
   *
   * @param {string} topic - The topic to get the value of.
   * @param {*} default - (Optional) a value to return if the topic is
   *                      empty.
   * @returns {Promise<*>} - Resolves with the current value or the default
   */
  async currentVal(topic, def) {
    const defToUse = isDefined(def) ? def : this.#getTopicConfig(topic).default;
    const storeVal = await this.#store.getValue(topic);
    return valueOrDefault(storeVal, defToUse);
  }

  /**
   * @summary Clears a given topic.
   *
   * @param {string} topic - The topic to clear
   *
   * @returns {Promise<void>}
   *
   * @description Clears the topic by publishing a `null` to it.
   */
  async clear(topic) {
    const topicNames = await this.#store.getTopicNames();
    if (topicNames.includes(topic)) {
      await this.publish(topic, null);
    }
  }

  /**
   * @summary Clears all known topics.
   *
   * @returns {Promise<void>}
   */
  async clearAll() {
    const topicNames = await this.#store.getTopicNames();
    for (const topic of topicNames) {
      await this.clear(topic);
    }
  }
}

export default Pubst;
