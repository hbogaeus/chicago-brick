/* Copyright 2018 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

/**
 * Displays messages as an on-screen overlay.
 */
define((require) => {
  'use strict';

  function display(html, position) {
    var container = document.getElementById('message-' + position);
    if (!container) {
      container = document.createElement('div');
      container.className = 'messageOverlay ' + position;
      document.body.appendChild(container);
    }
    container.innerHTML = html;
  }

  return {
    display: display,
  };
});
