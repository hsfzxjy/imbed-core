/** @format */

import Imbed from "core/Imbed"
import { IHook } from "utils/interfaces"
import { except } from "utils/except"
import { Question } from "inquirer"
import { asynclib } from "utils/common"

interface ISelectorOptions<T> {
    type?: string
    message: string
    choices: string[]
    default: T
}

class SubListSelector {
    private static splitter = /\s*,\s*/
    private static joiner = ", "

    private ctx: Imbed
    private options: ISelectorOptions<string[]>
    private candidateSet: Set<string>

    constructor(ctx: Imbed, options: ISelectorOptions<string[]>) {
        this.ctx = ctx
        this.options = options
        this.candidateSet = new Set(options.choices)
    }

    async start(): Promise<string[]> {
        let answer: any = await this.ctx.cmd.inquirer.prompt([
            {
                type: "autocomplete",
                name: "value",
                suggestOnly: true,
                message: this.options.message,
                default: this.options.default.join(SubListSelector.joiner),
                source: this.source.bind(this),
                validate: this.validate.bind(this),
            } as Question,
        ])
        return this.partition(answer.value)
    }

    private partition(input: string): string[] {
        return input.trim().split(SubListSelector.splitter)
    }

    private source(_, input: string | undefined): string[] {
        input = input ?? ""
        const parts = input.trim().split(SubListSelector.splitter)
        const selected = parts.slice(0, -1)
        const selectedSet = new Set(selected)
        const prefix = selected.join(SubListSelector.joiner)
        const current = parts.slice(-1).pop()!

        return this.options.choices //
            .filter((x) => !selectedSet.has(x) && x.startsWith(current))
            .map((x) => (prefix ? prefix + SubListSelector.joiner : "") + x)
    }

    private validate(input: string | undefined): Boolean {
        return this.partition(input ?? "") //
            .every((x) => this.candidateSet.has(x))
    }
}

class ItemSelector<T = string> {
    private ctx: Imbed
    private options: ISelectorOptions<T>

    constructor(ctx: Imbed, options: ISelectorOptions<T>) {
        this.ctx = ctx
        this.options = options
    }

    async start(): Promise<T> {
        let answer: any = await this.ctx.cmd.inquirer.prompt([
            {
                type: this.options.type ?? "list",
                name: "value",
                ...this.options,
            },
        ])
        return answer.value
    }
}

const use: IHook = {
    handle: async (ctx: Imbed) => {
        const cmd = ctx.cmd
        cmd.program
            .command("use")
            .arguments("[module]")
            .description("Enable specific transformers, uploader or plugins")
            .action((module?: string) =>
                except(async () => {
                    const config = {
                        uploader: {
                            selector: ItemSelector,
                            dumper(uploader: string) {
                                ctx.cfg.update({ "core.uploader": uploader })
                            },
                            options: {
                                message: "Use an uploader",
                                choices: Array.from(ctx.hooks.uploader.keys()),
                                default: ctx.cfg.uploader(),
                            },
                        },
                        transformer: {
                            selector: SubListSelector,
                            dumper(transforms: string[]) {
                                ctx.cfg.update({ "core.transforms": transforms })
                            },
                            options: {
                                message: "Use transforms",
                                choices: Array.from(ctx.hooks.transformer.keys()),
                                default: ctx.cfg.transforms(),
                            },
                        },
                        plugin: {
                            selector: ItemSelector,
                            dumper(plugins: string[] | undefined) {
                                ctx.cfg.update({
                                    enabled: (plugins ?? []) //
                                        .reduce((obj, x) => {
                                            obj[x] = true
                                            return obj
                                        }, {}),
                                })
                            },
                            options: {
                                type: "checkbox",
                                name: "plugins",
                                message: "Use plugins",
                                choices: ctx.plugins.availablePlugins(),
                                default: Object.entries(ctx.cfg.get("enabled", {}))
                                    .filter(([_, value]) => value)
                                    .map(([key, _]) => key),
                            },
                        },
                    }
                    // if an option is specific, then just set this option in config
                    let modules: string[] = []
                    if (!module) {
                        modules = Array.from(Object.keys(config))
                    } else if (!(module in config)) {
                        ctx.log.error(`Invalid name "${module}"`)
                        ctx.log.error("Choices are: uploader | transformer | plugin")
                        return
                    } else {
                        modules.push(module)
                    }
                    asynclib.seq(
                        modules.map((module) => async () => {
                            const subconfig = config[module]
                            const selector = new subconfig.selector(ctx, subconfig.options)
                            subconfig.dumper(await selector.start())
                        })
                    )
                })
            )
    },
}

export default use
