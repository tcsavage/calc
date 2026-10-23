import { buildShareUrl, clearSharePayload, readSharePayload } from "./location";
import { shareUrl } from "./share";

const ROUTE = "/linear-slide-rule";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

test("reads and clears the payload in the hash query", () => {
  window.history.replaceState(null, "", "/#/linear-slide-rule?s=abc_-1");
  expect(readSharePayload(ROUTE)).toBe("abc_-1");
  clearSharePayload(ROUTE);
  expect(window.location.hash).toBe("#/linear-slide-rule");
  expect(readSharePayload(ROUTE)).toBeNull();
});

test("a payload on another instrument's route is left for that instrument", () => {
  window.history.replaceState(null, "", "/#/circular-slide-rule?s=abc");
  expect(readSharePayload(ROUTE)).toBeNull();
  clearSharePayload(ROUTE);
  expect(window.location.hash).toBe("#/circular-slide-rule?s=abc");
  expect(readSharePayload("/circular-slide-rule")).toBe("abc");
});

test("builds a share URL on the current page", () => {
  window.history.replaceState(null, "", "/calc/");
  expect(buildShareUrl(ROUTE, "xyz")).toBe(
    `${window.location.origin}/calc/#/linear-slide-rule?s=xyz`,
  );
});

test("copies the link when there is no share sheet", async () => {
  let copied = "";
  const nav = {
    clipboard: {
      writeText: async (text: string) => {
        copied = text;
      },
    },
  } as unknown as Navigator;
  expect(await shareUrl("https://example.test/", "Slide rule", nav)).toBe("copied");
  expect(copied).toBe("https://example.test/");
});
