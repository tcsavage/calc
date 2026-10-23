import { createKeyValueStore } from "./localStorageStore";

test("round trips JSON values", () => {
  const store = createKeyValueStore(localStorage);
  store.set("k", { a: 1 });
  expect(store.get("k")).toEqual({ a: 1 });
  store.remove("k");
  expect(store.get("k")).toBeNull();
  expect(store.available).toBe(true);
});

test("a throwing storage is reported unavailable instead of throwing", () => {
  const broken = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("denied");
    },
    removeItem: () => {
      throw new Error("denied");
    },
  } as unknown as Storage;
  const store = createKeyValueStore(broken);
  expect(store.available).toBe(false);
  expect(store.get("k")).toBeNull();
  expect(() => store.set("k", 1)).not.toThrow();
});

test("corrupt JSON reads as nothing", () => {
  localStorage.setItem("bad", "{");
  expect(createKeyValueStore(localStorage).get("bad")).toBeNull();
});
