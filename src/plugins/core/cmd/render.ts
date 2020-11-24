/** @format */

import Imbed from "core/Imbed"
import { IHook } from "utils/interfaces"

const render: IHook = {
    handle: (ctx: Imbed) => {
        const cmd = ctx.cmd
        cmd.program
            .command("render")
            .description("Upload images")
            .arguments("[input...]")
            .option("--force-render")
            .option("--force-upload")
            .alias("u")
            .action((input: string[], cmd) =>
                ctx.render(input, {
                    forceRender: cmd.forceRender,
                    forceUpload: cmd.forceUpload,
                })
            )
    },
}

export default render
