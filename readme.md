# awilix-vite

The awilix-vite plugin is designed for the [Awilix dependency injection library](https://github.com/jeffijoe/awilix). It provides a loadModules method that allows Vite users to achieve almost the same behavior as the loadModules method in the original Awilix library by using Vite's `import.meta.glob`. The available `loadModules` method will take the result from `import.meta.glob` and load the modules correctly with Awilix.

## Installation
To install the awilix-vite plugin, you need to have Awilix and Vite set up in your project. You can then install the plugin via your desired package manager:

```
npm install awilix-vite
```

## Usage

The `loadModules` method provided by this plugin allows you to load and register modules into an Awilix container using the result of Vite's `import.meta.glob` function.

### Importing the Plugin

```javascript
import { createContainer } from 'awilix/browser';
import { loadModules } from 'awilix-vite';
```

### Setting Up the Container

Create an Awilix container where the modules will be registered.

```javascript
const container = createContainer();
```

### Loading Modules

Use the `import.meta.glob` with `eager` set to `true` to dynamically import your modules. 

```javascript
const modules = import.meta.glob('./path/to/modules/*.js', { eager: true });

loadModules(container, modules, {
  resolverOptions: {
    // Optional: Awilix resolver options
  },
  formatName: (name) => name // Optional: Custom function to format module names, defaults to camelCase
});
```

#### Why use { eager: true }?

When using `import.meta.glob` Vite will transform the code 

```javascript
const modules = import.meta.glob('./dir/*.js')
```

into the following output:

```javascript
// code produced by vite
const modules = {
  './dir/foo.js': () => import('./dir/foo.js'),
}
```

while using `eager: true` will result in the following output:

```javascript
// code produced by vite:
import { setup as __glob__0_0 } from './dir/foo.js'
import { setup as __glob__0_1 } from './dir/bar.js'
const modules = {
  './dir/foo.js': __glob__0_0,
  './dir/bar.js': __glob__0_1,
}
```

When using `loadModules` all the modules are supposed to be loaded immediately, so there is no benefit in importing the the modules lazily. Therefore we recommend setting `eager: true` to increase performance.

### Example
Here's a complete example of how to use the awilix-vite plugin to load and register modules.

```javascript
import { createContainer } from 'awilix/browser';
import { loadModules } from 'awilix-vite';

const container = createContainer();

const modules = import.meta.glob('./services/*.js', { eager: true });

loadModules(container, modules, {
  resolverOptions: {
    lifetime: 'SINGLETON' // Example: Set lifetime to SINGLETON
  },
  formatName: (name) => `myPrefix${name.charAt(0).toUpperCase() + name.slice(1)}` // Example: Prefix and camelCase module names
});
```

## API

`loadModules(container, globResult, options)`

Parameters
- container (required): The Awilix container where the modules should be registered.
- globResult (required): The result of `import.meta.glob('./dir/*.js', { eager: true })`.
- options (optional): An object containing the following properties:
    - `resolverOptions`: Optional Awilix resolver options (e.g. `lifetime`).
    - `formatName`: Optional function to format module names.
    - `lazy`: When `true`, defer reading each module's default export to resolve
      time. Use this in large applications to avoid Vite dev-server
      module-loading races. See [Lazy mode](#lazy-mode) below.

## Lazy mode

By default, `loadModules` reads `loadedModule.default` for every entry as it
walks the glob result and registers each one immediately. In small projects
this is fine, but in large applications with hundreds of modules in a single
eager glob, you may occasionally see `AwilixViteError: Failed to register
module at "<path>"` on a cold dev-server start — where the failing path
differs between runs and the file itself has a valid default export.

This is a Vite dev-server module-loading race: under SSR with a very large
eager glob, a module's namespace can be observed mid-evaluation, with
`default` not yet populated. The eager read trips on it.

Pass `lazy: true` to defer the read to first resolve. By then, module
evaluation has completed and the namespace is fully populated. The race window
is gone.

```javascript
const modules = import.meta.glob('./services/**/*.ts', { eager: true });

loadModules(container, modules, {
  lazy: true,
  resolverOptions: { lifetime: 'SINGLETON' }
});
```

Lazy mode supports default exports only. For modules using a `RESOLVER`-tagged
named export, omit `lazy` and use the default (eager) mode. The
`resolverOptions.register` option is ignored in lazy mode (the resolver is
always `asFunction`, which dispatches via `new` for classes and a plain call
for factory functions).

If `default` is still missing or non-callable at resolve time, the resolver
throws an `AwilixViteError` describing what was actually present. A failure
that's reproducible at resolve time (always the same module) means the file
genuinely lacks a usable default export.

## Why do i have to use `import.meta.glob`?

The `import.meta.glob` method will be transformed by Vite from

```javascript
const modules = import.meta.glob('./dir/*.js', { eager: true })
```

into

```javascript
// code produced by vite:
import { setup as __glob__0_0 } from './dir/foo.js'
import { setup as __glob__0_1 } from './dir/bar.js'
const modules = {
  './dir/foo.js': __glob__0_0,
  './dir/bar.js': __glob__0_1,
}
```

by using static code analysis. Because of this behaviour, it's not possible to create a function like this:

```javascript
function loadModules(glob) {
    return import.meta.glob(glob, { eager: true })
}
```

Vite will not know what files should be imported since the code is transformed during build. This is why
you have to seperately use the `import.meta.glob` yourself, and use the `loadModules` method from this library to
correctly load the modules automatically with Awilix.
