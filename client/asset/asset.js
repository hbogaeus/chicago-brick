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

define(require => {
  "use strict";

  const parsedLocation = require('client/util/location');

  const LOCAL_ASSET_PATH = 'http://127.0.0.1:8080/';

  return name => {
    if (parsedLocation.useLocalAssets) {
      return `${LOCAL_ASSET_PATH}${name}`;
    }
    // By default, we pass the pass-through.
    return `/asset/${name}`;
  };
});
