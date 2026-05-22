declare module "jsbarcode" {
  const JsBarcode: (
    element: SVGElement | HTMLCanvasElement,
    text: string,
    options?: Record<string, unknown>
  ) => void;
  export default JsBarcode;
}
