"use strict";

var utils = require('./utils');

/**
 * Module
 *
 * @constructor
 */
function Module() {
  if (!(this instanceof Module)) {
    return new Module();
  }
  this.definitions = [];
}

Module.prototype.factory = function (name, factory, options) {
  this.definitions.push(utils.merge({
    name: name,
    type: 'factory',
    value: factory
  }, options));
  return this;
};

Module.prototype.value = function (name, value, options) {
  this.definitions.push(utils.merge({
    name: name,
    type: 'value',
    value: value
  }, options));
  return this;
};

Module.prototype.type = function (name, type, options) {
  this.definitions.push(utils.merge({
    name: name,
    type: 'type',
    value: type
  }, options));
  return this;
};

Module.prototype.forEach = function (iterator) {
  this.definitions.forEach(iterator);
};

module.exports = Module;
