/** @format */

import Imbed from "core/Imbed"
import { IHook } from "utils/interfaces"
import { except } from "utils/except"

const pluginHandler: IHook = {
    handle: (ctx: Imbed) => {
        // const pluginHandler = new PluginHandler(ctx)
        const cmd = ctx.cmd
        cmd.program
            .command("install <plugins...>")
            .description("install imbed plugin")
            .alias("add")
            .option("-p, --proxy <proxy>", "Add proxy for installing")
            .action((plugins: string[], program: any) => {
                except(ctx.plugins.install(plugins, program.proxy))
            })
        cmd.program
            .command("uninstall <plugins...>")
            .alias("rm")
            .description("Uninstall imbed plugin(s)")
            .action((plugins: string[]) => {
                except(ctx.plugins.uninstall(plugins))
            })
        cmd.program
            .command("update <plugins...>")
            .description("Upgrade imbed plugin(s) to latest version")
            .action((plugins: string[]) => {
                except(ctx.plugins.update(plugins))
            })
    },
}

export default pluginHandler
