/** @format */

import Imbed from "core/Imbed"
import { IHook } from "utils/interfaces"

const config: IHook = {
    handle: (ctx: Imbed) => {
        ctx.cmd.program //
            .option("-c, --config <path>", "Specify config path. Default to ~/.imbed/config.json")
    },
}

export default config
