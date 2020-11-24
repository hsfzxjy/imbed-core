/** @format */

import Logger from "lib/Logger"

import { IExceptOptions } from "utils/interfaces"

const defaultErrorHandlingOptions: IExceptOptions = {
    rethrow: true,
    log: false,
    logMessage: false,
    emit: {},
}

function handleError(e: any, options: IExceptOptions) {
    options = Object.assign({}, defaultErrorHandlingOptions, options)
    const { rethrow, log, emit, ctx, handler } = options

    if (log) Logger.error(options.logMessage ? e.message : e)
    if (emit && ctx)
        Object.entries(emit).forEach(([key, args]) => {
            ctx.emit(key, ...args, e)
        })
    if (handler) handler(e)
    if (rethrow) throw e
}

export function except(cfg?: IExceptOptions): { do: Function; promise: Function }
export function except(f: () => void, cfg?: IExceptOptions): void
export function except<T>(f: () => Promise<T>, cfg?: IExceptOptions): Promise<T>
export function except<T>(promise: Promise<T>, cfg?: IExceptOptions): Promise<T>
export function except(arg: any, cfg: IExceptOptions = defaultErrorHandlingOptions): any {
    if (arg instanceof Promise) {
        return arg.catch((e) => handleError(e, cfg))
    }
    if (arg === undefined || !(arg instanceof Function)) {
        return {
            do: (f) => except(f, arg),
            promise: (f) => except(new Promise(f), arg),
        }
    }

    try {
        const ret = arg()
        if (ret instanceof Promise) {
            return except(ret, cfg)
        }
    } catch (e) {
        handleError(e, cfg)
    }
}
