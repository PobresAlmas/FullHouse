import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../card";

describe("Card family", () => {
  it("renders each semantic slot and compact size", () => {
    render(
      <Card size="sm">
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Summary</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByText("Title")).toHaveAttribute(
      "data-slot",
      "card-title",
    );
    expect(screen.getByText("Summary")).toHaveAttribute(
      "data-slot",
      "card-description",
    );
    expect(screen.getByText("Action")).toHaveAttribute(
      "data-slot",
      "card-action",
    );
    expect(screen.getByText("Body")).toHaveAttribute(
      "data-slot",
      "card-content",
    );
    expect(screen.getByText("Footer")).toHaveAttribute(
      "data-slot",
      "card-footer",
    );
    expect(
      screen.getByText("Title").closest('[data-slot="card"]'),
    ).toHaveAttribute("data-size", "sm");
  });

  it("uses default size and preserves additional div props", () => {
    render(
      <Card data-testid="card">
        <span>Body</span>
      </Card>,
    );
    expect(screen.getByTestId("card")).toHaveAttribute("data-size", "default");
    expect(screen.getByTestId("card")).toHaveAttribute("data-slot", "card");
  });
});
