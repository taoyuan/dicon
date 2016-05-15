"use strict";

module.exports = Provider;

/**
 *
 * @param type
 * @param name
 * @param vfn
 * @param options
 * @constructor
 */
function Provider(type, name, vfn, options) {
  if (!(this instanceof Provider)) {
    return new Provider(type, name, vfn, options);
  }
  if (typeof options === 'boolean') {
    options = {private: options};
  }
  options = options || {};
  this.type = type;
  this.name = name;
  this.value = vfn;
  this.private = options.private;
}

Provider.factory = function (container, name, value, options) {
  return new Provider('factory', name, function () {
    return container.invoke(value);
  }, options);
};

Provider.type = function (container, name, value, options) {
  return new Provider('type', name, function () {
    return container.instantiate(value);
  }, options);
};


Provider.value = function (container, name, value, options) {
  return new Provider('value', name, function () {
    return value;
  }, options);
};
