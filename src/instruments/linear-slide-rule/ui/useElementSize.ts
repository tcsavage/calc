import { type RefObject, useLayoutEffect, useState } from "react";
import type { Size } from "./viewMath";

/** jsdom and the first render have no layout, so fall back to a reasonable size. */
const FALLBACK: Size = { width: 800, height: 240 };

export function useElementSize(ref: RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>(FALLBACK);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) setSize({ width, height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}
