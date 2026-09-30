import React from "react";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/font/google", () => ({
  Nunito_Sans: () => ({ variable: "font-nunito" }),
  Roboto: () => ({ variable: "font-roboto" }),
}));
vi.mock("@/providers/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));
import RootLayout, { metadata } from "../layout";

describe("RootLayout", () => {
  it("sets document language, font classes and wraps children in AuthProvider", () => {
    const tree = RootLayout({ children: <p>Page contents</p> });
    expect(tree.type).toBe("html");
    expect(tree.props.lang).toBe("pt-BR");
    expect(tree.props.className).toContain("font-nunito");
    const body = tree.props.children;
    const provider = body.props.children;
    expect(provider.type).toBeTypeOf("function");
    expect(provider.props.children.props.children).toBe("Page contents");
  });

  it("exports site metadata", () => {
    expect(metadata).toEqual({
      title: "FullHouse",
      description: "Organização de casas compartilhadas",
    });
  });
});
