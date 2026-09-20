/*
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
 */

import { isDefined, isSet, valueOrDefault } from './util/utils.js';

import ConsoleLogger from './logger/ConsoleLogger.js';
import SilentLogger from './logger/SilentLogger.js';
import InMemoryStore from './store/InMemoryStore.js';

import type {
  Handler,
  Logger,
  PubstConfig,
  RegisteredTopic,
  Store,
  SubscriptionConfig,
  TopicConfig,
  TopicMatcher,
  Unsubscribe,
} from './types.js';

export type {
  Handler,
  Logger,
  PubstConfig,
  RegisteredTopic,
  Store,
  SubscriptionConfig,
  TopicConfig,
  TopicMatcher,
  Unsubscribe,
} from './types.js';

const DEFAULT_TOPIC_CONFIG: Required<TopicConfig> = {
  name: '',
  default: undefined,
  eventOnly: false,
  doPrime: true,
  allowRepeats: false,
  storeConfig: {}
};

/**
 * A live subscription.  This is {@link SubscriptionConfig} with the topic
 * resolved and the repeat-suppression bookkeeping that `#scheduleCall`
 * maintains.  Deliberately not part of the public type surface.
 */
interface Subscription {
  topic: string | TopicMatcher;
  handler: Handler<unknown>;
  default?: unknown;
  eventOnly?: boolean | undefined;
  doPrime?: boolean | undefined;
  allowRepeats?: boolean | undefined;
  lastVal?: unknown;
  lastTopic?: string | undefined;
}

/**
 * Fill in a topic configuration from the defaults.
 *
 * `default` is checked for presence rather than for `undefined`, because
 * `undefined` and `null` are meaningfully different defaults.
 */
function buildTopicConfig(overrides: TopicConfig): Required<TopicConfig> {
  return {
    name: overrides.name ?? DEFAULT_TOPIC_CONFIG.name,
    default: 'default' in overrides ? overrides.default : DEFAULT_TOPIC_CONFIG.default,
    eventOnly: overrides.eventOnly ?? DEFAULT_TOPIC_CONFIG.eventOnly,
    doPrime: overrides.doPrime ?? DEFAULT_TOPIC_CONFIG.doPrime,
    allowRepeats: overrides.allowRepeats ?? DEFAULT_TOPIC_CONFIG.allowRepeats,
    storeConfig: overrides.storeConfig ?? DEFAULT_TOPIC_CONFIG.storeConfig,
  };
}

/**
 * A slightly opinionated pub/sub utility for JavaScript.
 */
class Pubst {

  #logger: Logger = new ConsoleLogger();

  #store: Store = new InMemoryStore();
  #stringSubs = new Map<string, Subscription[]>();
  #fnSubs: Subscription[] = [];
  #topics = new Map<string, Required<TopicConfig>>();

  /**
   * Creates a new Pubst instance.
   *
   * The instance is ready to use immediately with default settings.  Call
   * `await configure()` only if you need to customize the logger, the store,
   * or pre-register topics.
   *
   * @example
   * ```ts
   * const pubst = new Pubst();
   * await pubst.configure({ showWarnings: false });
   * ```
   */
  constructor() {
  }

  /**
   * Set Pubst configuration.
   *
   * Available options are:
   *
   * - `logger` (default: `ConsoleLogger`) — where to send warnings.
   * - `showWarnings` — when no `logger` is given, switches between
   *   `ConsoleLogger` and `SilentLogger`.
   * - `store` (default: `InMemoryStore`) — where to persist topic values.
   *   Custom stores must satisfy the {@link Store} interface.
   * - `topics` — topics to register up front.  See {@link addTopic}.
   */
  async configure(userConfig: PubstConfig = {}): Promise<void> {
    if (userConfig.logger) {
      this.#logger = userConfig.logger;
    } else if (userConfig.showWarnings !== undefined && !userConfig.showWarnings) {
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
   * Configure a new topic.
   *
   * Available options are:
   *
   * - `name` (**required**) — the name of the topic.
   * - `default` (default: `undefined`) — the value presented to subscribers
   *   when the topic is unset.  Subscribers may override this.
   * - `eventOnly` (default: `false`) — set to true if the topic carries no
   *   payload data.
   * - `doPrime` (default: `true`) — should new subscribers immediately
   *   receive the current value?  If no valid value is present they are
   *   primed with the default instead.  Subscribers may override this.
   * - `allowRepeats` (default: `false`) — notify subscribers on every
   *   publish, even when the value is unchanged by strict equality.
   *   Subscribers may override this.
   * - `storeConfig` (default: `{}`) — store-specific configuration, passed
   *   through to the store's `registerTopic` method so custom stores can
   *   receive per-topic settings such as persistence keys or TTLs.
   *
   * @returns The result of registering the topic with the store.
   */
  async addTopic(newTopicConfig: TopicConfig): Promise<RegisteredTopic> {
    const topic = buildTopicConfig(newTopicConfig);

    if (!topic.name) {
      throw new Error('Topics must have a name.');
    }

    if (this.#topics.has(topic.name)) {
      this.#logger.warn(
        'Pubst.addTopic',
        `The '${topic.name}' topic has already been configured.  The previous configuration will be overwritten.`
      );
    }

    this.#topics.set(topic.name, topic);

    return await this.#store.registerTopic(topic.name, null, topic.storeConfig);
  }

  /**
   * Configure new topics, sequentially.
   *
   * Calls {@link addTopic} with each item passed.  For the available
   * options, see {@link addTopic}.
   */
  async addTopics(topics: TopicConfig[]): Promise<void> {
    for (const topic of topics) {
      await this.addTopic(topic);
    }
  }

  #getStringSubsFor(topic: string): Subscription[] {
    return this.#stringSubs.get(topic) ?? [];
  }

