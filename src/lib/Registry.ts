/** @format */

import { IHook } from "utils/interfaces"
// import { threadId } from "worker_threads"

const DEFAULT_GROUP_NAME = "core"

type Dependency = Map<string, string[]>

function resolveDependencies(entries: string[], dependencies: Dependency): string[] {
    function traverse(entry: string) {
        explored.add(entry)
        ;(dependencies.get(entry) ?? []).forEach((next) => {
            if (!explored.has(next)) traverse(entry)
        })

        results.push(entry)
    }

    let results: string[] = []
    let explored = new Set<string>()
    entries.forEach((entry) => {
        if (!explored.has(entry)) traverse(entry)
    })

    return results
}

class Registry<T = IHook> {
    private static currentGroupName: string = DEFAULT_GROUP_NAME

    private readonly mapping: Map<string, T>
    private readonly groupMapping: Map<string, [string, T][]>
    private readonly dependencies: Dependency
    readonly name: string

    constructor(name: string) {
        this.name = name
        this.mapping = new Map()
        this.groupMapping = new Map()
        this.dependencies = new Map()
    }

    static setGroup(groupName: string) {
        this.currentGroupName = groupName
    }

    static resetGroup() {
        this.currentGroupName = DEFAULT_GROUP_NAME
    }

    register(name: string, hook: T, deps: string[] = []): void {
        if (!name) throw new TypeError("name is required!")
        if (this.mapping.has(name)) {
            throw new TypeError(`${this.name} duplicate name: ${name}!`)
        }
        this.mapping.set(name, hook)
        this.dependencies.set(name, deps)

        let groupName = Registry.currentGroupName
        if (!this.groupMapping.has(groupName)) {
            this.groupMapping.set(groupName, [[name, hook]])
        } else {
            this.groupMapping.get(groupName)?.push([name, hook])
        }
    }

    unregister(groupName: string): void {
        this.groupMapping.get(groupName)?.forEach(([name, _]) => {
            this.mapping.delete(name)
            this.dependencies.delete(name)
        })
        this.groupMapping.delete(groupName)
    }

    get(name: string, defaultName?: string): T | undefined
    get(name: string, defaultHook?: T): T
    get(name: string, arg?: string | T): T | undefined {
        const result = this.mapping.get(name)
        if (result !== undefined) return result
        if (arg === undefined) return
        if (typeof arg === "string") return this.mapping.get(arg)
        return arg
    }

    keys(): IterableIterator<string> {
        return this.mapping.keys()
    }

    values(): IterableIterator<T> {
        return this.mapping.values()
    }

    entries(): IterableIterator<[string, T]> {
        return this.mapping.entries()
    }

    has(name: string): Boolean {
        return this.mapping.has(name)
    }

    resolve(entries: string[] | undefined = undefined): { resolved: [string, T][]; missing: string[] } {
        const missing = (entries ?? []).filter((entry) => !this.mapping.has(entry))
        let keys = Array.from(entries ?? this.keys())
        keys = resolveDependencies(keys, this.dependencies)
        const resolved = keys.map((key): [string, T] => [key, this.mapping.get(key)!])
        return { missing, resolved }
    }
}

export default Registry
