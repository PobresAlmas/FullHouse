import { describe, expect, it } from "vitest";
import { loginSchema } from "../login.schema";
import { registerSchema } from "../register.schema";
import { forgotPasswordSchema } from "../forgot-passowrd.schema";
import { resetPasswordSchema } from "../reset-password.schema";

describe("authentication schemas", () => {
  it("accepts valid login data and rejects invalid email or short password", () => {
    expect(
      loginSchema.safeParse({
        email: "user@example.com",
        password: "password1",
      }).success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({ email: "invalid", password: "password1" })
        .success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({ email: "user@example.com", password: "short" })
        .success,
    ).toBe(false);
  });

  it("accepts optional rememberMe and rejects invalid values", () => {
    expect(
      loginSchema.safeParse({
        email: "user@example.com",
        password: "password1",
        rememberMe: true,
      }).success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({
        email: "user@example.com",
        password: "password1",
        rememberMe: "yes",
      }).success,
    ).toBe(false);
  });

  it("validates registration fields", () => {
    expect(
      registerSchema.safeParse({
        name: "Maria Silva",
        nickname: "Maria",
        email: "maria@example.com",
        password: "password1",
      }).success,
    ).toBe(true);
    expect(
      registerSchema.safeParse({
        name: "Ma",
        nickname: "Maria",
        email: "maria@example.com",
        password: "password1",
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: "Maria Silva",
        nickname: "Maria",
        email: "bad",
        password: "password1",
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: "Maria Silva",
        nickname: "Maria",
        email: "maria@example.com",
        password: "short",
      }).success,
    ).toBe(false);
  });

  it("validates a recovery email", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "user@example.com" }).success,
    ).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "invalid" }).success).toBe(
      false,
    );
  });

  it("requires matching passwords and a minimum password length", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "password1",
        confirmPassword: "password1",
      }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({
        password: "password1",
        confirmPassword: "different",
      }).success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({
        password: "short",
        confirmPassword: "short",
      }).success,
    ).toBe(false);
  });
});
