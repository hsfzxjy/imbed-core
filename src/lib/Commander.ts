/** @format */

import Imbed from "core/Imbed"
import program from "commander"
import inquirer from "inquirer"
import { IHook } from "utils/interfaces"
// import commanders from "plugins/core/commander"
import pkg from "../../package.json"
import Registry from "lib/Registry"
// import Logger from "lib/Logger"

class Commander {
    hooks: Registry

    program: typeof program
    inquirer: typeof inquirer
    private readonly ctx: Imbed

    constructor(ctx: Imbed) {
        this.hooks = new Registry("cmd")
        this.program = program
        this.inquirer = inquirer
        inquirer.registerPrompt("autocomplete", require("inquirer-autocomplete-prompt"))

        this.ctx = ctx
    }

    init(): void {
        this.program
            .version(pkg.version, "-v, --version")
            .option("-d, --debug", "Turn on debug mode", () => {
                this.ctx.cfg.update({
                    debug: true,
                })
            })
            .option("-s, --silent", "Turn on silent mode", () => {
                this.ctx.cfg.update({
                    ["logger.silent"]: true,
                })
            })
            .on("command:*", () => {
                this.ctx.log.error(
                    `Invalid command: ${this.program.args.join(" ")}\nSee --help for a list of available commands.`
                )
                process.exit(1)
            })

        // built-in commands
        // commanders(this.ctx)
    }

    register(name: string, plugin: IHook): void {
        if (!name) throw new TypeError("`name` is required")
        if (typeof plugin.handle !== "function") throw new TypeError("`plugin.handle()` must be a function!")
        if (this.hooks.has(name)) throw new TypeError(`Duplicated name ${name}`)

        this.hooks.register(name, plugin)
    }

    loadCommands(): void {
        Array.from(this.hooks.values()) //
            .map((plugin) => plugin.handle(this.ctx))
    }

    get(name: string): IHook {
        return this.hooks.get(name)!
    }

    getList(): IHook[] {
        return Array.from(this.hooks.values())
    }
}

export default Commander
