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
 * Defines a helper function for loading the Youtube API.
 */
define((require) => {
  'use strict';
  
  /** Returns a promise that resolves when the Youtube API is loaded. */
  function loadYoutubeApi() {
    return new Promise((resolve, reject) => {
      if (window.YT) {
        resolve();
      } else {
        let apiTag = document.createElement('script');
        apiTag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(apiTag);
        window.onYouTubeIframeAPIReady = resolve;
      }
    });
  }

  return loadYoutubeApi;
});
