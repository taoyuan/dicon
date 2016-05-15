"use strict";

var expect = require('chai').expect;
var assert = require('chai').assert;
var Module = require('../lib/module');
var Container = require('../lib/container');

describe('container', function () {

  it('should expose public api and properties', function () {
    var container = new Container();
    assert(container.providers);
    assert(container.instances);
  });

  it('should consume an object as a module', function () {
    function BazType() {
      this.name = 'baz';
    }

    var module = {
      foo: [
        'factory', function () {
          return 'foo-value';
        }
      ],
      bar: ['value', 'bar-value'],
      baz: ['type', BazType]
    };
    var container = new Container(module);
    expect(container.get('foo')).to.equal('foo-value');
    expect(container.get('bar')).to.equal('bar-value');
    return expect(container.get('baz')).to.be.an["instanceof"](BazType);
  });

  it('should consume multiple objects as modules', function () {
    var BazType, container, module1, module2;
    BazType = (function () {
      function BazType() {
      }

      return BazType;

    })();
    module1 = {
      foo: [
        'factory', function () {
          return 'foo-value';
        }
      ],
      baz: ['type', BazType]
    };
    module2 = {
      bar: ['value', 'bar-value']
    };
    container = new Container([module1, module2]);
    expect(container.get('foo')).to.equal('foo-value');
    expect(container.get('bar')).to.equal('bar-value');
    return expect(container.get('baz')).to.be.an["instanceof"](BazType);
  });
  describe('get', function () {
    it('should return an instance', function () {
      var BazType, container, module;
      BazType = (function () {
        function BazType() {
          this.name = 'baz';
        }

        return BazType;

      })();
      module = new Module;
      module.factory('foo', function () {
        return {
          name: 'foo'
        };
      });
      module.value('bar', 'bar value');
      module.type('baz', BazType);
      container = new Container([module]);
      expect(container.get('foo')).to.deep.equal({
        name: 'foo'
      });
      expect(container.get('bar')).to.equal('bar value');
      expect(container.get('baz')).to.deep.equal({
        name: 'baz'
      });
      return expect(container.get('baz')).to.be.an["instanceof"](BazType);
    });
    it('should always return the same instance', function () {
      var BazType, container, module;
      BazType = (function () {
        function BazType() {
          this.name = 'baz';
        }

        return BazType;

      })();
      module = new Module;
      module.factory('foo', function () {
        return {
          name: 'foo'
        };
      });
      module.value('bar', 'bar value');
      module.type('baz', BazType);
      container = new Container([module]);
      expect(container.get('foo')).to.equal(container.get('foo'));
      expect(container.get('bar')).to.equal(container.get('bar'));
      return expect(container.get('baz')).to.equal(container.get('baz'));
    });
    it('should resolve dependencies', function () {
      var Foo, bar, container, fooInstance, module;
      Foo = (function () {
        function Foo(bar, baz) {
          this.bar = bar;
          this.baz = baz;
        }

        return Foo;

      })();
      Foo.$inject = ['bar', 'baz'];
      bar = function (baz, abc) {
        return {
          baz: baz,
          abc: abc
        };
      };
      bar.$inject = ['baz', 'abc'];
      module = new Module;
      module.type('foo', Foo);
      module.factory('bar', bar);
      module.value('baz', 'baz-value');
      module.value('abc', 'abc-value');
      container = new Container([module]);
      fooInstance = container.get('foo');
      expect(fooInstance.bar).to.deep.equal({
        baz: 'baz-value',
        abc: 'abc-value'
      });
      return expect(fooInstance.baz).to.equal('baz-value');
    });
    it('should inject properties', function () {
      var container, module;
      module = new Module;
      module.value('config', {
        a: 1,
        b: {
          c: 2
        }
      });
      container = new Container([module]);
      expect(container.get('config.a')).to.equal(1);
      return expect(container.get('config.b.c')).to.equal(2);
    });
    it('should inject dotted service if present', function () {
      var container, module;
      module = new Module;
      module.value('a.b', 'a.b value');
      container = new Container([module]);
      return expect(container.get('a.b')).to.equal('a.b value');
    });
    it('should provide "container"', function () {
      var container, module;
      module = new Module;
      container = new Container([module]);
      return expect(container.get('container')).to.equal(container);
    });
    it('should throw error with full path if no provider', function () {
      var aFn, bFn, container, module;
      aFn = function (b) {
        return 'a-value';
      };
      aFn.$inject = ['b'];
      bFn = function (c) {
        return 'b-value';
      };
      bFn.$inject = ['c'];
      module = new Module;
      module.factory('a', aFn);
      module.factory('b', bFn);
      container = new Container([module]);
      return expect(function () {
        return container.get('a');
      }).to["throw"]('No provider for "c"! (Resolving: a -> b -> c)');
    });
    return it('should throw error if circular dependency', function () {
      var aFn, bFn, container, module;
      module = new Module;
      aFn = function (b) {
        return 'a-value';
      };
      aFn.$inject = ['b'];
      bFn = function (a) {
        return 'b-value';
      };
      bFn.$inject = ['a'];
      module = new Module;
      module.factory('a', aFn);
      module.factory('b', bFn);
      container = new Container([module]);
      return expect(function () {
        return container.get('a');
      }).to["throw"]('Can not resolve circular dependency! ' + '(Resolving: a -> b -> a)');
    });
  });
  describe('invoke', function () {
    it('should resolve dependencies', function () {
      var bar, container, module;
      bar = function (baz, abc) {
        return {
          baz: baz,
          abc: abc
        };
      };
      bar.$inject = ['baz', 'abc'];
      module = new Module;
      module.value('baz', 'baz-value');
      module.value('abc', 'abc-value');
      container = new Container([module]);
      return expect(container.invoke(bar)).to.deep.equal({
        baz: 'baz-value',
        abc: 'abc-value'
      });
    });
    it('should invoke function on given context', function () {
      var container, context, module;
      context = {};
      module = new Module;
      container = new Container([module]);
      return container.invoke((function () {
        return expect(this).to.equal(context);
      }), context);
    });
    it('should throw error if a non function given', function () {
      var container;
      container = new Container([]);
      expect(function () {
        return container.invoke(123);
      }).to["throw"]('Can not invoke "123". Expected a function!');
      expect(function () {
        return container.invoke('abc');
      }).to["throw"]('Can not invoke "abc". Expected a function!');
      expect(function () {
        return container.invoke(null);
      }).to["throw"]('Can not invoke "null". Expected a function!');
      expect(function () {
        return container.invoke(void 0);
      }).to["throw"]('Can not invoke "undefined". ' + 'Expected a function!');
      return expect(function () {
        return container.invoke({});
      }).to["throw"]('Can not invoke "[object Object]". ' + 'Expected a function!');
    });
    return it('should auto parse arguments/comments if no $inject defined', function () {
      var bar, container, module;
      bar = function (/* baz */ a, abc) {
        return {baz: a, abc: abc};
      };
      module = new Module;
      module.value('baz', 'baz-value');
      module.value('abc', 'abc-value');
      container = new Container([module]);
      return expect(container.invoke(bar)).to.deep.equal({
        baz: 'baz-value',
        abc: 'abc-value'
      });
    });
  });
  describe('instantiate', function () {
    it('should resolve dependencies', function () {
      var Foo, container, module;
      Foo = (function () {
        function Foo(abc, baz) {
          this.abc = abc;
          this.baz = baz;
        }

        return Foo;

      })();
      Foo.$inject = ['abc', 'baz'];
      module = new Module;
      module.value('baz', 'baz-value');
      module.value('abc', 'abc-value');
      container = new Container([module]);
      return expect(container.instantiate(Foo)).to.deep.equal({
        abc: 'abc-value',
        baz: 'baz-value'
      });
    });
    return it('should return returned value from constructor if an object returned', function () {
      var NumberCls, ObjCls, StringCls, container, module, returnedObj;
      module = new Module;
      container = new Container([module]);
      returnedObj = {};
      ObjCls = function () {
        return returnedObj;
      };
      StringCls = function () {
        return 'some string';
      };
      NumberCls = function () {
        return 123;
      };
      expect(container.instantiate(ObjCls)).to.equal(returnedObj);
      expect(container.instantiate(StringCls)).to.be.an["instanceof"](StringCls);
      return expect(container.instantiate(NumberCls)).to.be.an["instanceof"](NumberCls);
    });
  });
  describe('child', function () {
    it('should inject from child', function () {
      var child, container, moduleChild, moduleParent;
      moduleParent = new Module;
      moduleParent.value('a', 'a-parent');
      moduleChild = new Module;
      moduleChild.value('a', 'a-child');
      moduleChild.value('d', 'd-child');
      container = new Container([moduleParent]);
      child = container.createChild([moduleChild]);
      expect(child.get('d')).to.equal('d-child');
      return expect(child.get('a')).to.equal('a-child');
    });
    it('should provide the child container as "container"', function () {
      var childInjector, container;
      container = new Container([]);
      childInjector = container.createChild([]);
      return expect(childInjector.get('container')).to.equal(childInjector);
    });
    it('should inject from parent if not provided in child', function () {
      var child, container, moduleChild, moduleParent;
      moduleParent = new Module;
      moduleParent.value('a', 'a-parent');
      moduleChild = new Module;
      moduleChild.factory('b', function (a) {
        return {
          a: a
        };
      });
      container = new Container([moduleParent]);
      child = container.createChild([moduleChild]);
      return expect(child.get('b')).to.deep.equal({
        a: 'a-parent'
      });
    });
    it('should inject from parent but never use dependency from child', function () {
      var child, container, moduleChild, moduleParent;
      moduleParent = new Module;
      moduleParent.factory('b', function (c) {
        return 'b-parent';
      });
      moduleChild = new Module;
      moduleChild.value('c', 'c-child');
      container = new Container([moduleParent]);
      child = container.createChild([moduleChild]);
      return expect(function () {
        return child.get('b');
      }).to["throw"]('No provider for "c"! (Resolving: b -> c)');
    });
    it('should force new instance in child', function () {
      var child, container, moduleChild, moduleParent;
      moduleParent = new Module;
      moduleParent.factory('b', function (c) {
        return {
          c: c
        };
      });
      moduleParent.value('c', 'c-parent');
      container = new Container([moduleParent]);
      expect(container.get('b')).to.deep.equal({
        c: 'c-parent'
      });
      moduleChild = new Module;
      moduleChild.value('c', 'c-child');
      child = container.createChild([moduleChild], ['b']);
      return expect(child.get('b')).to.deep.equal({
        c: 'c-child'
      });
    });
    it('should force new instance using provider from grand parent', function () {
      var container, grandChildInjector, moduleGrandParent;
      moduleGrandParent = new Module;
      moduleGrandParent.value('x', 'x-grand-parent');
      container = new Container([moduleGrandParent]);
      return grandChildInjector = container.createChild([]).createChild([], ['x']);
    });
    return it('should throw error if forced provider does not exist', function () {
      var container, moduleChild, moduleParent;
      moduleParent = new Module;
      container = new Container([moduleParent]);
      moduleChild = new Module;
      return expect(function () {
        return container.createChild([], ['b']);
      }).to["throw"]('No provider for "b". Can not use ' + 'provider from the parent!');
    });
  });
  describe('private modules', function () {
    it('should only expose public bindings', function () {
      var container, mA, mB, publicFoo;
      mA = {
        __exports__: ['publicFoo'],
        'publicFoo': [
          'factory', function (privateBar) {
            return {
              dependency: privateBar
            };
          }
        ],
        'privateBar': ['value', 'private-value']
      };
      mB = {
        'bar': [
          'factory', function (privateBar) {
            return null;
          }
        ],
        'baz': [
          'factory', function (publicFoo) {
            return {
              dependency: publicFoo
            };
          }
        ]
      };
      container = new Container([mA, mB]);
      publicFoo = container.get('publicFoo');
      expect(publicFoo).to.be.defined;
      expect(publicFoo.dependency).to.equal('private-value');
      expect(function () {
        return container.get('privateBar');
      }).to["throw"]('No provider for "privateBar"! (Resolving: privateBar)');
      expect(function () {
        return container.get('bar');
      }).to["throw"]('No provider for "privateBar"! (Resolving: bar -> privateBar)');
      return expect(container.get('baz').dependency).to.equal(publicFoo);
    });
    it('should allow name collisions in private bindings', function () {
      var container, mA, mB;
      mA = {
        __exports__: ['foo'],
        'foo': [
          'factory', function (conflict) {
            return conflict;
          }
        ],
        'conflict': ['value', 'private-from-a']
      };
      mB = {
        __exports__: ['bar'],
        'bar': [
          'factory', function (conflict) {
            return conflict;
          }
        ],
        'conflict': ['value', 'private-from-b']
      };
      container = new Container([mA, mB]);
      expect(container.get('foo')).to.equal('private-from-a');
      return expect(container.get('bar')).to.equal('private-from-b');
    });
    it('should allow forcing new instance', function () {
      var container, firstChild, fooFromFirstChild, fooFromSecondChild, module, secondChild;
      module = {
        __exports__: ['foo'],
        'foo': [
          'factory', function (bar) {
            return {
              bar: bar
            };
          }
        ],
        'bar': ['value', 'private-bar']
      };
      container = new Container([module]);
      firstChild = container.createChild([], ['foo']);
      secondChild = container.createChild([], ['foo']);
      fooFromFirstChild = firstChild.get('foo');
      fooFromSecondChild = secondChild.get('foo');
      expect(fooFromFirstChild).not.to.equal(fooFromSecondChild);
      return expect(fooFromFirstChild.bar).to.equal(fooFromSecondChild.bar);
    });
    it('should load additional __modules__', function () {
      var container, foo, mA, mB;
      mB = {
        'bar': ['value', 'bar-from-other-module']
      };
      mA = {
        __exports__: ['foo'],
        __modules__: [mB],
        'foo': [
          'factory', function (bar) {
            return {
              bar: bar
            };
          }
        ]
      };
      container = new Container([mA]);
      foo = container.get('foo');
      expect(foo).to.be.defined;
      return expect(foo.bar).to.equal('bar-from-other-module');
    });
    return it('should only create one private child container', function () {
      var bar, barFromChild, childInjector, container, foo, fooFromChild, m;
      m = {
        __exports__: ['foo', 'bar'],
        'foo': [
          'factory', function (bar) {
            return {
              bar: bar
            };
          }
        ],
        'bar': [
          'factory', function (internal) {
            return {
              internal: internal
            };
          }
        ],
        'internal': [
          'factory', function () {
            return {};
          }
        ]
      };
      container = new Container([m]);
      foo = container.get('foo');
      bar = container.get('bar');
      childInjector = container.createChild([], ['foo', 'bar']);
      fooFromChild = childInjector.get('foo');
      barFromChild = childInjector.get('bar');
      expect(fooFromChild).to.not.equal(foo);
      expect(barFromChild).to.not.equal(bar);
      return expect(fooFromChild.bar).to.equal(barFromChild);
    });
  });
  return describe('scopes', function () {
    return it('should force new instances per scope', function () {
      var Foo, bar, container, createBar, foo, m, requestInjector, sessionInjector;
      Foo = function () {
      };
      Foo.$scope = ['request'];
      createBar = function () {
        return {};
      };
      createBar.$scope = ['session'];
      m = {
        'foo': ['type', Foo],
        'bar': ['factory', createBar]
      };
      container = new Container([m]);
      foo = container.get('foo');
      bar = container.get('bar');
      sessionInjector = container.createChild([], ['session']);
      expect(sessionInjector.get('foo')).to.equal(foo);
      expect(sessionInjector.get('bar')).to.not.equal(bar);
      requestInjector = container.createChild([], ['request']);
      expect(requestInjector.get('foo')).to.not.equal(foo);
      return expect(requestInjector.get('bar')).to.equal(bar);
    });
  });
});
