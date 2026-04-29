import { RESOLVER, asClass, asFunction, isClass, isFunction } from 'awilix/browser'

class AwilixViteError extends Error {
    name = "AwilixViteError"
}

/**
 * @typedef {Object<string, () => Promise<any>>} DynamicImportModules
 * @typedef {Object<string, any>} StaticImportModules
 * @typedef {{
 *   resolverOptions?: import('awilix').BuildResolverOptions,
 *   formatName?: (name: string) => string,
 *   lazy?: boolean
 * }} LoadOptions
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

    if (options?.lazy) {
        registerLazily(container, globResult, options)
        return
    }

    for(const [path, loadedModule] of Object.entries(globResult)) {
        const [name, resolvedModule] = getNameAndModule(path, loadedModule)
        const formatedName = options?.formatName ? options.formatName(name) : formatNameToCamelCase(name)

        const reg = options?.resolverOptions?.register ?? (isClass(resolvedModule) ? asClass : asFunction)

        container.register(formatedName, reg(resolvedModule, options))
    }
}

/**
 * Registers each module's default export lazily — `loadedModule.default` is
 * read inside the resolver factory, not at registration time. This sidesteps
 * dev-server module-loading races where Vite's SSR loader can hand back a
 * namespace whose `default` slot isn't yet populated when a very large eager
 * glob batch is loaded under concurrency.
 *
 * Lazy mode supports default exports only. Modules using a RESOLVER-tagged
 * named export should use the default (eager) mode.
 *
 * `resolverOptions.register` is ignored in lazy mode (the resolver is always
 * `asFunction`, which dispatches via `new` for classes and a plain call for
 * factory functions). Other resolver options like `lifetime` are passed through.
 *
 * @param {import('awilix').AwilixContainer} container
 * @param {StaticImportModules} globResult
 * @param {LoadOptions} options
 */
function registerLazily(container, globResult, options) {
    const resolverOptions = stripRegisterOption(options?.resolverOptions)

    for (const [path, loadedModule] of Object.entries(globResult)) {
        const baseName = extractBaseName(path)
        const formatedName = options?.formatName ? options.formatName(baseName) : formatNameToCamelCase(baseName)

        container.register(
            formatedName,
            asFunction((cradle) => {
                const value = loadedModule.default
                if (!isFunction(value)) {
                    throw new AwilixViteError(buildLazyResolveError(path, loadedModule))
                }
                return isClass(value) ? new value(cradle) : value(cradle)
            }, resolverOptions)
        )
    }
}

/**
 * @param {import('awilix').BuildResolverOptions | undefined} resolverOptions
 */
function stripRegisterOption(resolverOptions) {
    if (!resolverOptions) return undefined
    // The `register` option doesn't apply in lazy mode — drop it so awilix
    // doesn't try to use it as the resolver builder for asFunction.
    const { register: _register, ...rest } = resolverOptions
    return rest
}

/**
 * @param {string} path
 * @param {any} loadedModule
 */
function getNameAndModule(path, loadedModule) {
    const name = extractBaseName(path)

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
 * Extracts the file's base name from a glob path: `./dir/foo.svelte.ts` -> `foo`.
 * @param {string} path
 */
function extractBaseName(path) {
    return path
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

/**
 * @param {string} path
 * @param {any} loadedModule
 */
function buildLazyResolveError(path, loadedModule) {
    const hasDefault = 'default' in loadedModule
    const defaultValue = loadedModule.default
    const defaultDescriptor = !hasDefault
        ? 'is missing'
        : defaultValue === null
            ? 'is null'
            : `is ${typeof defaultValue}`

    return (
        `Module at "${path}" has no callable default export at resolve time ` +
        `(default ${defaultDescriptor}, expected a class or function). ` +
        `Lazy mode supports default exports only — for RESOLVER-tagged named ` +
        `exports use eager mode (omit \`lazy\`).`
    )
}

function formatNameToCamelCase(string) {
    return string[0].toLowerCase() + string.slice(1)
}
