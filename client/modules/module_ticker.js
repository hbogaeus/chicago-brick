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
  const time = require('client/util/time');
  const debug = require('client/util/debug')('wall:module_ticker');
  const error = require('client/util/log').error(debug);
  const monitor = require('client/monitoring/monitor');

  // An array of {module:Module, globals:Object}.
  let modulesToDraw = [];

  // Drawing loop.
  let lastTime = 0;
  function draw() {
    let now = time.now();
    let delta = now - lastTime;

    modulesToDraw.forEach((pair) => {
      try {
        pair.module.draw(now, delta);
      } catch (e) {
        error(e);
      }
    });

    lastTime = now;
    window.requestAnimationFrame(draw);
  }
  window.requestAnimationFrame(draw);

  return {
    add: (name, module, globals) => {
      modulesToDraw.push({name, module, globals});
      debug(`Add: We are now drawing ${modulesToDraw.length} modules`);
      monitor.markDrawnModules(modulesToDraw.map(m => m.name));
    },
    remove: (module) => {
      modulesToDraw = modulesToDraw.filter(pair => pair.module !== module);
      debug(`Remove: We are now drawing ${modulesToDraw.length} modules`);
      monitor.markDrawnModules(modulesToDraw.map(m => m.name));
    }
  };
});
