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

define((require) => {
  'use strict';

  const network = require('client/network/network');
  const ModuleManager = require('client/modules/module_manager');
  const debug = require('client/util/debug');
  const info = require('client/util/info');
  const monitor = require('client/monitoring/monitor');
  const location = require('client/util/location');

  debug.enable('wall:*');

  // Open our socket to the server.
  network.openConnection(info.virtualRectNoBezel);

  if (location.monitor) {
    monitor.enable();
  }

  // Ready to receive some code!
  var manager = new ModuleManager();
  manager.start();
});
