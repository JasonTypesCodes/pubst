/*
 *  Pubst - Basic JavaScript Pub/Sub Event Emitter
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

  function scheduleCall(callback, payload, topic) {
    setTimeout(callback, 0, payload, topic);
  }

  function publish(topic, payload) {
    if (store[topic] !== payload) {
      store[topic] = payload;
      const subs = allSubsFor(topic);

      if (subs.length === 0) {
        warn(`There are no subscribers that match '${topic}'!`);
      } else {
        subs.forEach(sub => {
          scheduleCall(sub.subFn, store[topic], topic);
        });
      }
    }
  }

  function subscribe(topic, callback, def) {
    const subscriber = {
      topic,
      default: def,
      subFn: (payload, topic) => {
        callback(valueOrDefault(payload, def), topic);
      }
    };

    addSub(subscriber);

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
        scheduleCall(subscriber.subFn, item.val, item.topic);
      }
    });

    return () => {
      removeSub(subscriber);
    };
  }

  function currentVal(topic, def) {
    return valueOrDefault(store[topic], def);
  }

  function clear(topic) {
    if (store.hasOwnProperty(topic)) {
      publish(topic, null);
    }
  }

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
