/** @format */

import lowdb from "lowdb"
import lodashId from "lodash-id"
import FileSync from "lowdb/adapters/FileSync"
import json from "comment-json"
import { homedir } from "os"
import path from "path"
import fs from "fs-extra"
import { ScopedEventEmitter } from "utils/events"

export default class Configer {
    // private readonly ctx: Imbed
    private readonly db: lowdb.LowdbSync<any>
    readonly baseDir: string
    readonly path: string

    readonly events: ScopedEventEmitter

    constructor(configPath: string) {
        // this.ctx = ctx
        configPath = this.resolveConfigPath(configPath)
        this.baseDir = path.resolve(path.dirname(configPath))
        this.path = configPath

        const adapter = new FileSync(configPath, {
            serialize(obj: object): string {
                return json.stringify(obj, null, 2)
            },
            deserialize: json.parse,
        })
        this.db = lowdb(adapter)
        this.db._.mixin(lodashId)

        this.db
            .defaultsDeep({
                core: {
                    uploader: "smms",
                },
                ["enabled-plugins"]: [],
            })
            .write()

        this.events = new ScopedEventEmitter()
    }

    private resolveConfigPath(configPath: string): string {
        if (configPath === "") {
            configPath = homedir() + "/.imbed/config.json"
        }
        if (path.extname(configPath).toUpperCase() !== ".JSON") {
            configPath = ""
            throw Error("The configuration file only supports JSON format.")
        }
        if (!fs.pathExistsSync(configPath)) {
            fs.ensureFileSync(`${configPath}`)
        }
        return configPath
    }

    read(): any {
        return this.db.read()
    }

    get<T>(key: string = "", defaultValue: T | undefined = undefined): T {
        let ret = this.read().get(key).value()
        const ref = { value: ret }
        this.events.emit("get", key, ref)
        ret = ref.value
        if (ret === undefined) ret = (defaultValue as unknown) as T
        return ret
    }

    getUntil<T>(keys: string[], defaultValue: T | undefined = undefined): T {
        for (let key of keys) {
            let ret = this.get<T>(key)
            if (ret !== undefined) return ret
        }
        return (defaultValue as unknown) as T
    }

    set(key: string, value: any): this {
        this.read().set(key, value).write()
        return this
    }

    has(key: string): boolean {
        return this.read().has(key).value()
    }

    insert(key: string, value: any): this {
        this.read().get(key).insert(value).write()
        return this
    }

    unset(key: string, value: any): this {
        if (!key || !value) return this
        this.read().get(key).unset(value).write()
        return this
    }

    update(config: Object): void {
        Object.keys(config).forEach((name: string) => {
            this.set(name, config[name])
        })
    }

    transforms(): string[] {
        return this.getUntil<string[]>(["core.transforms"], ["path"])
    }

    uploader(): string {
        return this.getUntil<string>(["core.uploader", "core.current"], "smms")
    }
}
