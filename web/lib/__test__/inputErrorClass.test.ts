import { describe, expect, it } from "vitest";
import { inputErrorClass } from "../inputErrorClass";

describe("inputErrorClass", () => {
  it("adds an error border only when an error is present", () => {
    expect(inputErrorClass("Required")).toBe("border-red-500");
    expect(inputErrorClass()).toBe("");
    expect(inputErrorClass("")).toBe("");
  });
});
