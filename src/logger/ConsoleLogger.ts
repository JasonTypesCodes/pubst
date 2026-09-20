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

import type { Logger } from '../types.js';

/**
 * Default logger.  Writes warnings to the console via `console.warn`.
 */
class ConsoleLogger implements Logger {

  /**
   * Log a warning message to the console.
   *
   * @param source - Where the warning came from, e.g. `'Pubst.publish'`.
   * @param message - The warning text.
   */
  warn(source: string, message: string): void {
    console.warn(`WARNING | ${source} : ${message}`);
  }

}

export default ConsoleLogger;
