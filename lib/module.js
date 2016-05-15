"use strict";

var utils = require('./utils');

/**
 * Module
 *
 * @constructor
 */
function Module() {
  var providers = [];

  this.factory = function (name, factory, options) {
    providers.push(utils.merge({
      name: name,
      type: 'factory',
      value: factory
    }, options));
    return this;
  };

  this.value = function (name, value, options) {
    providers.push(utils.merge({
      name: name,
      type: 'value',
      value: value
    }, options));
    return this;
  };

  this.type = function (name, type, options) {
    providers.push(utils.merge({
      name: name,
      type: 'type',
      value: type
    }, options));
    return this;
  };

  this.forEach = function (iterator) {
    providers.forEach(iterator);
  };
}

module.exports = Module;
