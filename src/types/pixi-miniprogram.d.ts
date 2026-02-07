declare module 'pixi-miniprogram' {
    export function createPIXI(canvas: any): any;
}

declare module 'pixi-miniprogram/pixi-miniprogram/example/libs/unsafeEval' {
    const unsafeEval: (PIXI: any) => void;
    export default unsafeEval;
}
