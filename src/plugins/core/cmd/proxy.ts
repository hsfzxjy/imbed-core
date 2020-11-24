/** @format */

import Imbed from "core/Imbed"
import { IHook } from "utils/interfaces"

const proxy: IHook = {
    handle: (ctx: Imbed) => {
        const cmd = ctx.cmd
        cmd.program.option("-p, --proxy <url>", "Use this proxy for uploading", (proxy: string) => {
            ctx.cfg.update({
                "core.proxy": proxy,
            })
            if (proxy) {
                ctx.client.setOptions({ proxy })
            }
        })
    },
}

export default proxy
