import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AuthCard from "../AuthCard";

describe("AuthCard", () => {
    it("shows its title, description, and child content", () => {
        render(
            <AuthCard title="Sign in" description="Welcome">
                <button>Continue</button>
            </AuthCard>
        );
        expect(screen.getByText("Sign in")).toBeInTheDocument();
        expect(screen.getByText("Welcome")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    });
});
