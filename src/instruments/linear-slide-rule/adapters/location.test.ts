import { buildShareUrl, clearSharePayload, readSharePayload } from "./location";
import { shareUrl } from "./share";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

test("reads and clears the payload in the hash query", () => {
  window.history.replaceState(null, "", "/#/linear-slide-rule?s=abc_-1");
  expect(readSharePayload()).toBe("abc_-1");
  clearSharePayload();
  expect(window.location.hash).toBe("#/linear-slide-rule");
  expect(readSharePayload()).toBeNull();
});

test("builds a share URL on the current page", () => {
  window.history.replaceState(null, "", "/calc/");
  expect(buildShareUrl("xyz")).toBe(`${window.location.origin}/calc/#/linear-slide-rule?s=xyz`);
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
  expect(await shareUrl("https://example.test/", nav)).toBe("copied");
  expect(copied).toBe("https://example.test/");
});
