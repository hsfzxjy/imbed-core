/** @format */

export default class Dependencies {
    private mapping: Map<string, any>

    constructor() {
        this.mapping = new Map()
    }

    set(name: string, value: any) {
        console.log(value)
        if (value.default) value = value.default
        console.log(value)
        this.mapping.set(name, value)
    }

    get(name: string) {
        let value = this.mapping.get(name)
        if (value === undefined) {
            value = require(name)
            this.set(name, value)
        }
        return value
    }
}
