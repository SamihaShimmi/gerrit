/**
 * @license
 * Copyright (C) 2016 The Android Open Source Project
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

import '../../../test/common-test-setup-karma.js';
import './gr-diff-preferences.js';

const basicFixture = fixtureFromElement('gr-diff-preferences');

suite('gr-diff-preferences tests', () => {
  let element;

  let diffPreferences;

  function valueOf(title, fieldsetid) {
    const sections = element.$[fieldsetid].querySelectorAll('section');
    let titleEl;
    for (let i = 0; i < sections.length; i++) {
      titleEl = sections[i].querySelector('.title');
      if (titleEl.textContent.trim() === title) {
        return sections[i].querySelector('.value');
      }
    }
  }

  setup(() => {
    diffPreferences = {
      context: 10,
      line_wrapping: false,
      line_length: 100,
      tab_size: 8,
      font_size: 12,
      show_tabs: true,
      show_whitespace_errors: true,
      syntax_highlighting: true,
      manual_review: false,
      ignore_whitespace: 'IGNORE_NONE',
    };

    stub('gr-rest-api-interface', {
      getDiffPreferences() {
        return Promise.resolve(diffPreferences);
      },
    });

    element = basicFixture.instantiate();

    return element.loadData();
  });

  test('renders', () => {
    // Rendered with the expected preferences selected.
    assert.equal(valueOf('Context', 'diffPreferences')
        .firstElementChild.bindValue, diffPreferences.context);
    assert.equal(valueOf('Fit to screen', 'diffPreferences')
        .firstElementChild.checked, diffPreferences.line_wrapping);
    assert.equal(valueOf('Diff width', 'diffPreferences')
        .firstElementChild.bindValue, diffPreferences.line_length);
    assert.equal(valueOf('Tab width', 'diffPreferences')
        .firstElementChild.bindValue, diffPreferences.tab_size);
    assert.equal(valueOf('Font size', 'diffPreferences')
        .firstElementChild.bindValue, diffPreferences.font_size);
    assert.equal(valueOf('Show tabs', 'diffPreferences')
        .firstElementChild.checked, diffPreferences.show_tabs);
    assert.equal(valueOf('Show trailing whitespace', 'diffPreferences')
        .firstElementChild.checked, diffPreferences.show_whitespace_errors);
    assert.equal(valueOf('Syntax highlighting', 'diffPreferences')
        .firstElementChild.checked, diffPreferences.syntax_highlighting);
    assert.equal(
        valueOf('Automatically mark viewed files reviewed', 'diffPreferences')
            .firstElementChild.checked, !diffPreferences.manual_review);
    assert.equal(valueOf('Ignore Whitespace', 'diffPreferences')
        .firstElementChild.bindValue, diffPreferences.ignore_whitespace);

    assert.isFalse(element.hasUnsavedChanges);
  });

  test('save changes', () => {
    sinon.stub(element.restApiService, 'saveDiffPreferences')
        .returns(Promise.resolve());
    const showTrailingWhitespaceCheckbox =
        valueOf('Show trailing whitespace', 'diffPreferences')
            .firstElementChild;
    showTrailingWhitespaceCheckbox.checked = false;
    element._handleShowTrailingWhitespaceTap();

    assert.isTrue(element.hasUnsavedChanges);

    // Save the change.
    return element.save().then(() => {
      assert.isFalse(element.hasUnsavedChanges);
    });
  });
});

