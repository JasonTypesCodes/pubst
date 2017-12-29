'use strict';

/*
 * Pubby - Basic JavaScript Pub/Sub Event Emitter
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

var store = {};
var subscribers = {};

function isNotDef(item) {
  return item === null || typeof item === 'undefined';
}

function isDef(item) {
  return !isNotDef(item);
}

function allSubsFor(topic) {
  return Array.isArray(subscribers[topic]) ? subscribers[topic] : [];
}

function scheduleCall(callback, payload, topic) {
  setTimeout(callback.bind(null, payload, topic), 0);
}

function publish(topic, payload) {
  if (store[topic] !== payload) {
    store[topic] = payload;
    var subs = Array.isArray(subscribers[topic]) ? subscribers[topic] : [];

    subs.forEach(function (sub) {
      scheduleCall(sub, store[topic], topic);
    });
  }
}

function subscribe(topic, callback, def) {
  var mySub = function mySub(payload, topic) {
    if (isNotDef(payload)) {
      callback(def, topic);
    } else {
      callback(payload, topic);
    }
  };

  subscribers[topic] = allSubsFor(topic).concat(mySub);

  var current = currentVal(topic, def);
  if (isDef(current)) {
    scheduleCall(mySub, current, topic);
  }

  return function () {
    subscribers[topic] = allSubsFor(topic).filter(function (aSub) {
      return aSub !== mySub;
    });
  };
}

function currentVal(topic, def) {
  if (isNotDef(store[topic])) {
    return def;
  }

  return store[topic];
}

module.exports = {
  currentVal: currentVal,
  publish: publish,
  subscribe: subscribe
};