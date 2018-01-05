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

const store = {};
const subscribers = {};

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

function allSubsFor(topic) {
  return Array.isArray(subscribers[topic]) ? subscribers[topic] : [];
}

function scheduleCall(callback, payload, topic) {
  setTimeout(callback, 0, payload, topic);
}

function publish(topic, payload) {
  if (store[topic] !== payload) {
    store[topic] = payload;
    const subs = Array.isArray(subscribers[topic]) ? subscribers[topic] : [];

    if (subs.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(`WARNING:: There are no subscribers that match '${topic}'!`);
    } else {
      subs.forEach(sub => {
        scheduleCall(sub, store[topic], topic);
      });
    }
  }
}

function subscribe(topic, callback, def) {
  const mySub = (payload, topic) => {
    callback(valueOrDefault(payload, def), topic);
  };

  subscribers[topic] = allSubsFor(topic).concat(mySub);

  const current = currentVal(topic, def);
  if (isSet(current)) {
    scheduleCall(mySub, current, topic);
  }

  return () => {
    subscribers[topic] = allSubsFor(topic).filter(aSub => aSub !== mySub);
  };
}

function currentVal(topic, def) {
  return valueOrDefault(store[topic], def);
}

module.exports = {
  currentVal,
  publish,
  subscribe
};
