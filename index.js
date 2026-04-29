import { RESOLVER, asClass, asFunction, isClass, isFunction } from 'awilix/browser'

class AwilixViteError extends Error {
    name = "AwilixViteError"
}

/**
 * @typedef {Object<string, () => Promise<any>>} DynamicImportModules
 * @typedef {Object<string, any>} StaticImportModules
 * @typedef {{ resolverOptions?: import('awilix').BuildResolverOptions, formatName?: (name: string) => string }} LoadOptions
 */

/**
 * @description
 * @param {import('awilix').AwilixContainer} container The container where the modules should be registered
 * @param {DynamicImportModules|StaticImportModules} globResult - The result of either doing import.meta.glob('/*.ts') or import.meta.glob('/*.ts', { eager: true })
 * @param {LoadOptions} options
 */
export function loadModules(container, globResult, options) {
    if(Object.values(globResult).some(mod => isFunction(mod))) {
        throw new AwilixViteError("Dynamic imports detected in the result of import.meta.glob. Please set the eager option to true in the import.meta.glob call like this \"import.meta.glob('/*.ts', { eager: true })\".")
    }

    for(const [path, loadedModule] of Object.entries(globResult)) {
        const [name, resolvedModule] = getNameAndModule(path, loadedModule)
        const formatedName = options?.formatName ? options.formatName(name) : formatNameToCamelCase(name)

        const reg = options?.resolverOptions?.register ?? (isClass(resolvedModule) ? asClass : asFunction)

        container.register(formatedName, reg(resolvedModule, options))
    }
}

/**
 * @param {string} path 
 * @param {any} loadedModule 
 */
function getNameAndModule(path, loadedModule) {
    const name = path
        // Replace Windows path separators with Posix path
        .replace(/\\/g, '/')
        // Split the path...
        .split('/')
        // ... and take the last part of the filepath
        .pop()
        // Split the result with . 
        .split('.')
        // And expect the first result of the split to be the name of the file
        .shift()

    if (loadedModule.default && isFunction(loadedModule.default)) {
        // ES6 default export
        return [name, loadedModule.default]
    }

    // loop through non-default exports, but require the RESOLVER property set for
    // it to be a valid service module export.
    for (const [key, value] of Object.entries(loadedModule)) {
        if (key === 'default') {
          // default case handled separately due to its different name (file name)
          continue
        }

        // isFunction first: `RESOLVER in value` throws a TypeError when `value` is a
        // primitive (string, number, boolean, etc.), which would otherwise crash
        // module loading for any file that legitimately exports such a value.
        if (isFunction(value) && RESOLVER in value) {
            return [key, value]
        }
    }

    throw new AwilixViteError(buildLoadFailureMessage(path, loadedModule))
}

/**
 * @param {string} path
 * @param {any} loadedModule
 */
function buildLoadFailureMessage(path, loadedModule) {
    const hasDefault = 'default' in loadedModule
    const defaultValue = loadedModule.default
    const defaultDescriptor = !hasDefault
        ? 'is missing'
        : defaultValue === null
            ? 'is null'
            : `is ${typeof defaultValue}`

    const otherKeys = Object.keys(loadedModule).filter(k => k !== 'default')
    const otherKeysDescriptor = otherKeys.length
        ? `[${otherKeys.join(', ')}]`
        : 'none'

    return (
        `Failed to register module at "${path}". ` +
        `default export ${defaultDescriptor} (expected a class or function); ` +
        `other exports: ${otherKeysDescriptor}. ` +
        `If this happens sporadically and the file does have a valid default export, ` +
        `you may be hitting a Vite dev-server module-loading race during cold start ` +
        `with very large eager globs — see the readme "Known issues" section.`
    )
}

function formatNameToCamelCase(string) {
    return string[0].toLowerCase() + string.slice(1)
}