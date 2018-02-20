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

let recentErrors = [];
const ERROR_BUFFER_SIZE = 100;

let pushError = (record) => {
  recentErrors.push(record);
  if (recentErrors.length > ERROR_BUFFER_SIZE) {
    recentErrors.shift();
  }
};

/**
 * Returns an error recording function that wraps a debugger
 * provided by the standard debug module.
 * The returned function can consume strings or Error objects.
 */
let error = (debug) => {
  return (e) => {
    debug(e);
    let record = {
      origin: 'SERVER',
      timestamp: new Date(),
      namespace: debug.namespace,
    };
    if (e instanceof Error) {
      record.stack = e.stack;
      record.message = e.message;
    } else if (e instanceof String) {
      record.message = e;
    }
    pushError(record);
  };
};

/**
 * Returns an error recording function that wraps a debugger
 * provided by the standard debug module.
 * The returned function consumes records supplied by the client.
 */
let clientError = (debug) => {
  return (e) => {
    debug(e);
    pushError({
      origin: 'CLIENT',
      timestamp: new Date(),
      stack: e.stack,
      message: e.message,
      namespace: e.namespace,
    });
  };
};

/**
 * Retrieves a list of recent errors.
 */
let getRecentErrors = () => {
  return recentErrors;
};

module.exports = {
  error: error,
  clientError: clientError,
  getRecentErrors: getRecentErrors,
};
