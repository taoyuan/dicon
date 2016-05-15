"use strict";

var parse = require('./annotation').parse;
var annotate = require('./annotation').annotate;
var Module = require('./module');
var Provider = require('./provider');
var utils = require('./utils');

/**
 * Container
 *
 * @param modules
 * @param parent
 * @constructor
 */
function Container(modules, parent) {
  if (!(this instanceof Container)) {
    return new Container(modules, parent);
  }

  parent = parent || {
      get: function (name) {
        currentlyResolving.push(name);
        throw error('No provider for "' + name + '"!');
      }
    };

  var started;
  var currentlyResolving = [];
  var providers = this._providers = Object.create(parent._providers || null);
  var instances = this._instances = Object.create(null);

  var that = instances.$container = instances.container = this;

  function error(msg) {
    var stack = currentlyResolving.join(' -> ');
    currentlyResolving.length = 0;
    return new Error(stack ? msg + ' (Resolving: ' + stack + ')' : msg);
  }

  function get(name) {
    if (!providers[name] && name.indexOf('.') !== -1) {
      var parts = name.split('.');
      var pivot = get(parts.shift());

      while (parts.length) {
        pivot = pivot[parts.shift()];
      }

      return pivot;
    }

    if (Object.hasOwnProperty.call(instances, name)) {
      return instances[name];
    }

    if (Object.hasOwnProperty.call(providers, name)) {
      if (currentlyResolving.indexOf(name) !== -1) {
        currentlyResolving.push(name);
        throw error('Can not resolve circular dependency!');
      }

      currentlyResolving.push(name);
      instances[name] = providers[name].get(); // providers[name][0](providers[name][1]);
      currentlyResolving.pop();

      return instances[name];
    }

    return parent.get(name);
  }

  function instantiate(Type) {
    var instance = Object.create(Type.prototype);
    var returned = invoke(Type, instance);

    return typeof returned === 'object' ? returned : instance;
  }

  function invoke(fn, context) {
    if (typeof fn !== 'function') {
      throw error('Can not invoke "' + fn + '". Expected a function!');
    }

    var inject = fn.$inject || parse(fn);
    var dependencies = inject.map(function (dep) {
      return get(dep);
    });

    //
    fn = fn.bind.apply(fn, [context].concat(dependencies));

    try {
      return fn();
    }
    catch (err) {
      return fn;
    }
  }

  function createPrivateInjectorFactory(privateChildContainer) {
    return annotate(function (key) {
      return privateChildContainer.get(key);
    });
  }

  function createChild(modules, forceNewInstances) {
    if (forceNewInstances && forceNewInstances.length) {
      var fromParentModule = Object.create(null);
      var matchedScopes = Object.create(null);

      var privateContainersCache = [];
      var privateChildInjectors = [];
      var privateChildFactories = [];

      var provider;
      var cacheIdx;
      var privateChildContainer;
      var privateChildInjectorFactory;
      for (var name in providers) {
        provider = providers[name];

        if (forceNewInstances.indexOf(name) !== -1) {
          if (provider.type === 'private') {
            // if (provider[2] === 'private') {
            cacheIdx = privateContainersCache.indexOf(provider.container);
            if (cacheIdx === -1) {
              privateChildContainer = provider.container.createChild([], forceNewInstances);
              privateChildInjectorFactory = createPrivateInjectorFactory(privateChildContainer);
              privateContainersCache.push(provider.container);
              privateChildInjectors.push(privateChildContainer);
              privateChildFactories.push(privateChildInjectorFactory);
              fromParentModule[name] = Provider.create(that, {
                name: name,
                type: 'private',
                value: privateChildInjectorFactory,
                container: privateChildContainer
              });
            } else {
              fromParentModule[name] = Provider.create(that, {
                name: name,
                type: 'private',
                value: privateChildFactories[cacheIdx],
                container: privateChildInjectors[cacheIdx]
              });
            }
          } else {
            fromParentModule[name] = [provider.type, provider.value];
          }
          matchedScopes[name] = true;
        }

        if ((provider.type === 'factory' || provider.type === 'type') && provider.value.$scope) {
          forceNewInstances.forEach(function (scope) {
            if (provider.value.$scope.indexOf(scope) !== -1) {
              fromParentModule[name] = [provider.type, provider.value];
              matchedScopes[scope] = true;
            }
          });
        }
      }

      forceNewInstances.forEach(function (scope) {
        if (!matchedScopes[scope]) {
          throw new Error('No provider for "' + scope + '". Can not use provider from the parent!');
        }
      });

      if (Array.isArray(modules)) {
        modules.unshift(fromParentModule);
      } else {
        modules = [fromParentModule, modules];
      }
    }

    return new Container(modules, that);
  }

  function processModule(module) {
    // TODO: handle wrong inputs (modules)
    if (module instanceof Module) {
      module.forEach(function (definition) {
        if (Array.isArray(definition)) {
          definition = utils.merge({
            name: definition[0],
            type: definition[1],
            value: definition[2]
          }, definition[3]);
        }
        providers[definition.name] = Provider.create(that, definition);
      });
    } else if (typeof module === 'object') {
      if (module.__exports__) {
        var clonedModule = Object.keys(module).reduce(function (m, key) {
          if (key.substring(0, 2) !== '__') {
            m[key] = module[key];
          }
          return m;
        }, Object.create(null));

        var privateContainer = new Container((module.__modules__ || []).concat([clonedModule]), that);
        var getFromPrivateContainer = annotate(function (key) {
          return privateContainer.get(key);
        });
        module.__exports__.forEach(function (key) {
          // providers[key] = [getFromPrivateContainer, key, 'private', privateContainer];
          providers[key] = Provider.create(that, {
            name: key,
            type: 'private',
            value: getFromPrivateContainer,
            container: privateContainer
          });
        });
      } else {
        Object.keys(module).forEach(function (name) {
          if (module[name] instanceof Provider) {
            providers[name] = module[name];
          } else {
            if (!Array.isArray(module[name])) {
              module[name].name = name;
            }
            providers[name] = Provider.create(that, module[name]);
          }
        });
      }
    }
  }

  function start() {
    if (started) return;
    Object.keys(providers).forEach(function (name) {
      var instance = that.get(name);
      if (instance && typeof instance === 'object' && typeof instance.start === 'function') {
        invoke(instance.start, instance);
      }
    });
    started = true;
    return that;
  }

  function stop() {
    if (!started) return;
    Object.keys(providers).forEach(function (name) {
      var instance = that.get(name);
      if (instance && typeof instance === 'object' && typeof instance.stop === 'function') {
        invoke(instance.stop, instance);
      }
    });
    started = false;
    return that;
  }

  if (Array.isArray(modules)) {
    modules.forEach(processModule);
  } else {
    processModule(modules);
  }

  // public API
  Object.defineProperties(this, {
    providers: {
      get: function () {
        return providers;
      }
    },
    instances: {
      get: function () {
        return instances;
      }
    }
  });

  this.get = get;
  this.invoke = invoke;
  this.instantiate = instantiate;
  this.createChild = createChild;
  this.start = start;
  this.stop = stop;

  Object.defineProperty(this, 'started', {
    get: function () {
      return started;
    }
  })
}

module.exports = Container;
