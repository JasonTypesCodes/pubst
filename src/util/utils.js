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
 * @module utils
 * @summary Internal utility functions used by Pubst.
 */

/**
 * @summary Safe `hasOwnProperty` check.
 *
 * @param {Object} item - The object to check.
 * @param {string} key - The property name.
 * @returns {boolean} `true` if the object has the given own property.
 */
function hasOwnProperty(item, key) {
  return Object.prototype.hasOwnProperty.call(item, key);
}

/**
 * @summary Check if a value is `undefined`.
 *
 * @param {*} input - The value to check.
 * @returns {boolean} `true` if the value is `undefined`.
 */
function isUndefined(input) {
  return typeof input === 'undefined';
}

/**
 * @summary Check if a value is defined (not `undefined`).
 *
 * @param {*} input - The value to check.
 * @returns {boolean} `true` if the value is not `undefined`.
 */
function isDefined(input) {
  return !isUndefined(input);
}

/**
 * @summary Check if a value is not set (`null` or `undefined`).
 *
 * @param {*} item - The value to check.
 * @returns {boolean} `true` if the value is `null` or `undefined`.
 */
function isNotSet(item) {
  return item === null || isUndefined(item);
}

/**
 * @summary Check if a value is set (not `null` and not `undefined`).
 *
 * @param {*} item - The value to check.
 * @returns {boolean} `true` if the value is neither `null` nor `undefined`.
 */
function isSet(item) {
  return !isNotSet(item);
}

/**
 * @summary Return a value, falling back to a default if the value is not set.
 *
 * @param {*} value - The value to return if set.
 * @param {*} def - The default to return if `value` is `null` or `undefined`.
 * @returns {*} The value if set, otherwise the default.
 */
function valueOrDefault(value, def) {
  if(isNotSet(value) && isDefined(def)){
    return def;
  }

  return value;
}

export {
  hasOwnProperty,
  isUndefined,
  isDefined,
  isNotSet,
  isSet,
  valueOrDefault
};
