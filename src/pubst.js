/**
 *  Pubst - A slightly opinionated pub/sub library for JavaScript.
 *
 *  Copyright 2017-2018 Jason Schindler
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
 * @file pubst.js
 * @module pubst
 * @author Jason Schindler
 * @copyright Jason Schindler 2017-2018
 * @description A slightly opinionated pub/sub library for JavaScript.
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
   * @summary Set global configuration.
   *
   * @alias module:pubst.configure
   * @param {Object} config - Your configuration
   *
   * @description
   * <p>
   * Available options are:
   *  <ul>
   *    <li>`showWarnings` (default: true) - Show warnings in the console.</li>
   *    <li>`topics` - An array of topic configurations. (See: `addTopic` for topic configuration options)</li>
   *  </ul>
   * </p>
   */
  function configure(userConfig = {}) {
    for (const key in userConfig) {
      if (config.hasOwnProperty(key)) {
        config[key] = userConfig[key];
      }
    }

    if (Array.isArray(userConfig.topics)) {
      addTopics(userConfig.topics);
    }
  }

  const store = {};
  const stringSubs = {};
  let regexSubs = [];
  const topics = {};

  const DEFAULT_TOPIC_CONFIG = {
    name: '',
    default: undefined,
    eventOnly: false,
    doPrime: true,
    allowRepeats: false,
    validator: () => ({valid: true, messages: []})
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
      if (result.hasOwnProperty(key)) {
        result[key] = extensions[key];
      }
    }

    return result;
  }

  function buildValidationErrorMessage(topicName, validationMessages, payload) {
    let messages = '';
    if (Array.isArray(validationMessages) && validationMessages.length > 0) {
      const s = validationMessages.length === 1 ? '' : 's';
      messages = `Message${s}:\n  ${validationMessages.join('\n  ')}`;
    }

    const payloadString = 'Received Payload:\n  ' + JSON.stringify(payload, null, 2);

    return `Validation failed for topic '${topicName}'.\n ${messages}\n ${payloadString}`;
  }

  /**
   * @summary Configure a new topic.
   *
   * @alias module:pubst.addTopic
   * @param {Object} newTopicConfig - Topic configuration
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
   *      `validator` - Validation function to assert that published values are valid before sent to subscribers.
   *      Function will be called with each published payload.
   *      If a payload fails validation, an error will be thrown during the `publish` call.
   *      The function should return something like:<br/>
   *      <code>
   *        {
   *          valid: false,
   *          messages: ['Message 1', 'Message 2']
   *        }
   *      </code>
   *    </li>
   *  </ul>
   * </p>
   */
  function addTopic(newTopicConfig) {
    const topic = buildConfig(DEFAULT_TOPIC_CONFIG, newTopicConfig);

    if (!topic.name) {
      throw new Error('Topics must have a name.');
    }

    if (topics[topic.name]) {
      warn(`The '${topic.name}' topic has already been configured.  The previous configuration will be overwritten.`);
    }

    if (isDefined(topic.default)) {
      const defaultValidationResult = topic.validator(topic.default);
      if (!defaultValidationResult.valid) {
        warn(`'${topic.name}' has been configured with a default value that does not pass validation.
Complete message:
${buildValidationErrorMessage(topic.name, defaultValidationResult.messages, topic.default)}`);
      }
    }

    topics[topic.name] = topic;

  }

  /**
   * @summary Configure new topics.
   *
   * @alias module:pubst.addTopics
   * @param {Array<Object>} newTopicConfigs - Topic configurations
   *
   * @description
   * <p>
   * Allows you to configure new topics.  This will call `addTopic` with each item passed.
   * For available options, see `addTopic`.
   */
  function addTopics(topics) {
    topics.forEach(addTopic);
  }

  function getStringSubsFor(topic) {
    return Array.isArray(stringSubs[topic]) ? stringSubs[topic] : [];
  }

  function getRegexSubsFor(topic) {
    return regexSubs.filter(sub => Boolean(topic.match(sub.topic)));
  }

  function addSub(subscriber) {
    if (typeof subscriber.topic === 'string') {
      if (!topics[subscriber.topic]) {
        warn(`Adding a subscriber to non-configured topic '${subscriber.topic}'`);
      }
      stringSubs[subscriber.topic] = getStringSubsFor(subscriber.topic).concat(subscriber);
    } else if (subscriber.topic instanceof RegExp) {
      const matchCount = Object.keys(topics).filter(topic => topic.match(subscriber.topic)).length;
      if (matchCount === 0) {
        warn(`Adding a RegExp subscriber that matches no configured topics.`);
      }
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

  function isUndefined(input) {
    return typeof input === 'undefined';
  }

  function isDefined(input) {
    return !isUndefined(input);
  }

  function isNotSet(item) {
    return item === null || isUndefined(item);
  }

  function isSet(item) {
    return !isNotSet(item);
  }

  function valueOrDefault(value, def) {
    if(isNotSet(value) && isDefined(def)){
      return def;
    }

    return value;
  }

  function getTopicConfig(topic) {
    return topics[topic] || buildConfig(DEFAULT_TOPIC_CONFIG, {name: topic});
  }

  function scheduleCall(sub, payload, topic) {
    const topicConfig = getTopicConfig(topic);

    const defVal = typeof sub.default === 'undefined' ? topicConfig.default : sub.default;
    const eventOnly = sub.hasOwnProperty('eventOnly') ? sub.eventOnly : topicConfig.eventOnly;
    const allowRepeats = sub.hasOwnProperty('allowRepeats') ? sub.allowRepeats : topicConfig.allowRepeats;
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
   * @alias module:pubst.publish
   * @param {string} topic - The topic to publish to
   * @param {*} payload The payload to publish
   */
  function publish(topic, payload) {
    if (!topics[topic]) {
      warn(`Received a publish for ${topic} but that topic has not been configured.`);
    }

    const topicConfig = getTopicConfig(topic);

    if (!topicConfig.eventOnly) {
      const validationResult = topicConfig.validator(payload);

      if (!validationResult || !validationResult.valid) {
        const messages = validationResult ? validationResult.messages : [];
        throw new Error(buildValidationErrorMessage(topic, messages, payload));
      }
    }

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
   * @summary Subscribe to one or more topics
   *
   * @alias module:pubst.subscribe
   * @param {string|RegExp} topic - The topic to receive updates for
   * @param {Function|Object} handler - Either your handler function or
   *                                    a subscription configuration object
   * @param {*} default - (Optional) Value to send when topic is empty
   *
   * @returns {Function} - A function that will remove this
   *                       subscription from getting further updates.
   *
   * @description
   * <p>
   * The first argument may be a string or a regular expression.
   * If a string is provided, the handler will be called for all
   * updates for that topic.  If a regular expression is provided,
   * the handler will be called for all topics that match the regular
   * expression.
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
   */
  function subscribe(topic, handler, def) {
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

    addSub(subscription);

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
      const topicConfig = getTopicConfig(item.topic);
      const doPrime = subscription.hasOwnProperty('doPrime') ? subscription.doPrime : topicConfig.doPrime;

      if (doPrime && (topicConfig.eventOnly || isSet(item.val))) {
        scheduleCall(subscription, item.val, item.topic);
      }
    });

    return () => {
      removeSub(subscription);
    };
  }

  /**
   * @summary Get the current value of a topic.
   *
   * @alias module:pubst.currentVal
   * @param {string} topic - The topic to get the value of.
   * @param {*} default - (Optional) a value to return if the topic is
   *                      empty.
   * @returns {*} - The current value or the default
   */
  function currentVal(topic, def) {
    const defToUse = isDefined(def) ? def : getTopicConfig(topic).default;
    return valueOrDefault(store[topic], defToUse);
  }

  /**
   * @summary Clears a given topic.
   *
   * @alias module:pubst.clear
   * @param {string} topic - The topic to clear
   *
   * @description Clears the topic by publishing a `null` to it.
   */
  function clear(topic) {
    if (store.hasOwnProperty(topic)) {
      publish(topic, null);
    }
  }

  /**
   * @summary Clears all known topics.
   *
   * @alias module:pubst.clearAll
   */
  function clearAll() {
    Object.keys(store).forEach(clear);
  }

  return {
    addTopic,
    addTopics,
    clear,
    clearAll,
    configure,
    currentVal,
    publish,
    subscribe
  };
}));
