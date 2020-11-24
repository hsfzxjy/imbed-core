/** @format */

import chalk from "chalk"
import Imbed from "core/Imbed"
import dayjs from "dayjs"
import fs from "fs-extra"
import util from "util"

type ILogArguments = string | number
type ILogArgumentsWithError = ILogArguments | Error

enum LogLevel {
    success = "success",
    debug = "debug",
    info = "info",
    warn = "warn",
    error = "error",
}

const colorMapping = {
    [LogLevel.success]: "green",
    [LogLevel.debug]: "grey",
    [LogLevel.info]: "blue",
    [LogLevel.warn]: "yellow",
    [LogLevel.error]: "red",
}

class Logger {
    private static _instance: Logger | null = null
    private ctx: Imbed

    static get(): Logger {
        if (this._instance === null) throw Error("Logger not initialized")
        return this._instance
    }

    constructor(ctx: Imbed) {
        if (Logger._instance !== null) {
            throw Error("Logger cannot be initialized more than once.")
        }

        this.ctx = ctx
        Logger._instance = this
    }

    private silent(): Boolean {
        return this.ctx.cfg.get("logger.silent")
    }
    private logLevel(): string[] {
        const cfgLogLevel = this.ctx.cfg.get<string | string[] | undefined>("logger.logLevel")
        if (cfgLogLevel === undefined) {
            return ["all"]
        } else if (typeof cfgLogLevel === "string") {
            return [cfgLogLevel]
        } else {
            return cfgLogLevel
        }
    }
    private logPath(): string {
        return this.ctx.cfg.get("logger.logPath")
    }

    private handleLog(level: LogLevel, ...msg: ILogArgumentsWithError[]): void {
        if (this.silent()) return
        const logHeader = chalk[colorMapping[level]](`[${level[0].toUpperCase()}]`)
        console.log(logHeader, ...msg)

        setImmediate(() => {
            this.write(level, ...msg)
        })
    }

    private write(level: LogLevel, ...msg: ILogArgumentsWithError[]): void {
        try {
            if (this.checkLogLevel(level)) {
                let log = `${dayjs().format("YYYY-MM-DD HH:mm:ss")} [Imbed ${level.toUpperCase()}] `
                msg.forEach((item: ILogArgumentsWithError) => {
                    if (typeof item === "object" && level === "error") {
                        log += `\n------Error Stack Begin------\n${util.format(
                            item.stack
                        )}\n-------Error Stack End------- `
                    } else {
                        if (typeof item === "object") {
                            item = JSON.stringify(item)
                        }
                        log += `${item} `
                    }
                })
                log += "\n"
                // A synchronized approach to avoid log msg sequence errors
                if (this.logPath()) fs.appendFileSync(this.logPath(), log)
            }
        } catch (e) {
            console.log(e)
        }
    }

    private checkLogLevel(level: string): boolean {
        return this.logLevel() //
            .some((item) => item === level || item === "all")
    }

    success(...msg: ILogArguments[]): void {
        return this.handleLog(LogLevel.success, ...msg)
    }

    static success(...msg: ILogArguments[]): void {
        this.get().success(...msg)
    }

    debug(...msg: ILogArguments[]): void {
        return this.handleLog(LogLevel.debug, ...msg)
    }

    static debug(...msg: ILogArguments[]): void {
        this.get().debug(...msg)
    }

    info(...msg: ILogArguments[]): void {
        return this.handleLog(LogLevel.info, ...msg)
    }

    static info(...msg: ILogArguments[]): void {
        this.get().info(...msg)
    }

    error(...msg: ILogArgumentsWithError[]): void {
        return this.handleLog(LogLevel.error, ...msg)
    }

    static error(...msg: ILogArguments[]): void {
        this.get().error(...msg)
    }

    warn(...msg: ILogArguments[]): void {
        return this.handleLog(LogLevel.warn, ...msg)
    }

    static warn(...msg: ILogArguments[]): void {
        this.get().warn(...msg)
    }
}

export default Logger
