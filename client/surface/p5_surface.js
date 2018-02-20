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
  require('p5.dom');
  const Surface = require('client/surface/surface');
  const P5 = require('p5');

  // Sets up the sizes and scaling factors. The P5 library will take care of creating a canvas.
  // sketch is the actual p5.js code that will be executed.  sketch.setup() will be called at
  // the end of the wall-provided setup() method and draw() will be invoked as well.
  // sketchArgs will be passed along to the constructor call on providedSketchClass.

  class P5Surface extends Surface {
    constructor(container, wallGeometry, providedSketchClass, startTime, sketchConstructorArgs) {
      super(container, wallGeometry);

      this.realPixelScalingFactors = {
        x : this.container.offsetWidth / this.virtualRect.w,
        y : this.container.offsetHeight / this.virtualRect.h,
      };

      this.startTime = startTime;
      const randomSeed = this.startTime || 0;

      const processing_canvas_width = this.container.offsetWidth;
      const processing_canvas_height = this.container.offsetHeight;

      const xScale = this.realPixelScalingFactors.x;
      const yScale = this.realPixelScalingFactors.y;

      const wallWidth = this.wallRect.w;
      const wallHeight = this.wallRect.h;

      const xOffset = this.virtualRect.x;
      const yOffset = this.virtualRect.y;

      this.sketch = null;

      const surface = this;

      // p5 must be a P5.js instance.  new P5(...) below takes care of this.
      const scaffolding = (p5) => {
        surface.sketch = new providedSketchClass(p5, surface, sketchConstructorArgs);

        p5.wallWidth = wallWidth;
        p5.wallHeight = wallHeight;

        p5.preload = () => {
          if (typeof(surface.sketch.preload) == "function") {
            surface.sketch.preload(p5);
          }
        };

        p5.setup = () => {
          // Videowall required setup.
          p5.createCanvas(processing_canvas_width, processing_canvas_height, p5.webgl);
          p5.scale(xScale, yScale);
          p5.noLoop();
          p5.translate(-xOffset, -yOffset);
          p5.randomSeed(randomSeed);

          surface.sketch.setup(p5);
        };

        p5.draw = surface.sketch.draw.bind(surface.sketch);

        p5.frameRate(60);
      };

      this.p5 = new P5(scaffolding, container);
    }

    destroy() {
      if (this.p5) {
        this.p5.remove();
      }
    }
  }

  return P5Surface;
});
