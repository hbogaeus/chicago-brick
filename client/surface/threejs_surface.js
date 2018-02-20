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
  'use strict';
  
  const Surface = require('client/surface/surface');
  const THREE = require('three');

  class ThreeJsSurface extends Surface {
    constructor(container, wallGeometry, properties) {
      super(container, wallGeometry);
      this.renderer = new THREE.WebGLRenderer(properties);
      this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
      container.appendChild(this.renderer.domElement);

      this.camera = new THREE.PerspectiveCamera(45, this.wallRect.w / this.wallRect.h, 0.1, 1000);
      this.scene = new THREE.Scene;

      this.camera.setViewOffset(
          this.wallRect.w, this.wallRect.h,
          this.virtualRect.x, this.virtualRect.y,
          this.virtualRect.w, this.virtualRect.h);
    }

    setTileViewOffsetForCamera(camera) {
      const cam = camera || this.camera;
      cam.setViewOffset(
          this.wallRect.w, this.wallRect.h,
          this.virtualRect.x, this.virtualRect.y,
          this.virtualRect.w, this.virtualRect.h);
    }

    destroy() {
      this.renderer.dispose();
      this.renderer = null;
      this.camera = null;
      this.scene = null;
    }

    setOpacity(alpha) {
      this.renderer.domElement.style.opacity = alpha;
    }

    render() {
      this.renderer.render(this.scene, this.camera);
    }
  }

  return ThreeJsSurface;
});
