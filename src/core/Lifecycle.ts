/** @format */

import { EventEmitter } from "events"
import Imbed from "core/Imbed"
import { IHook } from "utils/interfaces"
import { asynclib, urllib } from "utils/common"
import Registry from "lib/Registry"
import { except } from "utils/except"

class Lifecycle extends EventEmitter {
    ctx: Imbed

    constructor(ctx: Imbed) {
        super()
        this.ctx = ctx
    }

    async start(input: any[]): Promise<any> {
        return await except({
            emit: { "upload-failed": [] },
        })
            .do(async () => {
                if (!Array.isArray(input)) {
                    throw new Error("Input must be an array.")
                }
                this.ctx.input = input
                this.ctx.output = []

                // lifecycle main
                this.ctx.enter("lifecycle")
                await this.beforeTransform()
                await this.doTransform()
                await this.beforeUpload()
                await this.doUpload()
                await this.afterUpload()
            })
            .finally(() => {
                this.ctx.leave("lifecycle")
            })
    }

    private async beforeTransform(): Promise<Imbed> {
        this.ctx.emit("upload-progress", 0)
        this.ctx.emit("before-transform", this.ctx)
        await this.handleHooks(this.ctx.hooks.beforeTransform)
        return this.ctx
    }

    private async doTransform(): Promise<Imbed> {
        this.ctx.emit("upload-progress", 30)
        await this.handleHooks(this.ctx.hooks.transformer, this.ctx.cfg.transforms())
        return this.ctx
    }

    private async beforeUpload(): Promise<Imbed> {
        this.ctx.emit("upload-progress", 60)
        this.ctx.emit("before-upload", this.ctx)
        await this.handleHooks(this.ctx.hooks.beforeUpload)
        return this.ctx
    }

    private async doUpload(): Promise<Imbed> {
        let name = this.ctx.cfg.uploader()
        let uploader = this.ctx.hooks.uploader.get(name, "smms")!
        this.ctx.log.info(`Uploader - ${name} running`)

        if (
            !this.ctx.cfg.get<any>("render.options")?.forceUpload &&
            !uploader.supportSoftUpload &&
            this.ctx.output.some((x) => x.needsUpload)
        ) {
            throw new Error(`Uploader - ${name} does not support soft upload`)
        }

        await uploader?.handle(this.ctx)
        for (const outputImg of this.ctx.output) {
            outputImg.type = name
        }
        this.ctx.log.info(`Uploader - ${name} done`)
        return this.ctx
    }

    private async afterUpload(): Promise<Imbed> {
        this.ctx.emit("upload-progress", 100)
        this.ctx.emit("after-upload", this.ctx)
        await this.handleHooks(this.ctx.hooks.afterUpload)
        this.ctx.emit("upload-finished", this.ctx)

        this.printImageURLs()

        return this.ctx
    }

    private printImageURLs() {
        const result = this.ctx.output
            .map((out) => {
                delete out.buffer
                return urllib.encode(out.imgUrl)
            })
            .join("\n")
        this.ctx.log.success("===> URL(s)\n" + result)
    }

    private async handleHooks(registry: Registry, entries?: string[]): Promise<Imbed> {
        const hooks = registry.resolve(entries)
        if (hooks.missing.length) {
            hooks.missing.forEach((name) => {
                this.ctx.log.error(`Unknown ${registry.name} - ${name}`)
            })
            throw Error(`Unknown ${registry.name}: ${hooks.missing}`)
        }
        await asynclib.M(hooks.resolved).seqEach(([name, hook]: [string, IHook]) =>
            except({
                handler: () => {
                    this.ctx.log.error(`${registry.name} - ${name} error`)
                },
            }).do(async () => {
                if (!hook.handle) {
                    this.ctx.log.warn(`${registry.name} - ${name} has no \`handle()\`, skipped`)
                    return
                }
                this.ctx.log.info(`${registry.name} - ${name} running`)
                await hook.handle(this.ctx)
                this.ctx.log.info(`${registry.name} - ${name} done`)
            })
        )

        return this.ctx
    }
}

export default Lifecycle
