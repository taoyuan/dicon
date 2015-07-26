expect = require('chai').expect


describe 'container', ->

  Module = require '../lib/module'
  Container = require '../lib/container'

  it 'should consume an object as a module', ->
    class BazType
      constructor: -> @name = 'baz'

    module =
      foo: ['factory', -> 'foo-value']
      bar: ['value', 'bar-value']
      baz: ['type', BazType]

    container = new Container module
    expect(container.get 'foo').to.equal 'foo-value'
    expect(container.get 'bar').to.equal 'bar-value'
    expect(container.get 'baz').to.be.an.instanceof BazType

  it 'should consume multiple objects as modules', ->
    class BazType

    module1 =
      foo: ['factory', -> 'foo-value']
      baz: ['type', BazType]
    
    module2 =
      bar: ['value', 'bar-value']

    container = new Container [module1, module2]
    expect(container.get 'foo').to.equal 'foo-value'
    expect(container.get 'bar').to.equal 'bar-value'
    expect(container.get 'baz').to.be.an.instanceof BazType

  describe 'get', ->

    it 'should return an instance', ->
      class BazType
        constructor: -> @name = 'baz'

      module = new Module
      module.factory 'foo', -> {name: 'foo'}
      module.value 'bar', 'bar value'
      module.type 'baz', BazType

      container = new Container [module]

      expect(container.get 'foo').to.deep.equal {name: 'foo'}
      expect(container.get 'bar').to.equal 'bar value'
      expect(container.get 'baz').to.deep.equal {name: 'baz'}
      expect(container.get 'baz').to.be.an.instanceof BazType


    it 'should always return the same instance', ->
      class BazType
        constructor: -> @name = 'baz'

      module = new Module
      module.factory 'foo', -> {name: 'foo'}
      module.value 'bar', 'bar value'
      module.type 'baz', BazType

      container = new Container [module]

      expect(container.get 'foo').to.equal(container.get 'foo')
      expect(container.get 'bar').to.equal(container.get 'bar')
      expect(container.get 'baz').to.equal(container.get 'baz')


    it 'should resolve dependencies', ->
      class Foo
        constructor: (@bar, @baz) ->
      Foo.$inject = ['bar', 'baz']

      bar = (baz, abc) ->
        baz: baz
        abc: abc
      bar.$inject = ['baz', 'abc']

      module = new Module
      module.type 'foo', Foo
      module.factory 'bar', bar
      module.value 'baz', 'baz-value'
      module.value 'abc', 'abc-value'

      container = new Container [module]
      fooInstance = container.get 'foo'
      expect(fooInstance.bar).to.deep.equal {baz: 'baz-value', abc: 'abc-value'}
      expect(fooInstance.baz).to.equal 'baz-value'


    it 'should inject properties', ->
      module = new Module
      module.value 'config', {a: 1, b: {c: 2}}

      container = new Container [module]
      expect(container.get 'config.a').to.equal 1
      expect(container.get 'config.b.c').to.equal 2


    it 'should inject dotted service if present', ->
      module = new Module
      module.value 'a.b', 'a.b value'

      container = new Container [module]
      expect(container.get 'a.b').to.equal 'a.b value'


    it 'should provide "container"', ->
      module = new Module
      container = new Container [module]

      expect(container.get 'container').to.equal container


    it 'should throw error with full path if no provider', ->
      # a requires b requires c (not provided)
      aFn = (b) -> 'a-value'
      aFn.$inject = ['b']
      bFn = (c) -> 'b-value'
      bFn.$inject = ['c']

      module = new Module
      module.factory 'a', aFn
      module.factory 'b', bFn

      container = new Container [module]
      expect(-> container.get 'a').to.throw 'No provider for "c"! (Resolving: a -> b -> c)'


    it 'should throw error if circular dependency', ->
      module = new Module
      aFn = (b) -> 'a-value'
      aFn.$inject = ['b']
      bFn = (a) -> 'b-value'
      bFn.$inject = ['a']

      module = new Module
      module.factory 'a', aFn
      module.factory 'b', bFn

      container = new Container [module]
      expect(-> container.get 'a').to.throw 'Can not resolve circular dependency! ' +
                                           '(Resolving: a -> b -> a)'


  describe 'invoke', ->

    it 'should resolve dependencies', ->
      bar = (baz, abc) ->
        baz: baz
        abc: abc
      bar.$inject = ['baz', 'abc']

      module = new Module
      module.value 'baz', 'baz-value'
      module.value 'abc', 'abc-value'

      container = new Container [module]

      expect(container.invoke bar).to.deep.equal {baz: 'baz-value', abc: 'abc-value'}


    it 'should invoke function on given context', ->
      context = {}
      module = new Module
      container = new Container [module]

      container.invoke (-> expect(@).to.equal context), context


    it 'should throw error if a non function given', ->
      container = new Container []

      expect(-> container.invoke 123).to.throw 'Can not invoke "123". Expected a function!'
      expect(-> container.invoke 'abc').to.throw 'Can not invoke "abc". Expected a function!'
      expect(-> container.invoke null).to.throw 'Can not invoke "null". Expected a function!'
      expect(-> container.invoke undefined).to.throw 'Can not invoke "undefined". ' +
                                                    'Expected a function!'
      expect(-> container.invoke {}).to.throw 'Can not invoke "[object Object]". ' +
                                             'Expected a function!'


    it 'should auto parse arguments/comments if no $inject defined', ->
      bar = `function(/* baz */ a, abc) {
        return {baz: a, abc: abc};
      }`

      module = new Module
      module.value 'baz', 'baz-value'
      module.value 'abc', 'abc-value'

      container = new Container [module]
      expect(container.invoke bar).to.deep.equal {baz: 'baz-value', abc: 'abc-value'}


  describe 'instantiate', ->

    it 'should resolve dependencies', ->
      class Foo
        constructor: (@abc, @baz) ->
      Foo.$inject = ['abc', 'baz']

      module = new Module
      module.value 'baz', 'baz-value'
      module.value 'abc', 'abc-value'

      container = new Container [module]
      expect(container.instantiate Foo).to.deep.equal {abc: 'abc-value', baz: 'baz-value'}


    it 'should return returned value from constructor if an object returned', ->
      module = new Module
      container = new Container [module]
      returnedObj = {}

      ObjCls = -> returnedObj
      StringCls = -> 'some string'
      NumberCls = -> 123

      expect(container.instantiate ObjCls).to.equal returnedObj
      expect(container.instantiate StringCls).to.be.an.instanceof StringCls
      expect(container.instantiate NumberCls).to.be.an.instanceof NumberCls


  describe 'child', ->

    it 'should inject from child', ->
      moduleParent = new Module
      moduleParent.value 'a', 'a-parent'

      moduleChild = new Module
      moduleChild.value 'a', 'a-child'
      moduleChild.value 'd', 'd-child'

      container = new Container [moduleParent]
      child = container.createChild [moduleChild]

      expect(child.get 'd').to.equal 'd-child'
      expect(child.get 'a').to.equal 'a-child'


    it 'should provide the child container as "container"', ->
      container = new Container []
      childInjector = container.createChild []

      expect(childInjector.get 'container').to.equal childInjector


    it 'should inject from parent if not provided in child', ->
      moduleParent = new Module
      moduleParent.value 'a', 'a-parent'

      moduleChild = new Module
      moduleChild.factory 'b', (a) -> {a: a}

      container = new Container [moduleParent]
      child = container.createChild [moduleChild]

      expect(child.get 'b').to.deep.equal {a: 'a-parent'}


    it 'should inject from parent but never use dependency from child', ->
      moduleParent = new Module
      moduleParent.factory 'b', (c) -> 'b-parent'

      moduleChild = new Module
      moduleChild.value 'c', 'c-child'

      container = new Container [moduleParent]
      child = container.createChild [moduleChild]

      expect(-> child.get 'b').to.throw 'No provider for "c"! (Resolving: b -> c)'


    it 'should force new instance in child', ->
      moduleParent = new Module
      moduleParent.factory 'b', (c) -> {c: c}
      moduleParent.value 'c', 'c-parent'
      container = new Container [moduleParent]

      expect(container.get 'b').to.deep.equal {c: 'c-parent'}

      moduleChild = new Module
      moduleChild.value 'c', 'c-child'

      child = container.createChild [moduleChild], ['b']

      expect(child.get 'b').to.deep.equal {c: 'c-child'}


    it 'should force new instance using provider from grand parent', ->
      # regression
      moduleGrandParent = new Module
      moduleGrandParent.value 'x', 'x-grand-parent'

      container = new Container [moduleGrandParent]
      grandChildInjector = container.createChild([]).createChild([], ['x'])


    it 'should throw error if forced provider does not exist', ->
      moduleParent = new Module
      container = new Container [moduleParent]
      moduleChild = new Module

      expect(-> container.createChild [], ['b']).to.throw 'No provider for "b". Can not use ' +
                                                         'provider from the parent!'


  describe 'private modules', ->

    it 'should only expose public bindings', ->
      mA =
        __exports__: ['publicFoo'],
        'publicFoo': ['factory', (privateBar) -> {dependency: privateBar}]
        'privateBar': ['value', 'private-value']

      mB =
        'bar': ['factory', (privateBar) -> null]
        'baz': ['factory', (publicFoo) -> {dependency: publicFoo}]

      container = new Container [mA, mB]
      publicFoo = container.get 'publicFoo'
      expect(publicFoo).to.be.defined
      expect(publicFoo.dependency).to.equal 'private-value'
      expect(-> container.get 'privateBar').to.throw 'No provider for "privateBar"! (Resolving: privateBar)'
      expect(-> container.get 'bar').to.throw 'No provider for "privateBar"! (Resolving: bar -> privateBar)'
      expect(container.get('baz').dependency).to.equal publicFoo


    it 'should allow name collisions in private bindings', ->
      mA =
        __exports__: ['foo']
        'foo': ['factory', (conflict) -> conflict]
        'conflict': ['value', 'private-from-a']

      mB =
        __exports__: ['bar']
        'bar': ['factory', (conflict) -> conflict]
        'conflict': ['value', 'private-from-b']

      container = new Container [mA, mB]
      expect(container.get 'foo').to.equal 'private-from-a'
      expect(container.get 'bar').to.equal 'private-from-b'


    it 'should allow forcing new instance', ->
      module =
        __exports__: ['foo']
        'foo': ['factory', (bar) -> {bar: bar}]
        'bar': ['value', 'private-bar']

      container = new Container [module]
      firstChild = container.createChild [], ['foo']
      secondChild = container.createChild [], ['foo']
      fooFromFirstChild = firstChild.get 'foo'
      fooFromSecondChild = secondChild.get 'foo'

      expect(fooFromFirstChild).not.to.equal fooFromSecondChild
      expect(fooFromFirstChild.bar).to.equal fooFromSecondChild.bar


    it 'should load additional __modules__', ->
      mB =
        'bar': ['value', 'bar-from-other-module']

      mA =
        __exports__: ['foo']
        __modules__: [mB]
        'foo': ['factory', (bar) -> {bar: bar}]

      container = new Container [mA]
      foo = container.get 'foo'

      expect(foo).to.be.defined
      expect(foo.bar).to.equal 'bar-from-other-module'


    it 'should only create one private child container', ->
      m =
        __exports__: ['foo', 'bar']
        'foo': ['factory', (bar) -> {bar: bar}]
        'bar': ['factory', (internal) -> {internal: internal}]
        'internal': ['factory', -> {}]

      container = new Container [m]
      foo = container.get 'foo'
      bar = container.get 'bar'

      childInjector = container.createChild [], ['foo', 'bar']
      fooFromChild = childInjector.get 'foo'
      barFromChild = childInjector.get 'bar'

      expect(fooFromChild).to.not.equal foo
      expect(barFromChild).to.not.equal bar
      expect(fooFromChild.bar).to.equal barFromChild


  describe 'scopes', ->
    it 'should force new instances per scope', ->
      Foo = ->
      Foo.$scope = ['request']

      createBar = -> {}
      createBar.$scope = ['session']

      m =
        'foo': ['type', Foo]
        'bar': ['factory', createBar]

      container = new Container [m]
      foo = container.get 'foo'
      bar = container.get 'bar'

      sessionInjector = container.createChild [], ['session']
      expect(sessionInjector.get 'foo').to.equal foo
      expect(sessionInjector.get 'bar').to.not.equal bar

      requestInjector = container.createChild [], ['request']
      expect(requestInjector.get 'foo').to.not.equal foo
      expect(requestInjector.get 'bar').to.equal bar
