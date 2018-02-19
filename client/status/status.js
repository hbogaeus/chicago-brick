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
/* globals d3 */

let bgColors = [
  'red', 'blue', 'green', 'yellow',
];

// Returns a map of module name to number.
// 1 means the module exists in the config.
// > 1 means the module exists and is in a loaded playlist.
// Modules that are in the modules list, but not in a playlist aren't eligible
// for immediate playback, only for indefinite takeover.
function buildPlayableModuleMap(modules, config) {
  let playableModules = {};
  modules.forEach(
    module => playableModules[module.name] = 1
  );

  let playableCollections = {};
  config.current.playlist.forEach((playlist) => {
    if (playlist.collection === undefined) {
      modules.forEach(module => playableModules[module.name] += 1);
    } else if (playlist.collection == '__ALL__') {
      playableCollections.__ALL__ = [];
      modules.forEach(
        module => playableCollections.__ALL__.push(module.name)
      );
    } else {
      playableCollections[playlist.collection] = config.current.collections[playlist.collection];
    }
  });

  playableCollections.forEach( (collection) => {
    collection.forEach( (module) => {
    	 playableModules[module] += 1;
  	});
	});

  return playableModules;
}

function makeRequest(url, requestMethod, providedBody) {
  return new Request(url, {
      method: requestMethod,
      headers: {'content-type': 'application/json'},
      credentials: 'same-origin',
      body: providedBody
  });
}

function fetchJson(endpoint) {
  return fetch(makeRequest('/api/' + endpoint, 'GET'))
      .then(resp => resp.json());
}

/* exported BigBoard */
class BigBoard {
  constructor() {
    this.layout = null;
    this.clients = null;
    this.now = Infinity;
  }

  update() {
    let layoutReq = fetchJson('layout')
        .then(layout => this.layout = layout, err => {
          if (this.layout) {
            this.layout.state = null;
          }
        });
    let clientsReq = fetchJson('clients')
        .then(clients => this.clients = clients, err => {
          this.clients = [];
        });
    Promise.all([layoutReq, clientsReq]).then(() => this.render());

    fetchJson('errors').then(errors => this.showErrors(errors));
  }

  renderError(e) {
    let date = new Date(e.timestamp).toLocaleString();
    return `${date} ${e.origin} ${e.namespace} ${e.message}`;
  }

  showErrors(errors) {
    let items = d3.select('#errors')
        .selectAll('.line')
        .data(errors, error => error.timestamp);
    items.enter().append('div')
      .attr('class', 'line')
      .attr('title', error => error.stack)
      .text(this.renderError)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .order();
    items.exit().remove();
  }

  setNow(n) {
    this.now = n;
  }

  render() {
    let wall = this.layout.wall;
    let width, height, maxSize;
    if (wall.extents.w > wall.extents.h) {
      width = window.innerWidth - 40;
      height = width * wall.extents.h / wall.extents.w;
      maxSize = width;
    } else {
      height = window.innerHeight - 40;
      width = height * wall.extents.w / wall.extents.h;
      maxSize = height;
    }

    let chart = d3.select('svg');
    chart.attr('width', width);
    chart.attr('height', height);

    let scale = d3.scale.linear()
        .domain([0, Math.max(wall.extents.w, wall.extents.h)])
        .range([0, maxSize]);
    let lineFromPoints = d3.svg.line()
        .x((pt) => scale(pt.x))
        .y((pt) => scale(pt.y));

    let clientKey = (d) => [d.rect.x, d.rect.y].join(',');
    let clients = chart.select('#clients').selectAll('.client')
        .data(this.clients, clientKey);
    let g = clients.enter().append('g').attr('class', 'client');
    g.append('rect')
        .attr('stroke', '#ccc')
        .attr('fill', 'none')
        .attr('x', (d) => scale(d.rect.x))
        .attr('y', (d) => scale(d.rect.y))
        .attr('width', (d) => scale(d.rect.w))
        .attr('height', (d) => scale(d.rect.h));
    g.append('text')
        .attr('x', (d) => scale(d.rect.x) + 5)
        .attr('y', (d) => scale(d.rect.y) + 20);
    clients.select('text')
        .text((d) => d.module);
    clients.exit().remove();

    // TODO(jacobly): not sure this is the right way to bind a single value.
    let wallGeo = chart.selectAll('.wall').data([wall]);
    wallGeo.enter().append('path')
        .attr('class', 'wall')
        .attr('stroke', 'black')
        .attr('stroke-width', '2')
        .attr('fill', 'none');
    wallGeo
        .attr('d', lineFromPoints(wall.points));

    let layout = chart.select('#outline').data([this.layout]);
    layout.append('text')
        .attr('stroke', 'gray')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle');
    layout.select('text')
        .text(l => {
          let r = l.state;
          if (l.deadline !== null && l.deadline !== Infinity) {
            r += ': ' + (l.deadline - this.now).toFixed(2);
          }
          return r;
        })
        .attr('x', d => {
          let bbox = chart[0][0].getBBox();
          return bbox.x + bbox.width / 2;
        })
        .attr('y', d => {
          let bbox = chart[0][0].getBBox();
          return bbox.y + bbox.height / 2;
        });
  }
}

let board = new BigBoard();
board.update();
setInterval(() => board.update(), 5000);

requirejs(['/config.js'], (require) => {
  requirejs(['client/network/network',
             'client/util/time'], (network, time) => {
    network.openConnection();
    time.start();
    setInterval(() => {
      if (board) {
        board.setNow(time.now());
      }
    }, 100);
  });
});

Promise.all([fetchJson('modules'), fetchJson('config')]).then(bits => {
  const [modules, config] = bits;

  // Reload the current JSON configuration.
  document.forms[0].config.value = JSON.stringify(
      config.current, null, '  ');

  let modulesInPlaylist = buildPlayableModuleMap(modules, config);

  // Draw the list of available modules in the "play immediately" section.
  let module_list = document.getElementById('module_list');
  modules.forEach((module) => {
    let li = document.createElement('li');
    if (modulesInPlaylist[module.name] > 1) {
      const a = document.createElement('a');
      a.id = 'module_' + module.name;
      a.addEventListener('click', () => {
        fetch(makeRequest(`/api/play?module=${module.name}`, 'POST', ''));
      });
      a.textContent = module.name;
      li.appendChild(a);
    } else {
      const m = document.createElement('span');
      m.textContent = `${module.name} (not in a playlist)`;
      li.appendChild(m);
    }

    let a2 = document.createElement("a");
    a2.id = `forever_module_${module.name}`;
    a2.addEventListener('click', () => {
      fetch(makeRequest('/api/playlist', 'POST', JSON.stringify(module))).then((res) => {
        if (res.ok && res.redirected) {
          document.location = res.url;
        }
      });
    });
    a2.textContent = `(play ${module.name} indefinitely)`;
    li.appendChild(a2);

    module_list.appendChild(li);
  });
});
