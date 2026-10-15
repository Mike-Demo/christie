declare module "@tgwf/co2" {
  export interface CO2Options {
    model?: "1byte" | "swd";
    version?: number;
  }
  export class co2 {
    constructor(options?: CO2Options);
    perByte(bytes: number, green?: boolean): number | Record<string, number>;
  }
}
