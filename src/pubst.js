/**
 *  Pubst - Basic JavaScript Pub/Sub Event Emitter
 * @module pubst
 *
 *  Copyright 2017 Jason Schindler
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

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.pubst = factory();
}
}(typeof self !== 'undefined' ? self : this, function () {

  const config = {
    showWarnings: true
  };

  function warn(...messages) {
    if (config.showWarnings) {
      // eslint-disable-next-line no-console
      console.warn('WARNING:', ...messages);
    }
  }

  /**
   * Set global configuration.
   * @param {Object} config - Your configuration
   *
   * Available options are:
   *  `showWarnings` (default: true) - Show warnings in the console.
   */
  function configure(userConfig = {}) {
    for (const key in userConfig) {
      if (config.hasOwnProperty(key)) {
        config[key] = userConfig[key];
      }
    }
  }

  const store = {};
  const stringSubs = {};
  let regexSubs = [];

  function getStringSubsFor(topic) {
    return Array.isArray(stringSubs[topic]) ? stringSubs[topic] : [];
  }

  function getRegexSubsFor(topic) {
    return regexSubs.filter(sub => Boolean(topic.match(sub.topic)));
  }

  function addSub(subscriber) {
    if (typeof subscriber.topic === 'string') {
      stringSubs[subscriber.topic] = getStringSubsFor(subscriber.topic).concat(subscriber);
    } else if (subscriber.topic instanceof RegExp) {
      regexSubs.push(subscriber);
    } else {
      throw new Error('Unable to add subscriber.  Topic is not a string or a RegExp');
    }
  }

  function removeSub(subscriber) {
    if (typeof subscriber.topic === 'string') {
      stringSubs[subscriber.topic] = getStringSubsFor(subscriber.topic).filter(sub => sub !== subscriber);
    } else if (subscriber.topic instanceof RegExp) {
      regexSubs = regexSubs.filter(sub => sub !== subscriber);
    }
  }

  function allSubsFor(topic) {
    return getStringSubsFor(topic).concat(getRegexSubsFor(topic));
  }

  function isNotSet(item) {
    return item === null || typeof item === 'undefined';
  }

  function isSet(item) {
    return !isNotSet(item);
  }

  function valueOrDefault(value, def) {
    if(isNotSet(value) && typeof def !== 'undefined'){
      return def;
    }

    return value;
  }

  function scheduleCall(sub, payload, topic) {
    setTimeout(() => {
      const value = valueOrDefault(payload, sub.default);
      if (sub.allowRepeats || sub.lastVal !== value || sub.lastTopic !== topic) {
        sub.handler(value, topic);
        sub.lastVal = value;
        sub.lastTopic = topic;
      }
    }, 0);
  }

  /**
   * Publish to a topic
   * @param {string} topic - The topic to publish to
   * @param {*} payload The payload to publish
   */
  function publish(topic, payload) {
    store[topic] = payload;
    const subs = allSubsFor(topic);

    if (subs.length === 0) {
      warn(`There are no subscribers that match '${topic}'!`);
    } else {
      subs.forEach(sub => {
        scheduleCall(sub, store[topic], topic);
      });
    }
  }

  /**
   * Subscribe to one or more topics
   * @param {string|RegExp} topic - The topic to receive updates for
   * @param {Function|Object} handler
   * @param {*} default - (Optional) Value to send when topic is empty
   *
   * @returns {Function} - A function that will remove this
   *                       subscription from getting further updates.
   *
   * The first argument may be a string or a regular expression.
   * If a string is provided, the handler will be called for all
   * updates for that topic.  If a regular expression is provided,
   * the handler will be called for all topics that match the regular
   * expression.
   *
   * The second argument may be a function or an object.  The object
   * is necessary if you want to provide configuration options for
   * this subscription.  Available options are:
   *
   *  `default` - (Default: undefined) - Default value for this sub.
   *  `doPrime` - (Default: true) - Should the handler be primed with
   *                                the last value?
   *  `allowRepeats` - (Default: false) - Should the handler be called
   *                                      when the value doesn't change
   *  `handler` - (Required) - The handler to call.
   *
   * The handler will be called on topic updates.  It will be passed
   * the new value of the topic as the first argument, and the name of
   * the topic as the second argument.
   */
  function subscribe(topic, handler, def) {
    const subscription = {
      topic,
      default: undefined,
      doPrime: true,
      allowRepeats: false,
      handler: () => {}
    };

    if (typeof handler === 'function') {
      subscription.default = def;
      subscription.handler = handler;
    } else if (typeof handler === 'object') {
      for (const key in handler) {
        if (subscription.hasOwnProperty(key)) {
          subscription[key] = handler[key];
        }
      }
    }

    addSub(subscription);

    if (subscription.doPrime) {
      let stored;

      if (typeof topic === 'string') {
        stored = [{
          topic,
          val: currentVal(topic, def)
        }];
      } else if (topic instanceof RegExp) {
        stored = Object.keys(store).filter(key => key.match(topic)).map(key => {
          return {
            topic: key,
            val: currentVal(key, def)
          };
        });
      }

      stored.forEach(item => {
        if (isSet(item.val)) {
          scheduleCall(subscription, item.val, item.topic);
        }
      });
    }

    return () => {
      removeSub(subscription);
    };
  }

  /**
   * Get the current value of a topic.
   * @param {string} topic - The topic to get the value of.
   * @param {*} default - (Optional) a value to return if the topic is
   *                      empty.
   * @returns {*} - The current value or the default
   */
  function currentVal(topic, def) {
    return valueOrDefault(store[topic], def);
  }

  /**
   * Clears a given topic.
   * @param {string} topic - The topic to clear
   *
   * Clears the topic by publishing a `null` to it.
   */
  function clear(topic) {
    if (store.hasOwnProperty(topic)) {
      publish(topic, null);
    }
  }

  /**
   * Clears all known topics.
   */
  function clearAll() {
    Object.keys(store).forEach(clear);
  }

  return {
    clear,
    clearAll,
    configure,
    currentVal,
    publish,
    subscribe
  };
}));
