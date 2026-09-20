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
 * The public type surface shared across Pubst.
 *
 * Everything here is re-exported from the package entry point, so consumers
 * can write `import type { Store, Logger } from 'pubst'`.
 *
 * @module types
 */

/**
 * Receives warnings emitted by Pubst.
 *
 * The contract is structural: any object with a matching `warn` method is a
 * valid logger, whether or not it declares `implements Logger`.
 */
export interface Logger {
  /**
   * Handle a warning.
   *
   * @param source - Where the warning came from, e.g. `'Pubst.publish'`.
   * @param message - The warning text.
   */
  warn(source: string, message: string): void;
}

/**
 * The result of registering a topic with a {@link Store}.
 */
export interface RegisteredTopic {
  /** The name of the topic that was registered. */
  topicName: string;
  /** The value the topic was initialized with. */
  initialVal: unknown;
  /** The store-specific configuration the topic was registered with. */
  storeConfig: Record<string, unknown>;
}

/**
 * Persists topic values on behalf of Pubst.
 *
 * `InMemoryStore` is the default and the reference implementation.  The
 * contract is structural, so an existing duck-typed store keeps working
 * without importing anything from Pubst — but implementations written in
 * TypeScript can declare `implements Store` and be checked against it.
 *
 * Every method is asynchronous.
 */
export interface Store {
  /**
   * Register a topic.  Called by `Pubst.addTopic`.
   *
   * @param topicName - The name of the topic to register.
   * @param initialVal - The initial value.  Pubst always passes `null`.
   * @param storeConfig - Store-specific configuration, passed through from
   *   the topic's `storeConfig` option.
   */
  registerTopic(
    topicName: string,
    initialVal?: unknown,
    storeConfig?: Record<string, unknown>,
  ): Promise<RegisteredTopic>;

  /**
   * Retrieve the current value for a topic.
   *
   * Resolves with `undefined` if the topic is unknown to the store.
   */
  getValue(topicName: string): Promise<unknown>;

  /** Store a new value for a topic.  Resolves with the value that was stored. */
  setValue(topicName: string, value?: unknown): Promise<unknown>;

  /** Clear the value for a topic.  Called by `Pubst.clear`. */
  clearValue(topicName: string): Promise<unknown>;

  /** Return the names of every registered topic. */
  getTopicNames(): Promise<string[]>;
}

/**
 * Called when a subscribed topic is updated.
 *
 * @param value - The new value of the topic, or the topic name for
 *   event-only topics.
 * @param topic - The name of the topic that was updated.
 */
export type Handler<T = unknown> = (value: T, topic: string) => void;

/**
 * Selects the topics a subscriber should receive updates for.
 *
 * Called with each topic name; return a truthy value to subscribe.  Any
 * truthy value works, not just `true`.  If it throws, the error is logged
 * as a warning and the topic is skipped.
 */
export type TopicMatcher = (topic: string) => unknown;

/** Removes a subscription.  Returned by `Pubst.subscribe`. */
export type Unsubscribe = () => void;

/**
 * Configuration for a topic.  Accepted by `Pubst.addTopic`.
 */
export interface TopicConfig {
  /** The name of the topic.  Required. */
  name: string;
  /**
   * The value presented to subscribers when the topic is unset.
   * Subscribers may override this per-subscription.
   */
  default?: unknown;
  /** Set to true if this topic carries no payload.  Defaults to `false`. */
  eventOnly?: boolean;
  /**
   * Should new subscribers immediately receive the current value?
   * Defaults to `true`.  Subscribers may override this.
   */
  doPrime?: boolean;
  /**
   * Notify subscribers on every publish, even when the value is unchanged
   * by strict equality.  Defaults to `false`.  Subscribers may override this.
   */
  allowRepeats?: boolean;
  /**
   * Store-specific configuration, passed through to the store's
   * `registerTopic` method.  Defaults to `{}`.
   */
  storeConfig?: Record<string, unknown>;
}

/**
 * Configuration for a single subscription.  Accepted as the second argument
 * to `Pubst.subscribe` in place of a bare handler function.
 *
 * Each option overrides the corresponding {@link TopicConfig} option for
 * this subscriber only.
 */
export interface SubscriptionConfig<T = unknown> {
  /** The handler to call when a subscribed topic is updated.  Required. */
  handler: Handler<T>;
  /**
   * The topic or matcher to subscribe to.  Pubst sets this from
   * `subscribe`'s first argument, so supplying it here has no effect.
   */
  topic?: string | TopicMatcher;
  /** The value to send when the topic is unset. */
  default?: T;
  /** Treat updates as payload-free events. */
  eventOnly?: boolean;
  /** Should this handler be primed with the current value? */
  doPrime?: boolean;
  /** Should this handler be called when the value does not change? */
  allowRepeats?: boolean;
}

/**
 * Configuration for a Pubst instance.  Accepted by `Pubst.configure`.
 */
export interface PubstConfig {
  /** Where to send warnings.  Defaults to `ConsoleLogger`. */
  logger?: Logger;
  /**
   * When no `logger` is supplied, switches between `ConsoleLogger` (true)
   * and `SilentLogger` (false).
   */
  showWarnings?: boolean;
  /** Where to persist topic values.  Defaults to `InMemoryStore`. */
  store?: Store;
  /** Topics to register up front.  See `addTopic`. */
  topics?: TopicConfig[];
}
