"use strict";

var assert = require('assert');
var utils = require('./utils');

module.exports = Provider;

/**
 *
 * @param name
 * @param definition
 * @constructor
 */
function Provider(name, definition) {
  if (!(this instanceof Provider)) {
    return new Provider(name, definition);
  }
  if (typeof name === 'string') {
    this.name = name;
  } else {
    definition = name;
  }

  utils.merge(this, definition);

  this.get = function () {
    return (this.getter && this.getter(this.value)) || this.value;
  }
}

var providers = {

  factory: function factory(container, definition) {
    definition.type = 'factory';
    definition.getter = function (value) {
      return container.invoke(value);
    };
    return new Provider(definition);
  },
  type: function type(container, definition) {
    definition.type = 'type';
    definition.getter = function (value) {
      return container.instantiate(value);
    };
    return new Provider(definition);
  },
  value: function value(container, definition) {
    definition.type = 'value';
    definition.getter = function (value) {
      return value;
    };
    return new Provider(definition);
  },
  private: function (container, definition) {
    definition.type = 'private';
    definition.getter = definition.value;
    definition.value = definition.name;
    return new Provider(definition);
  }
};

Provider.create = function (container, name, definition) {
  if (typeof name !== 'string') {
    definition = name;
    name = definition.name;
  }

  if (Array.isArray(definition)) {
    definition = utils.merge({
      type: definition[0],
      value: definition[1]
    }, definition[2]);
  }

  definition.name = definition.name || name;

  if (!providers[definition.type]) {
    throw new Error('No provider found: ' + definition.type);
  }
  return providers[definition.type](container, definition);
};


