/** @format */

import Imbed from "core/Imbed"
import { spawn } from "./spawn"
import path from "path"

import os from "os"
import { fslib } from "./common"

function getCurrentPlatform(): string {
    const platform = process.platform
    if (platform !== "win32") {
        return platform
    } else {
        const currentOS = os.release().split(".")[0]
        if (currentOS === "10") {
            return "win10"
        } else {
            return "win32"
        }
    }
}

// Thanks to vs-imbed: https://github.com/Spades-S/vs-imbed/blob/master/src/extension.ts
async function getClipboardImage(ctx: Imbed): Promise<string | undefined> {
    const imagePath = path.join(os.tmpdir(), fslib.makeTimestampFilename(".png"))
    const platform: string = getCurrentPlatform()
    // for Imbed GUI
    const env = ctx.cfg.get("PICGO_ENV") === "GUI"
    const platformPaths: {
        [index: string]: string
    } = {
        darwin: env ? path.join(ctx.cfg.baseDir, "mac.applescript") : "./clipboard/mac.applescript",
        win32: env ? path.join(ctx.cfg.baseDir, "windows.ps1") : "./clipboard/windows.ps1",
        win10: env ? path.join(ctx.cfg.baseDir, "windows10.ps1") : "./clipboard/windows10.ps1",
        linux: env ? path.join(ctx.cfg.baseDir, "linux.sh") : "./clipboard/linux.sh",
    }
    const scriptPath = env ? platformPaths[platform] : path.join(__dirname, platformPaths[platform])

    let result: ReturnType<typeof spawn> extends Promise<infer T> ? T : any
    if (platform === "darwin") {
        result = await spawn("osascript", [scriptPath, imagePath])
    } else if (platform === "win32" || platform === "win10") {
        result = await spawn("powershell", [
            "-noprofile",
            "-noninteractive",
            "-nologo",
            "-sta",
            "-executionpolicy",
            "unrestricted",
            // fix windows 10 native cmd crash bug when "imbed upload"
            // https://github.com/Imbed/Imbed-Core/issues/32
            // '-windowstyle','hidden',
            // '-noexit',
            "-file",
            scriptPath,
            imagePath,
        ])
    } else {
        result = await spawn("sh", [scriptPath, imagePath])
    }
    if (result.code === 0) return result.stdout.toString().trim()
}

export default getClipboardImage
