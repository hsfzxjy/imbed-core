/** @format */

import Imbed from "core/Imbed"
import registerUploader from "./uploader"
import registerTransformer from "./transformer"
import { registerBeforeTransform } from "./beforeTransform"
import registerBeforeUpload from "./beforeUpload"
import registerCommands from "./cmd"

export default (ctx: Imbed) => {
    return {
        register() {
            registerTransformer(ctx)
            registerUploader(ctx)
            registerBeforeTransform(ctx)
            registerBeforeUpload(ctx)
            registerCommands(ctx)
        },
    }
}
