/** @format */

import { EventEmitter } from "events"

export class ScopedEventEmitter extends EventEmitter {
    private _scopeStack: string[]
    private _scopedListeners: Map<string, [string | symbol, (...args) => void][]>
    private _finalizers: Map<string, (() => void)[]>

    constructor() {
        super()
        this._scopeStack = []
        this._scopedListeners = new Map()
        this._finalizers = new Map()
    }

    private empty(): Boolean {
        return this._scopeStack.length === 0
    }

    private currentScope(): string {
        if (this.empty()) throw Error("Scope stack empty")
        return this._scopeStack[this._scopeStack.length - 1]
    }

    private trackListener(event: string | symbol, listener: (...args: any[]) => void) {
        if (!this.empty()) {
            this._scopedListeners.get(this.currentScope())!.push([event, listener])
        }
    }

    once(event: string | symbol, listener: (...args: any[]) => void): this {
        super.once(event, listener)
        this.trackListener(event, listener)
        return this
    }

    on(event: string | symbol, listener: (...args: any[]) => void): this {
        super.on(event, listener)
        this.trackListener(event, listener)
        return this
    }

    enter(scope: string): this {
        if (this._scopedListeners.get(scope) !== undefined) {
            throw Error(`Re-entering scope ${scope}.`)
        }
        this._scopeStack.push(scope)
        this._scopedListeners.set(scope, [])
        this._finalizers.set(scope, [])
        return this
    }

    leave(scope: string): this {
        if (this.currentScope() !== scope) {
            throw Error(`Invalid scope ${scope}.`)
        }
        this._scopeStack.pop()
        this._scopedListeners.get(scope)!.forEach(([event, listener]) => {
            this.off(event, listener)
        })
        this._scopedListeners.delete(scope)
        this._finalizers.get(scope)!.forEach((finalizer) => finalizer())
        this._finalizers.delete(scope)
        return this
    }

    finally(finalizer: () => void): this {
        this._finalizers.get(this.currentScope())!.push(finalizer)
        return this
    }
}
