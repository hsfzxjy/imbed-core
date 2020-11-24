/** @format */

import path from "path"
import Imbed from "core/Imbed"
import expEval from "expression-eval"
import expandTlide from "expand-tilde"

import consts from "./consts"

export function parseOptions(input: string): [Object | null, string] {
    let parts = input.split(consts.TOKEN_PARAM_DELIMITER)
    if (parts.length !== 2) return [null, input]
    input = parts[0]
    let params = {}
    parts[1].split(",").forEach((part) => {
        let splitted_part = part.split("=")
        if (splitted_part.length !== 2) return
        let [key, value] = splitted_part
        params[key] = expEval.eval(expEval.parse(value), {})
    })
    return [params, input]
}

function resolvePath(input: string, baseDir?: string): string {
    if (path.isAbsolute(input)) return input
    baseDir = baseDir ?? process.cwd()
    input = expandTlide(input)
    input = path.resolve(baseDir, input)
    return input
}

function resolveSource(src: string, baseDir?: string): string {
    if (consts.SPECIAL_SOURCES.has(src)) return src
    return resolvePath(src, baseDir)
}

export function parseSource(input: string, baseDir?: string): { src: string; dest: string; blankDest: boolean } {
    if (!input.includes(consts.TOKEN_PIPE))
        return {
            src: resolvePath(input, baseDir),
            dest: path.basename(input),
            blankDest: true,
        }
    let parts = input.split(consts.TOKEN_PIPE)
    if (parts.length !== 2 || !parts[0]) throw Error(`Invalid source ${input}.`)

    return {
        src: resolveSource(parts[0], baseDir),
        dest: parts[1],
        blankDest: false,
    }
}

export default {
    name: "normalize",
    deps: [],
    handle(ctx: Imbed) {
        if (!ctx.input.length) ctx.input.push(["clip>"])
        ctx.input = ctx.input.map((spec: string) => {
            let [options, source] = parseOptions(spec)
            let result: any = {
                options,
                source: parseSource(source, ctx.baseDir),
            }
            return result
        })
        ctx.output = ctx.input.map((input) => ({ input }))
    },
}
