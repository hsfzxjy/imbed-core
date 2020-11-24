/** @format */

import Configer from "lib/Configer"
import Logger from "lib/Logger"
import Registry from "lib/Registry"
import Commander from "lib/Commander"
import Dependencies from "lib/Dependencies"
import PluginManager from "lib/PluginManager"

import Lifecycle from "core/Lifecycle"

import Client from "lib/Client"
import { IRegistries, IImageInfo } from "utils/interfaces"
import { except } from "utils/except"
import { ScopedEventEmitter } from "utils/events"

class Imbed extends ScopedEventEmitter {
    private lifecycle: Lifecycle

    cfg: Configer
    log: Logger
    input: any[]
    cmd: Commander
    hooks: IRegistries
    output: IImageInfo[]
    deps: Dependencies
    plugins: PluginManager
    baseDir?: string
    client: ReturnType<typeof Client.create>

    constructor(configPath: string = "") {
        super()
        this.cfg = new Configer(configPath)
        this.deps = new Dependencies()
        this.cmd = new Commander(this)
        this.log = new Logger(this)

        this.output = []
        this.input = []
        this.hooks = {
            transformer: new Registry("transformer"),
            uploader: new Registry("uploader"),
            beforeTransform: new Registry("beforeTransform"),
            beforeUpload: new Registry("beforeUpload"),
            afterUpload: new Registry("afterUpload"),
        }

        except({
            emit: { ["upload-progress"]: [-1] },
        }).do(() => {
            this.client = Client.create(this)
            this.plugins = new PluginManager(this)
            this.plugins.load()
            this.lifecycle = new Lifecycle(this)
        })
    }

    loadCommands(): void {
        if (this.cfg.path !== "") {
            this.cmd.init()
            this.cmd.loadCommands()
        }
    }

    async upload(input: any[], baseDir?: string): Promise<any> {
        this.baseDir = baseDir
        await this.lifecycle.start(input)
    }

    render(input: any[], options: { baseDir?: string; forceRender?: boolean; forceUpload?: boolean }): Promise<any> {
        this.baseDir = options.baseDir
        this.cfg.events.enter("render")
        this.cfg.events
            .on("get", (key, ref) => {
                if (key === "core.transforms") {
                    ref.value.splice(0, 0, "render")
                }
            })
            .on("get", (key, ref) => {
                if (key === "render.options") {
                    ref.value = options
                }
            })

        return except({
            rethrow: false,
            log: true,
            logMessage: true,
        })
            .do(() => this.lifecycle.start(input))
            .finally(() => this.cfg.events.leave("render"))
    }

    async suggest(opts): Promise<any> {
        const name = this.cfg.uploader()
        const uploader = this.hooks.uploader.get(name)
        if (typeof uploader?.suggest !== "function") {
            throw Error(`Uploader - ${name} does not support suggestion.`)
        }
        const suggestions = await uploader!.suggest!(this, opts)

        const suggestionOutputs = suggestions.results
            .map((item) => item.name + "\t" + item.url)
            .concat(suggestions.truncated ? ["..."] : [])
        console.log(suggestionOutputs.join("\n"))
    }
}

export default Imbed
