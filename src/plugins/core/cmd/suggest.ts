/** @format */

import Imbed from "core/Imbed"
import { IHook } from "utils/interfaces"

const suggest: IHook = {
    handle: (ctx: Imbed) => {
        const cmd = ctx.cmd
        cmd.program
            .command("suggest")
            .description("Upload images")
            .option("--prefix <prefix>")
            .option("--marker <marker>")
            .alias("s")
            .action((cmdObj) =>
                ctx.suggest({
                    prefix: cmdObj.prefix,
                    marker: cmdObj.marker,
                })
            )
    },
}

export default suggest
