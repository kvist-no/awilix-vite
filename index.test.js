import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createContainer, asClass, asFunction, RESOLVER } from 'awilix';
import { loadModules } from './index.js';

// Mock modules
class FooBar {}
// The RESOLVER symbol has to be defined like this (cannot be in the constructor)
FooBar[RESOLVER] = {}

const dynamicModules = {
    './dir/foo.js': async () => ({ default: class Foo {} }),
    './dir/bar.js': async () => ({ default: function Bar() {}, namedExport: function NamedExport() {} }),
    './dir/fooBar.index.js': async () => ({ 
        FooBar
    }),
};

const staticModules = {
    './dir/foo.js': { default: class Foo {} },
    './dir/bar.js': { default: function Bar() {}, namedExport: function NamedExport() {} },
    './dir/fooBar.index.js': { 
        FooBar
    },
};

// Mock functions
function formatName(name) {
    return name.toUpperCase();
}

// Helper function to create a mock container
function createMockContainer() {
    return createContainer();
}

// Test dynamic imports
test('loadModules with dynamic imports', async (t) => {
    const container = createMockContainer();

    await loadModules(container, dynamicModules);

    assert(container.hasRegistration('foo'), 'foo should be registered');
    assert(container.hasRegistration('bar'), 'bar should be registered');
    assert(container.hasRegistration('fooBar'), 'fooBar should be registered');
});

test('loadModules with dynamic imports and options', async (t) => {
    const container = createMockContainer();
    const options = { formatName };

    await loadModules(container, dynamicModules, options);

    assert(container.hasRegistration('FOO'), 'FOO should be registered');
    assert(container.hasRegistration('BAR'), 'BAR should be registered');
    assert(container.hasRegistration('FOOBAR'), 'FOOBAR should be registered');
});

// Test static imports
test('loadModules with static imports', async (t) => {
    const container = createMockContainer();

    await loadModules(container, staticModules);

    assert(container.hasRegistration('foo'), 'foo should be registered');
    assert(container.hasRegistration('bar'), 'bar should be registered');
    assert(container.hasRegistration('fooBar'), 'fooBar should be registered');
});

// Test static imports
test('loadModules with static imports and options', async (t) => {
    const container = createMockContainer();
    const options = { formatName };

    await loadModules(container, staticModules, options);

    assert(container.hasRegistration('FOO'), 'FOO should be registered');
    assert(container.hasRegistration('BAR'), 'BAR should be registered');
    assert(container.hasRegistration('FOOBAR'), 'FOOBAR should be registered');
});

// Test with resolverOptions using asClass
test('loadModules with resolverOptions using asClass', async (t) => {
    const container = createMockContainer();
    const options = { resolverOptions: { register: asClass } };

    await loadModules(container, staticModules, options);

    assert(container.hasRegistration('foo'), 'foo should be registered');
    assert(container.hasRegistration('bar'), 'bar should be registered');
    assert(container.hasRegistration('fooBar'), 'fooBar should be registered');
    assert(container.resolve('foo') instanceof staticModules['./dir/foo.js'].default, 'foo should be an instance of Foo class');
    assert(container.resolve('fooBar') instanceof staticModules['./dir/fooBar.index.js'].FooBar, 'foo should be an instance of FooBar class');
});

// Test with resolverOptions using asFunction
test('loadModules with resolverOptions using asFunction', async (t) => {
    const container = createMockContainer();
    const options = { resolverOptions: { register: asFunction } };

    await loadModules(container, staticModules, options);

    assert(container.hasRegistration('foo'), 'foo should be registered');
    assert(container.hasRegistration('bar'), 'bar should be registered');
    assert(container.hasRegistration('fooBar'), 'fooBar should be registered');
});


// Test with custom formatName
test('loadModules with custom formatName', async (t) => {
    const container = createMockContainer();
    const options = { formatName };

    await loadModules(container, staticModules, options);

    assert(container.hasRegistration('FOO'), 'FOO should be registered');
    assert(container.hasRegistration('BAR'), 'BAR should be registered');
});