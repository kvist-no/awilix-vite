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
export function loadModules(container: import('awilix').AwilixContainer, globResult: DynamicImportModules | StaticImportModules, options: LoadOptions): void;
export type DynamicImportModules = {
    [x: string]: () => Promise<any>;
};
export type StaticImportModules = {
    [x: string]: any;
};
export type LoadOptions = {
    resolverOptions?: import("awilix").BuildResolverOptions<any>;
    formatName?: (name: string) => string;
};
