/** @format */

import Imbed from "core/Imbed"
import { IHook, IHookOptionsItem } from "utils/interfaces"
import { except } from "utils/except"

interface InteractiveConfigerOptions {
    module: string
    moduleChoices: string[]
    loader: (string) => IHook | undefined
}

class InteractiveConfiger {
    private options: InteractiveConfigerOptions
    private ctx: Imbed

    constructor(ctx: Imbed, options: InteractiveConfigerOptions) {
        this.ctx = ctx
        this.options = options
    }

    async start(name: string | undefined) {
        if (name === undefined) {
            name = await this.choose()
        }
        const item = this.options.loader(name)
        if (item === undefined) {
            this.ctx.log.error(`No ${module} named ${name}.`)
            process.exit(1)
        }

        if (typeof item.config === "function") {
            await this.configItem(item.config(this.ctx), name)
        }
    }

    async configItem(prompts: IHookOptionsItem, name: string): Promise<void> {
        const answer = await this.ctx.cmd.inquirer.prompt(prompts)
        const configTarget = `${this.options.module}.${name}`
        this.ctx.cfg.update({
            [configTarget]: answer,
        })
    }

    private async choose(): Promise<string> {
        const prompts = [
            {
                type: "list",
                name: this.options.module,
                choices: this.options.moduleChoices,
                message: `Choose a(n) ${this.options.module}`,
            },
        ]
        const answer = await this.ctx.cmd.inquirer.prompt<string>(prompts)
        return answer[this.options.module]
    }
}

export default {
    handle: (ctx: Imbed) => {
        const cmd = ctx.cmd
        cmd.program
            .command("set")
            .alias("config")
            .arguments("<module> [name]")
            .description("Configure an imbed transformer, uploader or plugin")
            .action((module: string, name: string) =>
                except(async () => {
                    switch (module) {
                        case "uploader":
                        case "transformer":
                            await new InteractiveConfiger(ctx, {
                                module,
                                moduleChoices: Array.from(ctx.hooks[module].keys()),
                                loader: (name) => {
                                    return ctx.hooks[module].get(name)
                                },
                            }).start(name)
                            break
                        case "plugin":
                            await new InteractiveConfiger(ctx, {
                                module,
                                moduleChoices: ctx.plugins.loadedPluginNames,
                                loader: (name) => {
                                    name = ctx.plugins.normalizeName(name)
                                    if (!Object.keys(ctx.cfg.get("enabled")).includes(name)) return
                                    return ctx.plugins.loadPlugin(name)
                                },
                            }).start(name)
                            break
                        default:
                            ctx.log.warn(`Invalid name "${module}"`)
                            ctx.log.warn(`Choices are: [uploader | transformer | plugin]`)
                            return
                    }
                    ctx.log.success("Configured successfully")
                })
            )
    },
}
