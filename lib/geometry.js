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

(function(factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['lib/rectangle'], factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require('lib/rectangle'));
  }
}(function(Rectangle) {
  // A polygon!
  let Polygon = function(points) {
    this.points = points;
    this.extents = points.reduce((agg, p) => {
      if (p.x < agg.x) {
        agg.w += agg.x - p.x;
        agg.x = p.x;
      }
      if (p.y < agg.y) {
        agg.h += agg.y - p.y;
        agg.y = p.y;
      }
      if (p.x > agg.x + agg.w) {
        agg.w = p.x - agg.x;
      }
      if (p.y > agg.y + agg.h) {
        agg.h = p.y - agg.y;
      }
      return agg;
    }, new Rectangle(points[0].x, points[0].y, 0, 0));
  };
  Polygon.prototype.scale = function(xscale, yscale) {
    return new Polygon(this.points.map((pt) => ({
      x: Math.floor(pt.x * xscale),
      y: Math.floor(pt.y * yscale),
    })));
  };
  Polygon.prototype.translate = function(dx, dy) {
    return new Polygon(this.points.map((pt) => ({
      x: pt.x + dx,
      y: pt.y + dy,
    })));
  };
  Polygon.prototype.pairs = function() {
    let edges = [];
    for (var j = 0; j < this.points.length - 1; j++) {
      edges.push([this.points[j], this.points[j+1]]);
    }
    return edges;
  };
  Polygon.prototype.triples = function() {
    let triples = [];
    let lastPt = this.points[this.points.length - 2];
    for (var j = 0; j < this.points.length - 1; j++) {
      let thisPt = this.points[j];
      let nextPt = this.points[j+1];
      triples.push([lastPt, thisPt, nextPt]);
      lastPt = thisPt;
    }
    return triples;
  };
  // Returns an array of angles in degrees for each vertex on the polygon
  // Reimplementation of: http://stackoverflow.com/questions/28260962
  Polygon.prototype.angles = function() {
    let getAngle = (p1, p2, p3) => {
      let dot = (v1, v2) => {
        return v1[0] * v2[0] + v1[1] * v2[1];
      };

      const v1 = [p1.x - p2.x, p1.y - p2.y];
      const v2 = [p3.x - p2.x, p3.y - p2.y];
      const dot_prod = dot(v1, v2);
      const l1 = Math.sqrt(dot(v1, v1));
      const l2 = Math.sqrt(dot(v2, v2));
      const rads = Math.acos(dot_prod / l1 / l2);
      let degs = (rads / (2 * Math.PI) * 360) % 360;
      if (isNaN(degs)) {
        const u1 = [v1[0] / l1, v1[1] / l1];
        const u2 = [v2[0] / l2, v2[1] / l2];
        if (Math.abs(u1[0] + u2[0]) < 0.00001 && Math.abs(u1[1] + u2[1]) < 0.00001) {
          return 180;
        } else {
          console.log("got NaN angle", u1, u2);
        }
      }
      return degs;
    };
    let angles = [];
    const triples = this.triples();
    for (var i = 0; i < triples.length; i++) {
      const angle = getAngle(triples[i][0], triples[i][1], triples[i][2]);
      angles.push(angle);
    }
    return angles;
  };

  var geo = {
    Polygon: Polygon,
    polygonArea: function(polygon) {
      let sum = 0;
      for (var i=0; i < polygon.points.length - 1; i++) {
        let p1 = polygon.points[i];
        let p2 = polygon.points[i+1];
        sum += p1.x * p2.y - p2.x * p1.y;
      }
      return sum / 2;
    },
    polygonCentroid: (polygon) => {
      let cxSum = 0;
      let cySum = 0;
      const area = geo.polygonArea(polygon);
      for (var i=0; i < polygon.points.length - 1; i++) {
        let p1 = polygon.points[i];
        let p2 = polygon.points[i+1];
        cxSum += (p1.x + p2.x) * (p1.x * p2.y - p2.x * p1.y);
        cySum += (p1.y + p2.y) * (p1.x * p2.y - p2.x * p1.y);
      }
      return {x: cxSum / (6 * area), y: cySum / (6 * area)};
    },
    side: (ax, ay, bx, by, x, y) => {
      return (bx-ax)*(y-ay) - (by-ay)*(x-ax);
    },
    onLine: (ax, ay, bx, by, x, y) => {
      return Math.abs(geo.side(ax, ay, bx, by, x, y)) < 0.0001 &&
                  x >= Math.min(ax, bx) &&
                  x <= Math.max(ax, bx) &&
                  y >= Math.min(ay, by) &&
                  y <= Math.max(ay, by);
    },
    onPoly: (polygon, x, y) => {
      for (var i=1; i < polygon.points.length; i++) {
        let a = polygon.points[i-1];
        let b = polygon.points[i];
        if (geo.onLine(a.x, a.y, b.x, b.y, x, y)) {
          return true;
        }
      }
      return false;
    },
    isClockwise: (polygon) => {
      const n = polygon.points.length;
      if (n <= 2) {
        return true;
      }
      let sum = 0;
      for (var i=0; i < n; i++) {
        let p1 = polygon.points[i%n];
        let p2 = polygon.points[(i+1)%n];
        sum += (p2.x - p1.x) * (p1.y + p2.y);
      }
      return sum > 0;
    },
    isConvex: (polygon) => {
      const n = polygon.points.length;
      if (n <= 3) {
        return true;
      }
      let sign = 0;
      for (var i=0; i < n; i++) {
        let p1 = polygon.points[i%n];
        let p2 = polygon.points[(i+1)%n];
        let p3 = polygon.points[(i+2)%n];
        let dx1 = p2.x - p1.x;
        let dy1 = p2.y - p1.y;
        let dx2 = p3.x - p2.x;
        let dy2 = p3.y - p2.y;
        let xp = dx1 * dy2 - dy1 * dx2;
        if (sign == 0) {
          sign = xp > 0 ? 1 : -1;
        } else if ((sign == 1 && xp < 0) || (sign == -1 && xp > 0)) {
          return false;
        }
      }
      return true;
    },
    isInsideRect: (rect, x, y) => {
      return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
    },
    isInside: (polygon, x, y) => {
      // NOTE(applmak): Left-of-side tests only work for SIMPLE polygons.
      // /me is ashamed.

      let numberOfCrossings = 0;
      for (var i=1; i < polygon.points.length; i++) {
        let a = polygon.points[i-1];
        let b = polygon.points[i];

        // Avoid the vertex-intersection problem by bumping the test y value
        // slightly if it is the same as either endpoint.
        while (a.y == y || b.y == y) {
          y += 0.000001;
        }

        // Does a line from our tests point WAY TO THE RIGHT intersect?
        numberOfCrossings += geo.intersect(a.x, a.y, b.x, b.y, x, y, Math.max(x, polygon.extents.x + polygon.extents.w + 1), y);
      }
      // Even crossings? Not inside. Odd crossings? Inside.
      return numberOfCrossings % 2;
    },
    intersect: (ax, ay, bx, by, cx, cy, dx, dy) => {
      return !!geo.intersection(ax, ay, bx, by, cx, cy, dx, dy);
    },
    // Damn it! Here I am, solving line segment intersection AGAIN.
    // You think I would have learned my lesson by now. :(
    //
    // Given line segment ab and line segment cd, determine if there is an
    // intersection point:
    //   First, write ab and cd as parametric equations with variables u and v
    //     in [0,1]:
    //     l(ab) = a + (b - a)*u
    //     l(cd) = c + (d - c)*v
    //   We are looking for a point where l(ab) == l(cd) or:
    //     a + (b - a)*u = c + (d - c)*v
    //   While this may look line 1 equation with two free variables, because
    //   a,b,c,d are vectors in 2d, this is actually TWO equations:
    //     ax + (bx - ax)*u = cx + (dx - cx)*v
    //     ay + (by - ay)*u = cy + (dy - cy)*v
    //   Solve for v (arbitrary choice) in both:
    //     ((ax - cx) + u*(bx - ax))/(dx - cx) = v
    //     ((ay - cy) + u*(by - ay))/(dy - cy) = v
    //   Set them equal, solve for u:
    //     ((ax - cx) + u*(bx - ax))/(dx - cx) = ((ay - cy) + u*(by - ay))/(dy - cy)
    //     (dy - cy) * ((ax - cx) + u*(bx - ax)) = (dx - cx) * ((ay - cy) + u*(by - ay))
    //     (dy - cy)*(ax - cx) + u*(dy - cy)*(bx - ax) = (dx - cx)*(ay - cy) + u*(dx - cx)*(by - ay)
    //     u*(dy - cy)*(bx - ax) - u*(dx - cx)*(by - ay) = (dx - cx)*(ay - cy) - (dy - cy)*(ax - cx)
    //     u*((dy - cy)*(bx - ax) - (dx - cx)*(by - ay)) = (dx - cx)*(ay - cy) - (dy - cy)*(ax - cx)
    //     u = ((dx - cx)*(ay - cy) - (dy - cy)*(ax - cx))/((dy - cy)*(bx - ax) - (dx - cx)*(by - ay))
    //   If the denominator is 0 (or < epsilon), the lines are parallel.
    //   If u < 0 or u > 1, the lines intersect, but not on the segment.
    //   Solve for v in the same way (most stable, slower) or given u (faster):
    //     ((ax - cx) + u*(bx - ax))/(dx - cx) = v
    //   If v < 0 or v > 1, the lines intersect, but not on the segment.
    //   Intersection is a + (b - a)*u in both dimensions.
    intersection: (ax, ay, bx, by, cx, cy, dx, dy) => {
      const det = (dy - cy)*(bx - ax) - (dx - cx)*(by - ay);
      // Nearly 0:
      if (Math.abs(det) < 0.0001) {
        // Lines are parallel.
        return null;
      }

      const u = ((dx - cx)*(ay - cy) - (dy - cy)*(ax - cx))/det;
      if (u < 0 || u > 1) {
        // Lines intersect; segments don't.
        return null;
      }

      // Fast way to solve for v, doesn't handle if CD segment is vertical
      //var v = ((ax - cx) + u*(bx - ax))/(dx - cx);
      // Slow way by solving equations above for u, setting equal, then resolving for v.
      const v = ((by - ay) * (cx - ax) - (cy - ay) * (bx - ax)) / ((bx - ax) * (dy - cy) - (by - ay) * (dx - cx));
      if (v < 0 || v > 1) {
        // Lines intersect; segments don't.
        return null;
      }

      // Send additional data for those curious.
      return {x: ax + (bx - ax) * u,
              y: ay + (by - ay) * u,
              u: u,
              v: v};
    },
    intersectPolygonLine: function(polygon, ax, ay, bx, by) {
      for (var i=1; i < polygon.points.length; i++) {
        var m = polygon.points[i-1];
        var n = polygon.points[i];
        var intersection = geo.intersection(ax, ay, bx, by, m.x, m.y, n.x, n.y);
        if (intersection) {
          return {p1: m, p2: n, u: intersection.u};
        }
      }
      return null;
    },
    isInsidePolygon: function(testPolygon, againstPolygon) {
      // For every point in test polygon, ensure it is inside.
      for (var i=1; i < testPolygon.points.length; i++) {
        var pt = testPolygon.points[i];
        if (!geo.isInside(againstPolygon, pt.x, pt.y)) {
          return false;
        }
      }
      return true;
    },
    intersectPolygonPolygon: function(testPolygon, againstPolygon) {
      for (var i=1; i < testPolygon.points.length; i++) {
        var m = testPolygon.points[i-1];
        var n = testPolygon.points[i];
        var intersection = geo.intersectPolygonLine(againstPolygon, m.x, m.y, n.x, n.y);
        if (intersection) {
          return intersection;
        }
      }
      return null;
    },
    cutPolygon: function(polygon, ax, ay, bx, by) {
      var leftPoints = [], rightPoints = [];
      for (var i = 0; i < polygon.points.length; ++i) {
        var p1 = polygon.points[i];
        var p2 = polygon.points[(i + 1) % polygon.points.length];

        var det1 = geo.side(ax, ay, bx, by, p1.x, p1.y);
        var points = det1 > 0 ? leftPoints : rightPoints;
        var otherPoints = points === leftPoints ? rightPoints : leftPoints;

        if (det1 == 0) {
          // It's ON the line.
          // If p0-p1 was co-linear, we still need to add p1 to both sets of
          // points. If not, then we don't. We'll detect this by calculating
          // the side of p0. If it's 0, then we need to add.
          var p0 = polygon.points[(i - 1 + polygon.points.length) % polygon.points.length];
          var det0 = geo.side(ax, ay, bx, by, p0.x, p0.y);
          if (det0 == 0) {
            // Need to add it:
            points.push({x: p1.x, y: p1.y});
            otherPoints.push({x: p1.x, y: p1.y});
          }
          continue;
        }

        // Add p1 to the current point list.
        points.push({x: p1.x, y: p1.y});

        var det2 = geo.side(ax, ay, bx, by, p2.x, p2.y);
        // Is the next point on the same side?
        if (Math.sign(det2) == Math.sign(det1)) {
          // Great! Next iteration will do the work.
          continue;
        }

        // Ah, next point is on the OTHER side (or on the line).
        // Find the intersection point of the cutline and the current line.
        var point = geo.intersection(ax, ay, bx, by, p1.x, p1.y, p2.x, p2.y);
        // There HAS to be a point.
        console.assert(point, 'Whoa, no point!', ax, ay, bx, by, p1.x, p1.y, p2.x, p2.y);
        // Add the intersection point to the same set of points as det1
        points.push({x: point.x, y: point.y});
        // But we aren't finished! We must also add the intersection point to
        // the other list of points to ensure that they are noticed there.
        otherPoints.push(point);
      }

      // Duplicate the first point at the end.
      if (leftPoints.length) {
        leftPoints.push({x: leftPoints[0].x, y: leftPoints[0].y});
      }
      if (rightPoints.length) {
        rightPoints.push({x: rightPoints[0].x, y: rightPoints[0].y});
      }

      return {left: new geo.Polygon(leftPoints),
              right: new geo.Polygon(rightPoints)};
    },
    distanceToPolygon: function(polygon, x, y) {
      var minDistance = Infinity;
      for (var i = 0; i < polygon.points.length - 1; i++) {
        var p1 = polygon.points[i];
        var p2 = polygon.points[i+1];
        var d = geo.distanceToLine(p1.x, p1.y, p2.x, p2.y, x, y);
        minDistance = Math.min(minDistance, d);
      }
      return minDistance;
    },
    distanceToLine: function(x1, y1, x2, y2, xp, yp) {
      // Reimplementation of http://stackoverflow.com/questions/849211
      var l2 = Math.pow(geo.distance(x1, y1, x2, y2), 2);
      if (l2 == 0) {
        return geo.distance(x1, y1, xp, yp);
      }
      // Project the point onto the line represented parametrically: p1 + t (p2 - p1)
      var t = ((xp - x1) * (x2 - x1) + (yp - y1) * (y2 - y1)) / l2;
      if (t <= 0) {
        return geo.distance(xp, yp, x1, y1);
      } else if (t >= 1) {
        return geo.distance(xp, yp, x1, y2);
      }
      var projx = x1 + t * (x2 - x1);
      var projy = y1 + t * (y2 - y1);
      return geo.distance(xp, yp, projx, projy);
    },
    distance: function(x1, y1, x2, y2) {
      return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },
  };

  return geo;
}));
