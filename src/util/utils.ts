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
 * Internal utility functions used by Pubst.
 *
 * @module utils
 */

/**
 * Safe `hasOwnProperty` check.
 *
 * Narrows `item` so the property can be read without an index signature.
 */
function hasOwnProperty<K extends PropertyKey>(
  item: object,
  key: K,
): item is Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(item, key);
}

/**
 * Check if a value is `undefined`.
 */
function isUndefined(input: unknown): input is undefined {
  return typeof input === 'undefined';
}

/**
 * Check if a value is defined (not `undefined`).
 */
function isDefined<T>(input: T): input is Exclude<T, undefined> {
  return !isUndefined(input);
}

/**
 * Check if a value is not set (`null` or `undefined`).
 */
function isNotSet(item: unknown): item is null | undefined {
  return item === null || isUndefined(item);
}

/**
 * Check if a value is set (neither `null` nor `undefined`).
 */
function isSet<T>(item: T): item is NonNullable<T> {
  return !isNotSet(item);
}

/**
 * Return a value, falling back to a default when the value is not set.
 *
 * The default is only used when it is itself defined, so passing an
 * undefined default leaves a `null` value as `null`.
 */
function valueOrDefault<T, D>(value: T, def: D): T | D {
  if (isNotSet(value) && isDefined(def)) {
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
