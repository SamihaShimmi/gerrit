/**
 * @license
 * Copyright (C) 2018 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const SAFE_URL_PATTERN = /^(https?:\/\/|mailto:|[^:/?#]*(?:[/?#]|$))/i;

/**
 * Wraps a string to be used as a URL. An error is thrown if the string cannot
 * be considered safe.
 */
class SafeUrl {
  private readonly _url: string;

  constructor(url: string) {
    if (!SAFE_URL_PATTERN.test(url)) {
      throw new Error(`URL not marked as safe: ${url}`);
    }
    this._url = url;
  }

  toString() {
    return this._url;
  }
}

export const _testOnly_SafeUrl = SafeUrl;

/**
 * Get the string representation of the safe URL.
 */
export function safeTypesBridge(value: unknown, type: string): unknown {
  // If the value is being bound to a URL, ensure the value is wrapped in the
  // SafeUrl type first. If the URL is not safe, allow the SafeUrl constructor
  // to surface the error.
  if (type === 'URL') {
    let safeValue = null;
    if (value instanceof SafeUrl) {
      safeValue = value;
    } else if (typeof value === 'string') {
      safeValue = new SafeUrl(value);
    }
    if (safeValue) {
      return safeValue.toString();
    }
  }

  // If the value is being bound to a string or a constant, then the string
  // can be used as is.
  if (type === 'STRING' || type === 'CONSTANT') {
    return value;
  }

  // Otherwise fail.
  throw new Error(`Refused to bind value as ${type}: ${value}`);
}
