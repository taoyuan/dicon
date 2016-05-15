"use strict";

exports.merge = function merge(target) {
  if (target) {
    for (var i = 1; i < arguments.length; i++) {
      if (!arguments[i]) continue;
      for (var name in arguments[i]) {
        target[name] = arguments[i][name];
      }
    }
  }
  return target;
};
