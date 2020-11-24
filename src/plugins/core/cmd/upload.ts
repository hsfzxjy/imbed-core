/** @format */

import Imbed from "core/Imbed"
import { IHook } from "utils/interfaces"

const upload: IHook = {
    handle: (ctx: Imbed) => {
        const cmd = ctx.cmd
        cmd.program
            .command("upload")
            .description("Upload images")
            .arguments("[input...]")
            .alias("u")
            .action((input: string[]) => ctx.upload(input))
    },
}

export default upload
