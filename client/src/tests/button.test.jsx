import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../components/ui/button.jsx";

describe("Button", () => {
  test("affiche son contenu", () => {
    render(<Button>Emprunter</Button>);
    expect(screen.getByRole("button", { name: "Emprunter" })).toBeInTheDocument();
  });

  test("déclenche onClick au clic", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Valider</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Valider" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("est désactivé quand disabled est passé", () => {
    render(<Button disabled>Indisponible</Button>);
    expect(screen.getByRole("button", { name: "Indisponible" })).toBeDisabled();
  });
});
