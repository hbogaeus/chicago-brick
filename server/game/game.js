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

'use strict';
/**
 * @fileoverview Game management for the video wall.
 *
 * Creating a game:
 *
 * 1. Create a game instance.  Options is an optional object with the following
 *    possible properties:
 *     - maxPlayers: Number (default: 4)
 *     - colors: Array<string>, list of css colors. Length must be >=
 *       maxPlayers (default: 4 google logo colors).
 *
 *    // game is available as a global with one method: create().
 *    let mygame = game.create('MyGame', options);
 *
 * 2. Player info (index, controls, etc) is available from the player instances
 *    stored in Game.players.
 *
 *    let players = mygame.players;    // Sparse array of players by index.
 *    let playerMap = mygame.players;  // Map playerId -> player
 *
 *    // Each player has an assigned index (0 - maxPlayers - 1) and an assigned
 *    // css color string.
 *    let playerFoo = mygame.playerMap[playerFooId];
 *    playerFoo.color;  // -> '#4285F4'
 *    playerFoo.index;  // -> 0;
 *
 *    let player1 = mygame.players[1];  // Will be undefined in < 2 players.
 *
 *    // Controls is a map of input -> boolean. Available controls are up, down,
 *    // left, right, a, b, x, y.
 *    if (player1.controls.x) { doSomething(); };
 *
 *
 * 3. To manage per-player state in your module, listen for lifecycle events:
 *    (playerJoin, playerQuit).  It is fine to hang onto player references.
 *    Their controls fields will be updated asynchronously and you can just read
 *    them during tick() invocations.
 *
 *    mygame.on('playerJoin', (player) => { setUpPlayer(player) });
 *    mygame.on('playerQuit', (player) => { cleanUpPlayer(player) });
 *
 *    // There is also a controlsUpdate event if you need to do something more
 *    // complicated.
 *    mygame.on('controlsUpdate', (player) => { doSomething(player) });
 *
 * Games can be played by visiting the game server from a computer or mobile
 * device. They are listed by host + game in the dropdown while the game is on
 * a wall somewhere.
 */

const ioClient = require('socket.io-client');
const debug = require('debug')('wall:game');
const os = require('os');
const _ = require('underscore');
const util = require('util');
const EventEmitter = require('events');

/**
 * An individual player.
 * Clients get a player instance from the player map (Game.players) or by
 * listening to one of the lifecycle events on the game instance itself.
 * Controls are updated asynchronously and can be read directly in server module
 * code.
 */
let Player = (playerId, index, color) => {
  this.id = playerId;
  this.index = index;
  this.color = color;
  this.score = 0;
  this.controls = {};
};


/**
 * This class is returned to clients who create a game using
 * GameManager.create(). Player instances are available in Game.players and
 * lifecycle events are emitted by instances of this class.  Games are
 * automatically cleaned up when modules are torn down.
 */
let Game = (socket, host, name, opt_options) => {
  EventEmitter.call(this);
  let options = opt_options || {};

  let maxPlayers = options.maxPlayers || 4;
  let colors = options.colors || ['#4285F4', '#34A853', '#FBBC05', '#EA4335'];

  if (!colors.length || colors.length < 4) {
    throw new Error(
      `Invalid game options: ${options.maxPlayers} players and ${colors.length} colors.`
    );
  }

  let players = _.map(_.range(maxPlayers), _.constant(undefined));
  let playerMap = {};
  let gameStateInterval = null;

  let game = this;
  this.players = players;
  this.playerMap = playerMap;

  function sendGameState() {
    socket.emit('gameState', {
      // Sending controls back makes no sense.
      players: _.map(game.players, (p) => {
        return _.omit(p, 'controls');
      }),
    });
  }

  function onConnect() {
    debug('Connected to game server.');
    // TODO: rename this to gameReady.
    socket.emit('serverReady', {host: host, name: name});
    gameStateInterval = setInterval(sendGameState, 1000);
  }

  function onDisconnect() {
    debug('Disconnected from game server.');
    clearInterval(gameStateInterval);
  }

  function provisionPlayer(playerId) {
    let slot = _.findIndex(players, (s) => { return !s; });
    if (slot == -1) {
      debug('Too many players: ', playerId);
      socket.emit('errorMsg', 'Too many players.', playerId);
    } else {
      let color = colors[slot];
      let player = new Player(playerId, slot, color);
      players[slot] = player;
      playerMap[playerId] = player;

      debug('Player ready: ', playerId);
      socket.emit('playerReady', player);
      game.emit('playerJoin', player);
    }
  }

  function removePlayer(playerId) {
    debug('Removing player: ' + playerId);
    let player = playerMap[playerId];
    delete playerMap[playerId];
    delete players[player.index];
    game.emit('playerQuit', player);
  }

  function setControls(playerId, controls) {
    if (playerMap[playerId]) {
      _.extend(playerMap[playerId].controls, controls);
      game.emit('controlsUpdate', playerMap[playerId]);
    }
  }

  function setPlayerName(playerId, name) {
    if (playerMap[playerId]) {
      debug("Setting Name.");
      playerMap[playerId].name = name;
    }
  }

  // Hook up listeners.
  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);

  // TODO: Remove players that quit (heartbeat?).
  socket.on('playerJoin', provisionPlayer);
  socket.on('playerExit', removePlayer);
  socket.on('playerName', setPlayerName);
  socket.on('control', setControls);
};
util.inherits(Game, EventEmitter);

let host = '';
module.exports = {
  init: (flags) => {
    host = flags.game_server_host;
  },
  forModule: (forModule) => {
    let connections = [];
    let games = [];

    return {
      // Called by module code to add a game. Returns a new Game.
      create: (gameName, options) => {
        debug('Connecting to game server.');
        let client = ioClient(`http://${host}/servers`, {multiplex: false});
        connections.push(client);

        let game = new Game(client, os.hostname(), gameName, options);
        games.push(game);
        return game;
      },

      // Called when module is finished.
      dispose: () => {
        _.invoke(connections, 'close');
      }
    };
  }
};
