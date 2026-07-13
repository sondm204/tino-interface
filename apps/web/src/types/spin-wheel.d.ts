declare module "spin-wheel" {
  export type WheelItem = {
    backgroundColor?: string;
    label?: string;
    labelColor?: string;
    value?: unknown;
    weight?: number;
  };

  export type WheelRestEvent = {
    currentIndex: number;
    rotation: number;
    type: "rest";
  };

  export class Wheel {
    constructor(container: Element, props?: Record<string, unknown>);

    items: WheelItem[];
    onRest: ((event: WheelRestEvent) => void) | null;
    pointerAngle: number;

    remove(): void;
    spinToItem(
      itemIndex?: number,
      duration?: number,
      spinToCenter?: boolean,
      numberOfRevolutions?: number,
      direction?: 1 | -1,
      easingFunction?: ((n: number) => number) | null
    ): void;
    stop(): void;
  }
}
