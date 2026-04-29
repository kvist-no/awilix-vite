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
export function loadModules(container: import('awilix').AwilixContainer, globResult: DynamicImportModules | StaticImportModules, options?: LoadOptions): void;
export type DynamicImportModules = {
    [x: string]: () => Promise<any>;
};
export type StaticImportModules = {
    [x: string]: any;
};
export type LoadOptions = {
    resolverOptions?: import("awilix").BuildResolverOptions<any>;
    formatName?: (name: string) => string;
    /**
     * When `true`, modules' default exports are read at resolve time rather than
     * at registration time. Use this to avoid Vite dev-server module-loading
     * races in large applications with hundreds of modules in a single eager
     * glob, where a namespace can occasionally be observed before its `default`
     * slot is populated. Lazy mode supports default exports only and ignores
     * `resolverOptions.register`.
     */
    lazy?: boolean;
};
