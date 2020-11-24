/** @format */

import Imbed from "core/Imbed"
import fs from "fs-extra"
import path from "path"
import resolve from "resolve"
import { SpawnResult, IProcessEnv } from "utils/interfaces"

import Registry from "lib/Registry"
import corePlugin from "plugins/core"
import { spawn } from "utils/spawn"

class PluginManager {
    ctx: Imbed
    loadedPluginNames: string[]
    private packageJSONPath: string

    constructor(ctx: Imbed) {
        this.ctx = ctx
        this.loadedPluginNames = []
        this.ensurePackageJson()
    }

    private ensurePackageJson(): void {
        this.packageJSONPath = path.join(this.ctx.cfg.baseDir, "package.json")
        if (!fs.existsSync(this.packageJSONPath)) {
            const pkg = {
                name: "imbed-plugins",
                description: "imbed-plugins",
                repository: "https://github.com/Molunerfinn/Imbed-Core",
                license: "MIT",
            }
            fs.writeFileSync(this.packageJSONPath, JSON.stringify(pkg), "utf8")
        }
    }

    // get plugin entry
    resolvePlugin(ctx: Imbed, name: string): string {
        try {
            return resolve.sync(name, { basedir: ctx.cfg.baseDir })
        } catch (err) {
            return path.join(ctx.cfg.baseDir, "node_modules", name)
        }
    }

    // load all third party plugin
    load() {
        this.loadPlugin(corePlugin).register()
        for (const module of this.availablePlugins()) {
            this.registerPlugin(module)
        }
    }

    availablePlugins(): string[] {
        const packagePath = path.join(this.ctx.cfg.baseDir, "package.json")
        const pluginDir = path.join(this.ctx.cfg.baseDir, "node_modules/")
        if (!fs.existsSync(pluginDir)) {
            return []
        }
        const json = fs.readJSONSync(packagePath)
        const deps = Object.keys(json.dependencies || {})
        const devDeps = Object.keys(json.devDependencies || {})
        return deps //
            .concat(devDeps)
            .filter((name: string) => {
                if (!/^imbed-plugin-|^@[^/]+\/imbed-plugin-/.test(name)) return false
                const path = this.resolvePlugin(this.ctx, name)
                return fs.existsSync(path)
            })
    }

    registerPlugin(name: string): void {
        if (!this.ctx.cfg.get<Boolean>(`enabled.${name}`)) return
        try {
            this.loadedPluginNames.push(name)
            // this.ctx.setCurrentPluginName(name)
            Registry.setGroup(name)
            this.loadPlugin(name).register()
            this.ctx.cfg.update({
                [`enabled.${name}`]: true,
            })
        } catch (e) {
            this.loadedPluginNames = this.loadedPluginNames.filter((item: string) => item !== name)
            this.ctx.log.error(e)
            this.ctx.emit("notification", {
                title: `Plugin ${name} Load Error`,
                body: e,
            })
        } finally {
            Registry.resetGroup()
        }
    }

    unregisterPlugin(name: string): void {
        this.loadedPluginNames = this.loadedPluginNames.filter((item: string) => item !== name)
        // this.ctx.setCurrentPluginName(name)
        Registry.setGroup(name)
        this.ctx.hooks.uploader.unregister(name)
        this.ctx.hooks.transformer.unregister(name)
        this.ctx.hooks.beforeTransform.unregister(name)
        this.ctx.hooks.beforeUpload.unregister(name)
        this.ctx.hooks.afterUpload.unregister(name)
        this.ctx.cfg.unset("enabled", name)
        Registry.resetGroup()
    }

    normalizeName(name: string): string {
        if (!name.includes("imbed-plugin-")) {
            name = `imbed-plugin-${name}`
        }
        return name
    }

    // get plugin by name
    loadPlugin(obj: string | Function): any {
        let plugin
        if (typeof obj === "string") {
            let name = obj
            const pluginDir = path.join(this.ctx.cfg.baseDir, "node_modules/")
            name = path.join(pluginDir, name)
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            plugin = require(name)
            if (typeof plugin.default === "function") plugin = plugin.default
        } else {
            plugin = obj
        }
        return plugin(this.ctx)
    }

    async execCommand(cmd: string, modules: string[], proxy: string = "", env: IProcessEnv = {}): Promise<SpawnResult> {
        const registry = this.ctx.cfg.get<string | undefined>("registry")
        let args = [cmd].concat(modules).concat("--color=always").concat("--save")
        if (registry) {
            args = args.concat(`--registry=${registry}`)
        }
        if (proxy) {
            args = args.concat(`--proxy=${proxy}`)
        }
        return await spawn("npm", args, { cwd: this.ctx.cfg.baseDir, env })
    }

    async install(plugins: string[], proxy: string = "", env?: IProcessEnv): Promise<void> {
        plugins = plugins.map((item: string) => "imbed-plugin-" + item)
        const result = await this.execCommand("install", plugins, proxy, env)
        if (!result.code) {
            plugins.forEach((plugin: string) => {
                this.ctx.plugins.registerPlugin(plugin)
            })
            this.ctx.log.success("插件安装成功")
            this.ctx.emit("installSuccess", {
                title: "插件安装成功",
                body: plugins,
            })
        } else {
            const err = `插件安装失败，失败码为${result.code}，错误日志为${result.stderr}`
            this.ctx.log.error(err)
            this.ctx.emit("installFailed", {
                title: "插件安装失败",
                body: err,
            })
        }
    }

    async uninstall(plugins: string[]): Promise<void> {
        plugins = plugins.map((item: string) => "imbed-plugin-" + item)
        const result = await this.execCommand("uninstall", plugins)
        if (!result.code) {
            plugins.forEach((plugin: string) => {
                this.ctx.plugins.unregisterPlugin(plugin)
            })
            this.ctx.log.success("插件卸载成功")
            this.ctx.emit("uninstallSuccess", {
                title: "插件卸载成功",
                body: plugins,
            })
        } else {
            const err = `插件卸载失败，失败码为${result.code}，错误日志为${result.stderr}`
            this.ctx.log.error(err)
            this.ctx.emit("uninstallFailed", {
                title: "插件卸载失败",
                body: err,
            })
        }
    }

    async update(plugins: string[], proxy: string = "", env?: IProcessEnv): Promise<void> {
        plugins = plugins.map((item: string) => "imbed-plugin-" + item)
        const result = await this.execCommand("update", plugins, proxy, env)
        if (!result.code) {
            this.ctx.log.success("插件更新成功")
            this.ctx.emit("updateSuccess", {
                title: "插件更新成功",
                body: plugins,
            })
        } else {
            const err = `插件更新失败，失败码为${result.code}，错误日志为 \n ${result.stderr}`
            this.ctx.log.error(err)
            this.ctx.emit("updateFailed", {
                title: "插件更新失败",
                body: err,
            })
        }
    }
}
export default PluginManager
