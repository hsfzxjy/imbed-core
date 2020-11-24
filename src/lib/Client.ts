/** @format */

import Imbed from "core/Imbed"
import request, { RequestPromiseOptions, RequestPromiseAPI } from "request-promise-native"

interface ImbedClient extends RequestPromiseAPI {
    cfg: Partial<RequestPromiseOptions>
    setOptions(cfg: Partial<RequestPromiseOptions>): void
}

function createClient(): ImbedClient {
    let defaultsCfg = {
        jar: request.jar(),
    }
    let instance = request.defaults(defaultsCfg) as ImbedClient
    instance.cfg = defaultsCfg
    instance.setOptions = function (cfg) {
        Object.assign(this.cfg, cfg)
    }
    return instance
}

export default {
    create(ctx: Imbed): ImbedClient {
        const instance = createClient()
        const proxy = ctx.cfg.get("core.proxy", "")
        if (proxy) {
            instance.setOptions({ proxy })
        }
        return instance
    },
}
