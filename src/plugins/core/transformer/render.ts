/** @format */

import Imbed from "core/Imbed"
import { createHash } from "crypto"
import * as fs from "fs-extra"
import * as os from "os"
import * as path from "path"
import LRU from "lru-cache"
import rimraf from "rimraf"
import { spawn } from "utils/spawn"
import { SpawnResult } from "utils/interfaces"
import FileType from "file-type"
import { except } from "utils/except"
import { asynclib, imagelib } from "utils/common"
import Logger from "lib/Logger"

interface RendererInput {
    stdin: Boolean
    source: {
        src: string
        dest: string
        blankDest: boolean
    }
}

function hash(payload: string): string {
    return createHash("sha1").update(payload).digest("hex")
}

class CacheManager {
    private baseDir: string
    private statesPath: string
    private lru: LRU<string, number>
    private static instance: CacheManager

    static get_instance(baseDir?: string): CacheManager {
        if (CacheManager.instance !== undefined) return CacheManager.instance
        if (baseDir === undefined) throw new Error()
        return (CacheManager.instance = new CacheManager(baseDir))
    }

    private constructor(baseDir: string) {
        this.baseDir = path.join(baseDir, "render_cache")
        fs.mkdirSync(this.baseDir, { recursive: true })

        this.statesPath = path.join(this.baseDir, "lru_states.json")

        this.lru = new LRU({
            max: 500,
            dispose: (key: string) => this.deleteEntryDir(key),
            noDisposeOnSet: true,
        })
        this.loadStates()
    }

    private loadStates() {
        if (!fs.existsSync(this.statesPath)) return

        const states = fs.readJsonSync(this.statesPath, { throws: false })
        if (states) this.lru.load(states)
    }

    dumpStates() {
        fs.writeJSONSync(this.statesPath, this.lru.dump())
    }

    deleteEntryDir(key: string) {
        rimraf.sync(this.entryDir(key))
    }

    entryDir(key: string): string {
        return path.join(this.baseDir, key)
    }

    ensureEntryDir(key: string): void {
        fs.mkdirSync(this.entryDir(key), { recursive: true })
    }

    set(key: string): this {
        this.lru.set(key, 1)
        this.entryDir(key)
        this.dumpStates()
        return this
    }

    exists(key: string): boolean {
        if (!this.lru.has(key)) return false
        const entryDir = this.entryDir(key)
        if (fs.existsSync(entryDir)) return true
        this.lru.del(key)
        return false
    }
}

class Renderer {
    private ctx: Imbed
    private input: RendererInput
    readonly sourceContentHash: string
    private sourceContent: string
    private sourcePath: string
    private cacheManager: CacheManager
    private cacheDir: string

    constructor(ctx: Imbed, input: RendererInput) {
        this.ctx = ctx
        this.input = input
        this.sourceContent = this.getContent()
        this.sourceContentHash = hash(this.sourceContent)
        this.sourcePath = this.ensureSourceExecutable()

        this.cacheManager = CacheManager.get_instance(ctx.cfg.baseDir)
        this.cacheDir = this.cacheManager.entryDir(this.sourceContentHash)
    }

    private getContent(): string {
        if (this.input.stdin) return this.input.source.src
        return fs.readFileSync(this.input.source.src).toString("utf-8")
    }

    private ensureSourceExecutable(): string {
        if (!this.input.stdin) return this.input.source.src
        const destFilename = path.join(os.tmpdir(), this.sourceContentHash)
        fs.writeFileSync(destFilename, this.sourceContent)
        fs.chmodSync(destFilename, 0b111101101)
        return destFilename
    }

    private get filenameStorage(): string {
        return path.join(this.cacheDir, "output_filename")
    }

    private get destStorage(): string {
        return path.join(this.cacheDir, "dest_filename")
    }

    private dest(ext: string): string {
        return this.input.source.blankDest || !this.input.source.dest
            ? this.sourceContentHash + ext
            : this.input.source.dest
    }

    private imageFromCache(): string | undefined {
        if (!fs.existsSync(this.filenameStorage)) return
        const filename = fs.readFileSync(this.filenameStorage).toString().trim()
        if (!filename.startsWith(this.cacheDir)) return
        if (!fs.existsSync(filename)) return
        return filename
    }

    private async imageFromExecutionOutput(result: SpawnResult): Promise<string> {
        const fileType = await FileType.fromBuffer(result.stdout)
        if (fileType === undefined) {
            let filename = path.join(this.cacheDir, result.stdout.toString().trim())
            if (!fs.existsSync(filename)) {
                throw new Error(`File '${filename}' not found`)
            }
            return filename
        }

        let filename = path.join(this.cacheDir, "output." + fileType.ext)
        fs.writeFileSync(filename, result.stdout)
        return filename
    }

    async render(): Promise<{ outputFilename: string; needsUpload: boolean; dest: string }> {
        let imageFile: string | undefined
        if (this.cacheManager.exists(this.sourceContentHash) && !this.ctx.cfg.get<any>("render.options")?.forceRender) {
            imageFile = this.imageFromCache()
            Logger.debug(`Cache Hit. Using ${imageFile}`)
            this.cacheManager.set(this.sourceContentHash)
            // if (imageFile) return { outputFilename: imageFile, needsUpload: false }
        }

        if (!imageFile) {
            Logger.debug(`Cache Missed. Re-rendering...`)
            const executeResult = await spawn(this.sourcePath, [], { env: { IMBED_OUTPUT_DIR: this.cacheDir } })
            if (executeResult.code !== 0) throw new Error(executeResult.stderr.toString())
            this.cacheManager.ensureEntryDir(this.sourceContentHash)

            await except({
                rethrow: true,
                handler: () => this.cacheManager.deleteEntryDir(this.sourceContentHash),
            }).do(async () => {
                imageFile = await this.imageFromExecutionOutput(executeResult)
            })
            Logger.debug(`Rendered successfully. File at ${imageFile}`)

            fs.writeFileSync(this.filenameStorage, imageFile)
            this.cacheManager.set(this.sourceContentHash)
        }

        const dest = this.dest(path.extname(imageFile!))
        const prevDest = fs.existsSync(this.destStorage) ? fs.readFileSync(this.destStorage).toString().trim() : ""
        const needsUpload = dest !== prevDest
        fs.writeFileSync(this.destStorage, dest)
        return { outputFilename: imageFile!, needsUpload, dest }
    }
}

async function handle(ctx: Imbed) {
    await asynclib.M(ctx.input).seqEach(async (item, index) => {
        const renderer = new Renderer(ctx, item)
        const { outputFilename, needsUpload, dest } = await renderer.render()

        const info = await imagelib.load(outputFilename)
        Object.assign(ctx.output[index], {
            buffer: info.buffer,
            fileName: dest,
            extname: info.extname,
            needsUpload,
        })
    })
}

export default {
    handle,
}
