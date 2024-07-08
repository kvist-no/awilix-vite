# awilix-vite

The awilix-vite plugin is designed for the Awilix dependency injection library. It provides a loadModules method that allows Vite users to achieve almost the same behavior as the loadModules method in the original Awilix library by using Vite's `import.meta.glob`.

## Installation
To install the awilix-vite plugin, you need to have Awilix and Vite set up in your project. You can then install the plugin via your desired package manager:

```
npm install awilix-vite
```

## Usage

The `loadModules` method provided by this plugin allows you to load and register modules into an Awilix container using the result of Vite's `import.meta.glob` function.

### Importing the Plugin

```javascript
import { createContainer } from 'awilix';
import { loadModules } from 'awilix-vite';
```

### Setting Up the Container

Create an Awilix container where the modules will be registered.

```javascript
const container = createContainer();
```

### Loading Modules

Use the `import.meta.glob` function to dynamically import your modules. You can use either lazy loading or eager loading.

#### Eager Loading (recommended)
```javascript
const modules = import.meta.glob('./path/to/modules/*.js', { eager: true });

loadModules(container, modules, {
  resolverOptions: {
    // Optional: Awilix resolver options
  },
  formatName: (name) => name // Optional: Custom function to format module names, defaults to camelCase
});
```

#### Lazy Loading
```javascript
const modules = import.meta.glob('./path/to/modules/*.js');

loadModules(container, modules, {
  resolverOptions: {
    // Optional: Awilix resolver options
  },
  formatName: (name) => name // Optional: Custom function to format module names, defaults to camelCase
});
```

#### Differences between Lazy and Eager loading

The main difference between "lazy" and "eager" loading with `import.meta.glob` is the transformed output. Using the default lazy import will result in the following output

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

This library will load all of the modules immediately in parallel, so there is no large benefit in importing the the modules lazily. Therefore we recommend setting `eager: true`.

### Example
Here's a complete example of how to use the awilix-vite plugin to load and register modules.

```javascript
import { createContainer } from 'awilix';
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
- globResult (required): The result of either import.meta.glob('/*.js') or import.meta.glob('/*.js', { eager: true }).
- options (optional): An object containing the following properties:
    - resolverOptions: Optional Awilix resolver options.
    - formatName: Optional function to format module names.

## Gotcha's

The `import.meta.glob` method will be transformed by Vite from

```javascript
const modules = import.meta.glob('./dir/*.js')
```

into

```javascript
// code produced by vite
const modules = {
  './dir/foo.js': () => import('./dir/foo.js'),
  './dir/bar.js': () => import('./dir/bar.js'),
}
```

by using static code analysis. Because of this behaviour, it's not possible to create a function like this:

```javascript
function loadModules(glob) {
    return import.meta.glob(glob)
}
```

Since Vite cannot know how it should transform the code; the method does not exist at runtime. That is why
you have to seperately use the `import.meta.glob` yourself, and then the `loadModules` method from this library
will pass the result of `import.meta.glob` into Awilix.