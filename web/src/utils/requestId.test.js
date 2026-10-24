import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createRequestId } from "./requestId.js";

test("uses native randomUUID when available", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  try {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { randomUUID: () => "native-request-id" },
    });
    assert.equal(createRequestId(), "native-request-id");
  } finally {
    Object.defineProperty(globalThis, "crypto", original);
  }
});

test("generates unique valid UUIDs on LAN HTTP without randomUUID", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  try {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) },
    });
    const ids = Array.from({ length: 1000 }, createRequestId);
    for (const id of ids) {
      assert.match(id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    }
    assert.equal(new Set(ids).size, ids.length);
  } finally {
    Object.defineProperty(globalThis, "crypto", original);
  }
});
