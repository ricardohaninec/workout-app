import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AiWorkoutFloatingChat from "@/components/ai-workout-floating-chat";

const mockPathname = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => mockPathname(),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/components/ai-workout-proposal-modal", () => ({
  default: () => <div data-testid="proposal-modal" />,
}));

vi.mock("@/components/ai-food-proposal", () => ({
  default: () => <div data-testid="food-proposal" />,
}));

beforeEach(() => {
  global.fetch = vi.fn() as unknown as typeof fetch;
});

describe("AiWorkoutFloatingChat", () => {
  describe("visibility", () => {
    it("renders the trigger button on authenticated routes", () => {
      mockPathname.mockReturnValue("/dashboard");
      render(<AiWorkoutFloatingChat />);
      expect(screen.getByRole("button", { name: /ai assistant/i })).toBeInTheDocument();
    });

    it("returns null on /p/ public routes", () => {
      mockPathname.mockReturnValue("/p/some-public-slug");
      const { container } = render(<AiWorkoutFloatingChat />);
      expect(container).toBeEmptyDOMElement();
    });

    it("returns null on nested /p/ routes", () => {
      mockPathname.mockReturnValue("/p/abc-123");
      const { container } = render(<AiWorkoutFloatingChat />);
      expect(container).toBeEmptyDOMElement();
    });

    it("renders normally on /workout routes", () => {
      mockPathname.mockReturnValue("/workout/some-id");
      render(<AiWorkoutFloatingChat />);
      expect(screen.getByRole("button", { name: /ai assistant/i })).toBeInTheDocument();
    });

    it("renders normally on /dashboard", () => {
      mockPathname.mockReturnValue("/dashboard");
      render(<AiWorkoutFloatingChat />);
      expect(screen.getByRole("button", { name: /ai assistant/i })).toBeInTheDocument();
    });
  });
});
