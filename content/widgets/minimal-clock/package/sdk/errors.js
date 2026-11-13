/** 带码的错误：调用方可以按 `code` 分支，而不是靠匹配 message。 */
export class LullWidgetError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = "LullWidgetError";
        this.code = code;
    }
}
//# sourceMappingURL=errors.js.map