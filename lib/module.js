/**
 * Module
 *
 * @constructor
 */
function Module() {
  var providers = [];

  this.factory = function (name, factory) {
    providers.push({
      name: name,
      type: 'factory',
      value: factory
    });
    return this;
  };

  this.value = function (name, value) {
    providers.push({
      name: name,
      type: 'value',
      value: value
    });
    return this;
  };

  this.type = function (name, type) {
    providers.push({
      name: name,
      type: 'type',
      value: type
    });
    return this;
  };

  this.forEach = function (iterator) {
    providers.forEach(iterator);
  };
}

module.exports = Module;
