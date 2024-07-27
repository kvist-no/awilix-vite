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
test('should throw when using loadModules with dynamic imports (eager: false)', () => {
    const container = createMockContainer();

    assert.rejects(
        async () => {
             loadModules(container, dynamicModules);
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
test('loadModules with static imports (eager: true)', () => {
    const container = createMockContainer();

     loadModules(container, staticModules);

    assert(container.hasRegistration('foo'), 'foo should be registered');
    assert(container.hasRegistration('bar'), 'bar should be registered');
    assert(container.hasRegistration('fooBar'), 'fooBar should be registered');
});

// Test static imports
test('loadModules with static imports and options (eager: true)', () => {
    const container = createMockContainer();
    const options = { formatName };

     loadModules(container, staticModules, options);

    assert(container.hasRegistration('FOO'), 'FOO should be registered');
    assert(container.hasRegistration('BAR'), 'BAR should be registered');
    assert(container.hasRegistration('FOOBAR'), 'FOOBAR should be registered');
});

// Test with resolverOptions using asClass
test('loadModules with resolverOptions using asClass', () => {
    const container = createMockContainer();
    const options = { resolverOptions: { register: asClass } };

     loadModules(container, staticModules, options);

    assert(container.hasRegistration('foo'), 'foo should be registered');
    assert(container.hasRegistration('bar'), 'bar should be registered');
    assert(container.hasRegistration('fooBar'), 'fooBar should be registered');
    assert(container.resolve('foo') instanceof staticModules['./dir/foo.js'].default, 'foo should be an instance of Foo class');
    assert(container.resolve('fooBar') instanceof staticModules['./dir/fooBar.index.js'].FooBar, 'foo should be an instance of FooBar class');
});

// Test with resolverOptions using asFunction
test('loadModules with resolverOptions using asFunction', () => {
    const container = createMockContainer();
    const options = { resolverOptions: { register: asFunction } };

     loadModules(container, staticModules, options);

    assert(container.hasRegistration('foo'), 'foo should be registered');
    assert(container.hasRegistration('bar'), 'bar should be registered');
    assert(container.hasRegistration('fooBar'), 'fooBar should be registered');
});


// Test with custom formatName
test('loadModules with custom formatName', () => {
    const container = createMockContainer();
    const options = { formatName };

     loadModules(container, staticModules, options);

    assert(container.hasRegistration('FOO'), 'FOO should be registered');
    assert(container.hasRegistration('BAR'), 'BAR should be registered');
});

test('loadModules should throw an error for invalid modules', () => {
    const container = createMockContainer();
    const options = {};

    assert.rejects(
        async () => {
             loadModules(container, invalidModules, options);
        },
        (err) => {
            assert.strictEqual(err.name, 'AwilixViteError');
            assert.match(err.message, /Failed to get name and module from path/);
            return true;
        },
        'loadModules should throw an error for invalid modules'
    );
});