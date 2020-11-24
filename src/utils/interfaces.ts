/** @format */

import Imbed from "core/Imbed"
import Registry from "lib/Registry"

import { Options } from "request-promise-native"

export type RequestOptions = Options

export interface IHookOptionsItem {
    name: string
    type: string
    required: boolean
    default?: any
    [propName: string]: any
}

export interface IRegistries {
    beforeTransform: Registry<IHook>
    transformer: Registry<IHook>
    beforeUpload: Registry<IHook>
    uploader: Registry<IUploaderHook>
    afterUpload: Registry<IHook>
}

export interface IImageInfo {
    buffer?: Buffer
    fileName?: string
    width?: number
    height?: number
    extname?: string
    [propName: string]: any
}

export interface IConfig {
    core: {
        uploader: string
        transformers: string[]
        proxy: string
    }
    enabled: {
        [propName: string]: boolean
    }

    debug: boolean
    logger: {
        logLevel: string[] | string | undefined
        logPath: string
        silent: boolean
    }
    registry: string
}

interface IExceptEmitOptions {
    [key: string]: any[]
}
export interface IExceptOptions {
    rethrow?: Boolean
    log?: Boolean
    logMessage?: Boolean
    ctx?: Imbed
    emit?: IExceptEmitOptions
    handler?: (e: Error) => any
}

export interface ISuggestionOptions {
    prefix?: string
    marker?: string
}
export interface ISuggestionResult {
    results: {
        name: string
        url: string
    }[]
    truncated: Boolean
}
export interface IHook {
    handle: ((ctx: Imbed) => Promise<any>) | ((ctx: Imbed) => void)
    config?: (ctx: Imbed) => any
    error?: IExceptOptions
    [propName: string]: any
}

export interface IUploaderHook extends IHook {
    suggest?: (ctx: Imbed, options: ISuggestionOptions) => ISuggestionResult | Promise<ISuggestionResult>
    supportSoftUpload?: boolean
}

export interface SpawnResult {
    code: number
    stdout: Buffer
    stderr: Buffer
}

export interface IOptions {
    template: string // template name
    dest: string // destination for template to generate
    hasSlash: boolean // check if is officail template
    inPlace: boolean // check if is given project name
    clone: boolean // check if use git clone
    offline: boolean // check if use offline mode
    tmp: string // cache template
    project: string // project name
}

export interface IProcessEnv {
    [propName: string]: string | undefined
}
