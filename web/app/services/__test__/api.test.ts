import { describe, expect, it } from "vitest";
import { api } from "../api";

describe("app API client", () => {
  it("uses the public API URL from the environment", () => {
    expect(api.defaults.baseURL).toBe(process.env.NEXT_PUBLIC_API_URL);
  });
});