  #getFnSubsFor(topic: string): Subscription[] {
    return this.#fnSubs.filter(sub => this.#matches(sub.topic, topic, 'Pubst.subscribe'));
  }

  /**
   * Run a matcher against a topic name, treating a thrown error as "no
   * match" and logging it.  Returns false for string topics.
   */
  #matches(matcher: string | TopicMatcher, topic: string, source: string): boolean {
    if (typeof matcher !== 'function') {
      return false;
    }

    try {
      return Boolean(matcher(topic));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.#logger.warn(source, `Matcher function threw an error for topic '${topic}': ${message}`);
      return false;
    }
  }

  #addSub(subscriber: Subscription): void {
    if (typeof subscriber.topic === 'string') {
      if (!this.#topics.has(subscriber.topic)) {
        this.#logger.warn('Pubst.addSub', `Adding a subscriber to non-configured topic '${subscriber.topic}'`);
      }
      this.#stringSubs.set(subscriber.topic, this.#getStringSubsFor(subscriber.topic).concat(subscriber));
    } else if (typeof subscriber.topic === 'function') {
      const matchCount = [...this.#topics.keys()].filter(
        topic => this.#matches(subscriber.topic, topic, 'Pubst.addSub')
      ).length;

      if (matchCount === 0) {
        this.#logger.warn('Pubst.addSub', `Adding a function matcher subscriber that matches no configured topics.`);
      }
      this.#fnSubs.push(subscriber);
    } else {
      throw new Error('Unable to add subscriber.  Topic is not a string or a function');
    }
  }

  #removeSub(subscriber: Subscription): void {
    if (typeof subscriber.topic === 'string') {
      this.#stringSubs.set(
        subscriber.topic,
        this.#getStringSubsFor(subscriber.topic).filter(sub => sub !== subscriber)
      );
    } else if (typeof subscriber.topic === 'function') {
      this.#fnSubs = this.#fnSubs.filter(sub => sub !== subscriber);
    }
  }

  #allSubsFor(topic: string): Subscription[] {
    return this.#getStringSubsFor(topic).concat(this.#getFnSubsFor(topic));
  }

  #getTopicConfig(topic: string): Required<TopicConfig> {
    return this.#topics.get(topic) ?? buildTopicConfig({name: topic});
  }

  #scheduleCall(sub: Subscription, payload: unknown, topic: string): void {
    const topicConfig = this.#getTopicConfig(topic);

    const defVal = sub.default === undefined ? topicConfig.default : sub.default;
    const eventOnly = sub.eventOnly === undefined ? topicConfig.eventOnly : sub.eventOnly;
    const allowRepeats = sub.allowRepeats === undefined ? topicConfig.allowRepeats : sub.allowRepeats;
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
   * Schedule every subscriber matching `topic` to receive `value`.
   *
   * Returns the number of subscribers notified.  Stays silent about a topic
   * with no subscribers; callers decide whether that is worth a warning.
   */
  #notify(topic: string, value: unknown): number {
    const subs = this.#allSubsFor(topic);

    subs.forEach(sub => {
      this.#scheduleCall(sub, value, topic);
    });

    return subs.length;
  }

  /**
   * Prime a single subscriber with the current value of a topic, if the
   * topic's configuration calls for it.
   */
  #prime(subscription: Subscription, topic: string, def: unknown): void {
    void this.#store.getValue(topic).then(storeVal => {
      const topicConfig = this.#getTopicConfig(topic);
      const defToUse = isDefined(def) ? def : topicConfig.default;
      const val = valueOrDefault(storeVal, defToUse);
      const doPrime = subscription.doPrime === undefined ? topicConfig.doPrime : subscription.doPrime;

      if (doPrime && (topicConfig.eventOnly || isSet(val))) {
        this.#scheduleCall(subscription, val, topic);
      }
    });
  }

  /**
   * Publish to a topic.
   *
   * The payload may be omitted, which is the normal way to publish to an
   * event-only topic.
   */
  async publish<T = unknown>(topic: string, payload?: T): Promise<void> {
    if (!this.#topics.has(topic)) {
      this.#logger.warn('Pubst.publish', `Received a publish for '${topic}', but that topic has not been configured.`);
    }

    await this.#store.setValue(topic, payload);
    const storedValue = await this.#store.getValue(topic);

    if (this.#notify(topic, storedValue) === 0) {
      this.#logger.warn('Pubst.publish', `There are no subscribers that match '${topic}'!`);
    }
  }

  /**
   * Subscribe to one or more topics.
   *
   * The first argument may be a topic name or a {@link TopicMatcher}.  A
   * matcher is called with each topic name and should return a truthy value
   * to indicate that the subscriber wants updates for that topic.  If it
   * throws, the error is logged as a warning and the topic is skipped.
   *
   * The second argument may be a handler function or a
   * {@link SubscriptionConfig} object.  The object form is needed to
   * configure the subscription:
   *
   * - `handler` (**required**) — the handler to call.
   * - `default` (default: `undefined`) — the value to send when the topic
   *   is unset.
   * - `doPrime` (default: `true`) — should the handler be primed with the
   *   current value?
   * - `allowRepeats` (default: `false`) — should the handler be called when
   *   the value does not change?
   * - `eventOnly` (default: `false`) — treat updates as payload-free events.
   *
   * The handler receives the new value of the topic as its first argument
   * and the topic name as its second.
   *
   * Subscribe is synchronous and returns an unsubscribe function
   * immediately.  Priming happens asynchronously, via the store.
   *
   * @returns A function that removes this subscription.
   */
  subscribe<T = unknown>(
    topic: string | TopicMatcher,
    handler: Handler<T> | SubscriptionConfig<T>,
    def?: T,
  ): Unsubscribe {
    let subscription: Subscription;

    if (typeof handler === 'function') {
      subscription = {topic, default: def, handler: handler as Handler<unknown>};
    } else if (handler !== null && typeof handler === 'object') {
      // Built explicitly rather than by copying an allow-list of keys, so
      // that the set of honored options cannot drift away from the type.
      subscription = {
        topic,
        handler: handler.handler as Handler<unknown>,
        default: handler.default,
        doPrime: handler.doPrime,
        allowRepeats: handler.allowRepeats,
        eventOnly: handler.eventOnly,
      };
    } else {
      throw new Error('Unable to subscribe.  Handler must be a function or a subscription configuration object.');
    }

    this.#addSub(subscription);

    if (typeof topic === 'string') {
      this.#prime(subscription, topic, def);
    } else if (typeof topic === 'function') {
      void this.#store.getTopicNames().then(names => {
        names
          .filter(key => this.#matches(topic, key, 'Pubst.subscribe'))
          .forEach(key => {
            this.#prime(subscription, key, def);
          });
      });
    }

    return () => {
      this.#removeSub(subscription);
    };
  }

  /**
   * Get the current value of a topic.
   *
   * @param topic - The topic to read.
   * @param def - A value to fall back to when the topic is unset.
   */
  async currentVal<T = unknown>(topic: string, def?: T): Promise<T | undefined> {
    const defToUse = isDefined(def) ? def : this.#getTopicConfig(topic).default;
    const storeVal = await this.#store.getValue(topic);
    return valueOrDefault(storeVal, defToUse) as T | undefined;
  }

  /**
   * Clear a topic.
   *
   * Clears the value through the store's `clearValue` method and notifies
   * subscribers with whatever the store holds afterwards.
   */
  async clear(topic: string): Promise<void> {
    const topicNames = await this.#store.getTopicNames();

    if (topicNames.includes(topic)) {
      await this.#store.clearValue(topic);
      this.#notify(topic, await this.#store.getValue(topic));
    }
  }

  /**
   * Clear all known topics.
   */
  async clearAll(): Promise<void> {
    const topicNames = await this.#store.getTopicNames();

    for (const topic of topicNames) {
      await this.clear(topic);
    }
  }
}

export default Pubst;
