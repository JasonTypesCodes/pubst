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

function hasOwnProperty(item, key) {
  return Object.prototype.hasOwnProperty.call(item, key);
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

export {
  hasOwnProperty,
  isUndefined,
  isDefined,
  isNotSet,
  isSet,
  valueOrDefault
};
