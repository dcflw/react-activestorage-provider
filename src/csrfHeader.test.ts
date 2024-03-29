import { describe, it, expect } from "vitest";
import csrfHeader from "./csrfHeader";

describe("csrfHeader", () => {
  it("gets the CSRF header from the meta tag on the page", () => {
    expect(csrfHeader()).toEqual({
      "x-csrf-token": "value from vitest.config.ts",
    });
  });

  it("does nothing if CSRF header does not exist", () => {
    document.head.innerHTML = "";
    expect(csrfHeader()).toEqual({});
  });
});
