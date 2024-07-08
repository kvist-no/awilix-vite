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

const invalidModules = {
    './dir/invalid.js': { invalidExport: function Invalid() {} },
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
test('should throw when using loadModules with dynamic imports (eager: false)', async (t) => {
    const container = createMockContainer();

    await assert.rejects(
        async () => {
            await loadModules(container, dynamicModules);
        },
        (err) => {
            assert.strictEqual(err.name, 'AwilixViteError');
            assert.strictEqual(err.message, "Dynamic imports detected in the result of import.meta.glob. Please set the eager option to true in the import.meta.glob call like this \"import.meta.glob('/*.ts', { eager: true })\".");
            return true;
        },
        'loadModules should throw an error for modules imported without { eager: true }'
    );
});


// Test static imports
test('loadModules with static imports (eager: true)', async (t) => {
    const container = createMockContainer();

    await loadModules(container, staticModules);

    assert(container.hasRegistration('foo'), 'foo should be registered');
    assert(container.hasRegistration('bar'), 'bar should be registered');
    assert(container.hasRegistration('fooBar'), 'fooBar should be registered');
});

// Test static imports
test('loadModules with static imports and options (eager: true)', async (t) => {
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

test('loadModules should throw an error for invalid modules', async (t) => {
    const container = createMockContainer();
    const options = {};

    await assert.rejects(
        async () => {
            await loadModules(container, invalidModules, options);
        },
        (err) => {
            assert.strictEqual(err.name, 'AwilixViteError');
            assert.match(err.message, /Failed to get name and module from path/);
            return true;
        },
        'loadModules should throw an error for invalid modules'
    );
});