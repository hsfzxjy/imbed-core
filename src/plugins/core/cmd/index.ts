/** @format */

import Imbed from "core/Imbed"
import pluginHandler from "./plugin"
import config from "./config"
import upload from "./upload"
import setting from "./setting"
import use from "./use"
import proxy from "./proxy"
import init from "./init"
import suggest from "./suggest"
import render from "./render"

export default (ctx: Imbed): void => {
    ctx.cmd.register("plugin", pluginHandler)
    ctx.cmd.register("config", config)
    ctx.cmd.register("setting", setting)
    ctx.cmd.register("upload", upload)
    ctx.cmd.register("use", use)
    ctx.cmd.register("proxy", proxy)
    ctx.cmd.register("init", init)
    ctx.cmd.register("suggest", suggest)
    ctx.cmd.register("render", render)
}
