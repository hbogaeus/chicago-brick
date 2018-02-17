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
  const io = require('socket.io');
  const debug = require('client/util/debug')('wall:network');
  const info = require('client/util/info');
  let socket;

  let ready, readyPromise = new Promise(r => ready = r);

  return {
    // Open the connection with the server once the display properties are
    // known.
    openConnection : (opt_displayRect) => {
      socket = io(location.host);
      if (opt_displayRect) {
        socket.on('config', (config) => {
          socket.emit('config-response', opt_displayRect.serialize());
          ready();
        });
      }
    },
    on : (event, callback) => { socket.on(event, callback); },
    once : (event, callback) => { socket.once(event, callback); },
    removeListener : (event, callback) => {
      socket.removeListener(event, callback);
    },
    whenReady: readyPromise,
    send: (event, data) => {
      socket.emit(event, data);
    },
    forModule : (id) => {
      let moduleSocket;
      let externalNspName = `module${id.replace(/[^0-9]/g, 'X')}`;
      return {
        open: () => {
          let baseAddr = `${location.protocol}//${location.host}`;
          let addr = `${baseAddr}/${externalNspName}`;
          moduleSocket = io(addr, {
            multiplex: false,
            query: {
              id,
              rect: info.virtualRectNoBezel.serialize()
            }
          });
          debug(`Opened per-module socket @ ${externalNspName}`);
          return moduleSocket;
        },
        close: () => {
          debug(`Closed per-module socket @ ${externalNspName}`);
          moduleSocket.removeAllListeners();
          moduleSocket.close();
          moduleSocket = undefined;
        }
      };
    }
  };
});
