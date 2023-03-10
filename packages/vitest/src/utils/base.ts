import type { Arrayable, DeepMerge, Nullable, ResolvedConfig, VitestEnvironment } from '../types'

function isFinalObj(obj: any) {
  return obj === Object.prototype || obj === Function.prototype || obj === RegExp.prototype
}

function collectOwnProperties(obj: any, collector: Set<string | symbol> | ((key: string | symbol) => void)) {
  const collect = typeof collector === 'function' ? collector : (key: string | symbol) => collector.add(key)
  Object.getOwnPropertyNames(obj).forEach(collect)
  Object.getOwnPropertySymbols(obj).forEach(collect)
}

export function groupBy<T, K extends string | number | symbol>(collection: T[], iteratee: (item: T) => K) {
  return collection.reduce((acc, item) => {
    const key = iteratee(item)
    acc[key] ||= []
    acc[key].push(item)
    return acc
  }, {} as Record<K, T[]>)
}

export function getAllMockableProperties(obj: any, isModule: boolean) {
  const allProps = new Map<string | symbol, { key: string | symbol; descriptor: PropertyDescriptor }>()
  let curr = obj
  do {
    // we don't need properties from these
    if (isFinalObj(curr))
      break

    collectOwnProperties(curr, (key) => {
      const descriptor = Object.getOwnPropertyDescriptor(curr, key)
      if (descriptor)
        allProps.set(key, { key, descriptor })
    })
    // eslint-disable-next-line no-cond-assign
  } while (curr = Object.getPrototypeOf(curr))
  // default is not specified in ownKeys, if module is interoped
  if (isModule && !allProps.has('default') && 'default' in obj) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, 'default')
    if (descriptor)
      allProps.set('default', { key: 'default', descriptor })
  }
  return Array.from(allProps.values())
}

export function notNullish<T>(v: T | null | undefined): v is NonNullable<T> {
  return v != null
}

export function slash(str: string) {
  return str.replace(/\\/g, '/')
}

export const noop = () => { }

export function getType(value: unknown): string {
  return Object.prototype.toString.apply(value).slice(8, -1)
}

/**
 * Convert `Arrayable<T>` to `Array<T>`
 *
 * @category Array
 */

export function toArray<T>(array?: Nullable<Arrayable<T>>): Array<T> {
  if (array === null || array === undefined)
    array = []

  if (Array.isArray(array))
    return array

  return [array]
}

export const toString = (v: any) => Object.prototype.toString.call(v)
export const isPlainObject = (val: any): val is object =>
  // `Object.create(null).constructor` is `undefined`
  // `{}.constructor.name` is `Object`
  // `new (class A{})().constructor.name` is `A`
  toString(val) === '[object Object]' && (!val.constructor || val.constructor.name === 'Object')

export function isObject(item: unknown): boolean {
  return item != null && typeof item === 'object' && !Array.isArray(item)
}

/**
 * Deep merge :P
 *
 * Will merge objects only if they are plain
 */
export function deepMerge<T extends object = object, S extends object = T>(target: T, ...sources: S[]): DeepMerge<T, S> {
  if (!sources.length)
    return target as any

  const source = sources.shift()
  if (source === undefined)
    return target as any

  if (isMergeableObject(target) && isMergeableObject(source)) {
    (Object.keys(source) as (keyof S & keyof T)[]).forEach((key) => {
      if (isMergeableObject(source[key])) {
        if (!target[key])
          target[key] = {} as any

        deepMerge(target[key] as any, source[key] as any)
      }
      else {
        target[key] = source[key] as any
      }
    })
  }

  return deepMerge(target, ...sources)
}

function isMergeableObject(item: any): item is Object {
  return isPlainObject(item) && !Array.isArray(item)
}

export function stdout(): NodeJS.WriteStream {
  // @ts-expect-error Node.js maps process.stdout to console._stdout
  // eslint-disable-next-line no-console
  return console._stdout || process.stdout
}

export function getEnvironmentTransformMode(config: ResolvedConfig, environment: VitestEnvironment) {
  if (!config.deps?.experimentalOptimizer?.enabled)
    return undefined
  return environment === 'happy-dom' || environment === 'jsdom' ? 'web' : 'ssr'
}
