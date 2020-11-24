/** @format */

import spawn_ from "cross-spawn"
import { SpawnResult } from "./interfaces"
import { except } from "./except"
import { SpawnOptions } from "child_process"

export function spawn(
    exe: string,
    args: string[],
    options: SpawnOptions = {},
    pipe: Boolean = false
): Promise<SpawnResult> {
    return except({
        rethrow: true,
    }).promise((resolve, reject) => {
        options = Object.assign({ cwd: process.cwd() }, options ?? {})
        options.env = Object.assign(process.env, options.env ?? {})
        const p = spawn_(exe, args, options)
        let stdout: Buffer[] = []
        let stderr: Buffer[] = []
        p.stdout.on("data", (data: Buffer) => stdout.push(data))
        p.stderr.on("data", (data: Buffer) => stderr.push(data))

        if (pipe) {
            p.stdout.pipe(process.stdout)
            p.stderr.pipe(process.stderr)
        }

        p.on("exit", (code: number) => {
            resolve({
                code,
                stdout: Buffer.concat(stdout),
                stderr: Buffer.concat(stderr),
            })
        })
        p.on("error", (err: Error) => {
            reject(err)
        })
    })
}
