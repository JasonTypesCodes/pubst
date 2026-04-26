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
 * @summary Default logger that writes warnings to the console.
 *
 * @description
 * This is the default logger used by Pubst.  It formats warning messages
 * and writes them to the console via `console.warn`.
 */
class ConsoleLogger {

  /**
   * @summary Log a warning message to the console.
   *
   * @param {string} source - The source of the warning (e.g. `'Pubst.publish'`).
   * @param {string} message - The warning message.
   */
  warn(source, message) {
    console.warn(`WARNING | ${source} : ${message}`);
  }

}

export default ConsoleLogger;
