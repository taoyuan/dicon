"use strict";

var expect = require('chai').expect;
var Module = require('../lib/module');

describe('module', function() {
  return it('should return self to enable chaining', function() {
    var module = new Module();
    return module.value('a', 'a-value').factory('b', function() {
      return 'b-value';
    }).type('c', function() {}).value('e', 'e-value');
  });
});
