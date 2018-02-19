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
}(() => (source, sandbox) => {
  // Eval something as safe as we can in the browser.
  // We need to pay attention to things like sourceUrls and line numbers and
  // strict mode.
    const sandboxKeys = Object.keys(sandbox);
    const functionParams = sandboxKeys.concat([source]);
    const Sandbox = function(args) {
      return Function.apply(this, args);
    };
    Sandbox.prototype = Function.prototype;
    let sandboxFn = new Sandbox(functionParams);
    return sandboxFn.apply(null, sandboxKeys.map((k) => sandbox[k]));
  }
));
