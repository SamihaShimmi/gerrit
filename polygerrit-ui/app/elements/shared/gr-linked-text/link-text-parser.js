/**
 * @license
 * Copyright (C) 2015 The Android Open Source Project
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

import {BaseUrlBehavior} from '../../../behaviors/base-url-behavior/base-url-behavior.js';

(function() {
  'use strict';
  /**
   * Pattern describing URLs with supported protocols.
   *
   * @type {RegExp}
   */
  const URL_PROTOCOL_PATTERN = /^(.*)(https?:\/\/|mailto:)/;

  /**
   * Construct a parser for linkifying text. Will linkify plain URLs that appear
   * in the text as well as custom links if any are specified in the linkConfig
   * parameter.
   *
   * @constructor
   * @param {Object|null|undefined} linkConfig Comment links as specified by the
   *     commentlinks field on a project config.
   * @param {Function} callback The callback to be fired when an intermediate
   *     parse result is emitted. The callback is passed text and href strings
   *     if a link is to be created, or a document fragment otherwise.
   * @param {boolean|undefined} opt_removeZeroWidthSpace If true, zero-width
   *     spaces will be removed from R=<email> and CC=<email> expressions.
   */
  function GrLinkTextParser(linkConfig, callback, opt_removeZeroWidthSpace) {
    this.linkConfig = linkConfig;
    this.callback = callback;
    this.removeZeroWidthSpace = opt_removeZeroWidthSpace;
    this.baseUrl = BaseUrlBehavior.getBaseUrl();
    Object.preventExtensions(this);
  }

  /**
   * Emit a callback to create a link element.
   *
   * @param {string} text The text of the link.
   * @param {string} href The URL to use as the href of the link.
   */
  GrLinkTextParser.prototype.addText = function(text, href) {
    if (!text) { return; }
    this.callback(text, href);
  };

  /**
   * Given the source text and a list of CommentLinkItem objects that were
   * generated by the commentlinks config, emit parsing callbacks.
   *
   * @param {string} text The chuml of source text over which the outputArray
   *     items range.
   * @param {!Array<Gerrit.CommentLinkItem>} outputArray The list of items to add
   *     resulting from commentlink matches.
   */
  GrLinkTextParser.prototype.processLinks = function(text, outputArray) {
    this.sortArrayReverse(outputArray);
    const fragment = document.createDocumentFragment();
    let cursor = text.length;

    // Start inserting linkified URLs from the end of the String. That way, the
    // string positions of the items don't change as we iterate through.
    outputArray.forEach(item => {
      // Add any text between the current linkified item and the item added
      // before if it exists.
      if (item.position + item.length !== cursor) {
        fragment.insertBefore(
            document.createTextNode(
                text.slice(item.position + item.length, cursor)),
            fragment.firstChild);
      }
      fragment.insertBefore(item.html, fragment.firstChild);
      cursor = item.position;
    });

    // Add the beginning portion at the end.
    if (cursor !== 0) {
      fragment.insertBefore(
          document.createTextNode(text.slice(0, cursor)), fragment.firstChild);
    }

    this.callback(null, null, fragment);
  };

  /**
   * Sort the given array of CommentLinkItems such that the positions are in
   * reverse order.
   *
   * @param {!Array<Gerrit.CommentLinkItem>} outputArray
   */
  GrLinkTextParser.prototype.sortArrayReverse = function(outputArray) {
    outputArray.sort((a, b) => b.position - a.position);
  };

  /**
   * Create a CommentLinkItem and append it to the given output array. This
   * method can be called in either of two ways:
   * - With `text` and `href` parameters provided, and the `html` parameter
   *   passed as `null`. In this case, the new CommentLinkItem will be a link
   *   element with the given text and href value.
   * - With the `html` paremeter provided, and the `text` and `href` parameters
   *   passed as `null`. In this case, the string of HTML will be parsed and the
   *   first resulting node will be used as the resulting content.
   *
   * @param {string|null} text The text to use if creating a link.
   * @param {string|null} href The href to use as the URL if creating a link.
   * @param {string|null} html The html to parse and use as the result.
   * @param {number} position The position inside the source text where the item
   *     starts.
   * @param {number} length The number of characters in the source text
   *     represented by the item.
   * @param {!Array<Gerrit.CommentLinkItem>} outputArray The array to which the
   *     new item is to be appended.
   */
  GrLinkTextParser.prototype.addItem =
      function(text, href, html, position, length, outputArray) {
        let htmlOutput = '';

        if (href) {
          const a = document.createElement('a');
          a.href = href;
          a.textContent = text;
          a.target = '_blank';
          a.rel = 'noopener';
          htmlOutput = a;
        } else if (html) {
          const fragment = document.createDocumentFragment();
          // Create temporary div to hold the nodes in.
          const div = document.createElement('div');
          div.innerHTML = html;
          while (div.firstChild) {
            fragment.appendChild(div.firstChild);
          }
          htmlOutput = fragment;
        }

        outputArray.push({
          html: htmlOutput,
          position,
          length,
        });
      };

  /**
   * Create a CommentLinkItem for a link and append it to the given output
   * array.
   *
   * @param {string|null} text The text for the link.
   * @param {string|null} href The href to use as the URL of the link.
   * @param {number} position The position inside the source text where the link
   *     starts.
   * @param {number} length The number of characters in the source text
   *     represented by the link.
   * @param {!Array<Gerrit.CommentLinkItem>} outputArray The array to which the
   *     new item is to be appended.
   */
  GrLinkTextParser.prototype.addLink =
      function(text, href, position, length, outputArray) {
        if (!text || this.hasOverlap(position, length, outputArray)) { return; }
        if (!!this.baseUrl && href.startsWith('/') &&
             !href.startsWith(this.baseUrl)) {
          href = this.baseUrl + href;
        }
        this.addItem(text, href, null, position, length, outputArray);
      };

  /**
   * Create a CommentLinkItem specified by an HTMl string and append it to the
   * given output array.
   *
   * @param {string|null} html The html to parse and use as the result.
   * @param {number} position The position inside the source text where the item
   *     starts.
   * @param {number} length The number of characters in the source text
   *     represented by the item.
   * @param {!Array<Gerrit.CommentLinkItem>} outputArray The array to which the
   *     new item is to be appended.
   */
  GrLinkTextParser.prototype.addHTML =
      function(html, position, length, outputArray) {
        if (this.hasOverlap(position, length, outputArray)) { return; }
        if (!!this.baseUrl && html.match(/<a href=\"\//g) &&
             !new RegExp(`<a href="${this.baseUrl}`, 'g').test(html)) {
          html = html.replace(/<a href=\"\//g, `<a href=\"${this.baseUrl}\/`);
        }
        this.addItem(null, null, html, position, length, outputArray);
      };

  /**
   * Does the given range overlap with anything already in the item list.
   *
   * @param {number} position
   * @param {number} length
   * @param {!Array<Gerrit.CommentLinkItem>} outputArray
   */
  GrLinkTextParser.prototype.hasOverlap =
      function(position, length, outputArray) {
        const endPosition = position + length;
        for (let i = 0; i < outputArray.length; i++) {
          const arrayItemStart = outputArray[i].position;
          const arrayItemEnd = outputArray[i].position + outputArray[i].length;
          if ((position >= arrayItemStart && position < arrayItemEnd) ||
        (endPosition > arrayItemStart && endPosition <= arrayItemEnd) ||
        (position === arrayItemStart && position === arrayItemEnd)) {
            return true;
          }
        }
        return false;
      };

  /**
   * Parse the given source text and emit callbacks for the items that are
   * parsed.
   *
   * @param {string} text
   */
  GrLinkTextParser.prototype.parse = function(text) {
    if (text) {
      linkify(text, {
        callback: this.parseChunk.bind(this),
      });
    }
  };

  /**
   * Callback that is pased into the linkify function. ba-linkify will call this
   * method in either of two ways:
   * - With both a `text` and `href` parameter provided: this indicates that
   *   ba-linkify has found a plain URL and wants it linkified.
   * - With only a `text` parameter provided: this represents the non-link
   *   content that lies between the links the library has found.
   *
   * @param {string} text
   * @param {string|null|undefined} href
   */
  GrLinkTextParser.prototype.parseChunk = function(text, href) {
    // TODO(wyatta) switch linkify sequence, see issue 5526.
    if (this.removeZeroWidthSpace) {
      // Remove the zero-width space added in gr-change-view.
      text = text.replace(/^(CC|R)=\u200B/gm, '$1=');
    }

    // If the href is provided then ba-linkify has recognized it as a URL. If
    // the source text does not include a protocol, the protocol will be added
    // by ba-linkify. Create the link if the href is provided and its protocol
    // matches the expected pattern.
    if (href) {
      const result = URL_PROTOCOL_PATTERN.exec(href);
      if (result) {
        const prefixText = result[1];
        if (prefixText.length > 0) {
          // Fix for simple cases from
          // https://bugs.chromium.org/p/gerrit/issues/detail?id=11697
          // When leading whitespace is missed before link,
          // linkify add this text before link as a schema name to href.
          // We suppose, that prefixText just a single word
          // before link and add this word as is, without processing
          // any patterns in it.
          this.parseLinks(prefixText, []);
          text = text.substring(prefixText.length);
          href = href.substring(prefixText.length);
        }
        this.addText(text, href);
        return;
      }
    }
    // For the sections of text that lie between the links found by
    // ba-linkify, we search for the project-config-specified link patterns.
    this.parseLinks(text, this.linkConfig);
  };

  /**
   * Walk over the given source text to find matches for comemntlink patterns
   * and emit parse result callbacks.
   *
   * @param {string} text The raw source text.
   * @param {Object|null|undefined} patterns A comment links specification
   *   object.
   */
  GrLinkTextParser.prototype.parseLinks = function(text, patterns) {
    // The outputArray is used to store all of the matches found for all
    // patterns.
    const outputArray = [];
    for (const p in patterns) {
      if (patterns[p].enabled != null && patterns[p].enabled == false) {
        continue;
      }
      // PolyGerrit doesn't use hash-based navigation like the GWT UI.
      // Account for this.
      if (patterns[p].html) {
        patterns[p].html =
            patterns[p].html.replace(/<a href=\"#\//g, '<a href="/');
      } else if (patterns[p].link) {
        if (patterns[p].link[0] == '#') {
          patterns[p].link = patterns[p].link.substr(1);
        }
      }

      const pattern = new RegExp(patterns[p].match, 'g');

      let match;
      let textToCheck = text;
      let susbtrIndex = 0;

      while ((match = pattern.exec(textToCheck)) != null) {
        textToCheck = textToCheck.substr(match.index + match[0].length);
        let result = match[0].replace(pattern,
            patterns[p].html || patterns[p].link);

        if (patterns[p].html) {
          let i;
          // Skip portion of replacement string that is equal to original to
          // allow overlapping patterns.
          for (i = 0; i < result.length; i++) {
            if (result[i] !== match[0][i]) { break; }
          }
          result = result.slice(i);

          this.addHTML(
              result,
              susbtrIndex + match.index + i,
              match[0].length - i,
              outputArray);
        } else if (patterns[p].link) {
          this.addLink(
              match[0],
              result,
              susbtrIndex + match.index,
              match[0].length,
              outputArray);
        } else {
          throw Error('linkconfig entry ' + p +
              ' doesn’t contain a link or html attribute.');
        }

        // Update the substring location so we know where we are in relation to
        // the initial full text string.
        susbtrIndex = susbtrIndex + match.index + match[0].length;
      }
    }
    this.processLinks(text, outputArray);
  };

  window.GrLinkTextParser = GrLinkTextParser;
})();
