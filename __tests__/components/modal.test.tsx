import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "@/components/modal";

describe("Modal", () => {
  it("renders title and children when open", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test Title">
        <p>Modal body content</p>
      </Modal>
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Modal body content")).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Hidden Title">
        <p>Hidden content</p>
      </Modal>
    );

    expect(screen.queryByText("Hidden Title")).not.toBeInTheDocument();
    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal open={true} onClose={onClose} title="Closable Modal">
        <p>Content</p>
      </Modal>
    );

    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders React node as title", () => {
    render(
      <Modal
        open={true}
        onClose={vi.fn()}
        title={<span data-testid="custom-title">Custom Node Title</span>}
      >
        <p>Content</p>
      </Modal>
    );

    expect(screen.getByTestId("custom-title")).toBeInTheDocument();
    expect(screen.getByText("Custom Node Title")).toBeInTheDocument();
  });

  it("renders children correctly", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="With Children">
        <button>Child button</button>
        <input placeholder="Child input" />
      </Modal>
    );

    expect(
      screen.getByRole("button", { name: /child button/i })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Child input")).toBeInTheDocument();
  });

  it("does not call onClose on initial render", () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
