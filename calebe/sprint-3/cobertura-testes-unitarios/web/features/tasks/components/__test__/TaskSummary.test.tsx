import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SummaryCard, TagFilter } from "../TaskSummary";

describe("task summary controls", () => {
  it("renders summary details and an optional progress bar", () => {
    const { rerender } = render(
      <SummaryCard label="Pendentes" value="3" detail="tarefas abertas" />,
    );

    expect(screen.getByText("Pendentes")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("tarefas abertas")).toBeInTheDocument();

    rerender(
      <SummaryCard
        label="Concluídas"
        value="5"
        detail="tasks"
        valueClass="text-green"
        progress={0.5}
      />,
    );
    expect(screen.getByText("Concluídas")).toBeInTheDocument();
    expect(screen.getByText("5")).toHaveClass("text-green");
    expect(
      screen.getByText("5").parentElement?.querySelector("[style]"),
    ).toHaveStyle({
      width: "50%",
    });
    expect(screen.queryByText("tasks")).not.toBeInTheDocument();
  });

  it("exposes active and inactive tag filters and handles clicks", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <TagFilter
        label="Limpeza"
        active={false}
        onClick={onClick}
        color="bg-blue"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Limpeza" }));
    expect(onClick).toHaveBeenCalledOnce();

    rerender(<TagFilter label="Limpeza" active onClick={onClick} />);
    expect(screen.getByRole("button", { name: "Limpeza" })).toHaveClass(
      "bg-[#b9dda8]",
    );
    expect(
      screen.getByRole("button", { name: "Limpeza" }).querySelector("span"),
    ).toHaveClass("bg-[#4e812f]");
  });
});
