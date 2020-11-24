/** @format */

import Imbed from "core/Imbed"
import clipboard from "./clipboard"
import normalize from "./normalize"
import render from "./render"

export function registerBeforeTransform(ctx: Imbed) {
    const hooks = [normalize, clipboard, render]
    for (const hook of hooks) {
        ctx.hooks.beforeTransform.register(hook.name, hook, hook.deps)
    }
}
