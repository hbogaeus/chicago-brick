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

// A handy wrapper around peer.js that makes it easy for client modules to
// connect to one another.
define((require) => {
  'use strict';
  require('lib/promise');
  const _ = require('underscore');
  const Peer = require('peer');
  const info = require('client/util/info');
  const debug = require('client/util/debug')('wall:peer');

  function sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '-');
  }

  function makeName(id, x, y) {
    return sanitizeName(`${id}-${x}-${y}`);
  }

  // Wraps a PeerJS peer to provide a better API to connect to wall clients.
  function PeerWrapper(moduleId, peer) {
    this.moduleId_ = moduleId;
    this.peer_ = peer;
  }
  // Opens a connection with a different client. Returns a Promise that will
  // be resolved with a peerjs connection object, on which one can listen for
  // and receive messages. If the specified peer isn't found, the peer is
  // assumed to not yet be online, and so we retry periodically with a doubling
  // backoff until we connect (logging each time we retry). We never reject the
  // promise. If relative is true, x,y are added to my offset when referencing
  // the other client.
  PeerWrapper.prototype.connect = (x, y, relative, onOpen, onClose) => {
    let otherX = relative ? info.virtualOffset.x + x : x;
    let otherY = relative ? info.virtualOffset.y + y : y;
    // Generate name of peer we're trying to connect to.
    let otherPeerName = makeName(this.moduleId_, otherX, otherY);

    // Attempt to connect.
    // If we fail, go back to start.
    // If we succeed, add a retry handler installer, with has the following
    // contract:
    //   If we close the connection, call the handler.
    //     If the handler returns true, increase the delay, go back to start.
    //     If the handler returns false, stop.

    let connectionAttempts = 0;
    let retryDelay = 500;
    let connectFunc = () => {
      if (!this.peer_) {
        if (connectionAttempts > 0) {
          debug('Aborted connection retry due to external close!');
        } else {
          debug('Aborted initial retry due to external close!');
        }
        return;
      }
      connectionAttempts++;
      let conn = this.peer_.connect(otherPeerName, {reliable: true});
      conn.on('open', () => {
        if (!this.peer_) {
          // We're disconnecting.
          return;
        }

        // Reset retry delay.
        retryDelay = 500;

        conn.on('close', () => {
          if (!this.peer_) {
            // We're disconnecting.
            return;
          }
          // WHOA! We unexpected closed!
          debug(`Connection to peer ${otherPeerName} dropped!`);
          if (onClose(conn)) {
            // Retry!
            connectFunc();
          }
        });

        debug(`Established connection to peer ${otherPeerName}`);
        onOpen(conn);
      });
      conn.on('error', (err) => {
        if (!this.peer_) {
          // We're disconnecting.
          return;
        }
        retryDelay = Math.min(retryDelay * 2, 10000);
        if (connectionAttempts == 1) {
          debug(`Failed connecting to initial peer ${otherPeerName} retry in ${retryDelay}`, err);
        } else {
          debug(`Failed reconnecting to peer ${otherPeerName} retry in ${retryDelay}`, err);
        }
        Promise.delay(retryDelay).then(connectFunc);
      });
    };
    connectFunc();
  };
  // Listens for a connection from any other client. Returns a Promise that is
  // resolved with the new connection to that client.
  PeerWrapper.prototype.listen = (cb) => {
    this.peer_.on('connection', (conn) => {
      let bits = conn.peer.split('-');
      cb(conn, parseInt(bits[2]), parseInt(bits[3]));
    });
  };
  // Closes any peer connections & disconnects from the server.
  PeerWrapper.prototype.close = () => {
    this.peer_.disconnect();
    this.peer_ = null;
  };

  // Oh man, this function is useful.
  // Connects to each of our 8 neighbors, provided that they exist, using the
  // same connection semantics as .connect (including retries, restablishment
  // of dropped connections, etc.). We maintain a list of currently-connected
  // clients, which are tuples containing the x,y of the client & a valid
  // connection object, and expose this via our return value. We also
  // require users to pass in a function that describes what to happen when
  // data arrives on a connection.
  PeerWrapper.prototype.connectToNeighbors = (onData) => {
    // Create a list of clients that we'll track.
    let clients = [];

    let findExistingClient = (x, y) => {
      return _(clients).find((client) => {
        return client.x == x && client.y == y;
      });
    };

    let installDataHandler = (conn) => {
      conn.on('data', (data) => onData(conn, data));
    };

    let handleNewConnection = (conn, x, y) => {
      let existingClient = findExistingClient(x, y);
      if (existingClient) {
        // If we already have a connection, we need to pick one. Connections
        // have an id, so we'll drop the one with the bigger id, and keep the
        // once with the smaller.
        if (existingClient.conn.id > conn.id) {
          debug(`Already connected to client ${x},${y}. Will drop existing.`);
          // Close old connection, keep new one.
          existingClient.conn.close();
          existingClient.conn = conn;
          installDataHandler(conn);
        } else {
          debug(`Already connected to client ${x},${y}. Will drop new.`);
          // Close this connection, keep old one.
          conn.close();
        }
      } else {
        // New connection!
        clients.push({x: x, y: y, conn});
        debug(`Connected to ${x},${y}`);
        installDataHandler(conn);
      }
    };

    // Before connecting to neighbors. Install a listener that handles new
    // connection attempts.
    this.listen((conn, x, y) => {
      debug(`Connection request from ${x},${y}`);
      handleNewConnection(conn, x, y);
    });

    debug('Connecting to neighbors.');
    [-1, 0, 1].forEach((x) => {
      [-1, 0, 1].forEach((y) => {
        if (x == 0 && y == 0) {
          return;
        }

        // Calculate neighbor coords.
        let nx = x + info.virtualOffset.x;
        let ny = y + info.virtualOffset.y;

        this.connect(nx, ny, false, (conn) => {
          debug(`Connection established to ${nx},${ny}`);
          handleNewConnection(conn, nx, ny);
        }, (conn) => {
          debug(`Disconnected from ${nx},${ny}`);
          let index = clients.findIndex((client) => {
            return client.conn.id == conn.id;
          });
          if (index > -1) {
            clients.splice(index, 1);
          }
        });
      });
    });

    return clients;
  };

  return {
    // Opens a connection with the server (to find peers). The name passed-in
    // should be unique among all peers that you want to talk with. As peerjs
    // requires alphanumeric names, we'll strip out characters that don't fit
    // that regex. Returns a Promise that is resolved to a PeerWrapper or
    // rejects with an error.
    open: (moduleId) => {
      let name = makeName(moduleId, info.virtualOffset.x, info.virtualOffset.y);
      return new Promise((resolve, reject) => {
        let peer = new Peer(name, {
          host: window.location.hostname,
          port: 9000,
          path: '/peerjs'
        });
        peer.on('open', (id) => {
          debug(`Opened peer connection with id ${id}`);
          resolve(new PeerWrapper(moduleId, peer));
        });
        peer.on('error', (e) => {
          reject(e);
        });
      });
    }
  };
});
