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
    define([], factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  }
}(() => {
  Promise.delay = (ms) => new Promise((resolve, reject) => {
      setTimeout(resolve, ms);
  });


  Promise.prototype.done = function(opt_resolve, opt_reject) {
    this.then(opt_resolve, opt_reject).catch((e) => {
      console.error('Unhandled rejection!', e.message);
      console.error(e.stack);
    });
  };

  Promise.allSettled = (promises) => {
    let statuses = [];
    return promises.reduce((agg, promise, index) => {
      return promise.then((v) => {
        statuses[index] = {status: 'resolved', value: v};
      }, (e) => {
        statuses[index] = {status: 'rejected', error: e};
      }).then(() => agg);
    }, Promise.resolve())
        .then(() => statuses);
  };
}));
