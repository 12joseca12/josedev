import { phaseIndex, phaseLabel, phaseOrder } from "./phases";

describe("phaseOrder", () => {
  it("lists the five project phases in pipeline order", () => {
    expect(phaseOrder).toEqual(["briefing", "diseño", "desarrollo", "revision", "entregado"]);
  });
});

describe("phaseLabel", () => {
  it("returns a display label for each known phase", () => {
    expect(phaseLabel("briefing")).toBe("Briefing");
    expect(phaseLabel("diseño")).toBe("Diseño");
    expect(phaseLabel("desarrollo")).toBe("Desarrollo");
    expect(phaseLabel("revision")).toBe("Revisión");
    expect(phaseLabel("entregado")).toBe("Entregado");
  });

  it("falls back to the raw value for an unknown phase", () => {
    expect(phaseLabel("no-existe" as never)).toBe("no-existe");
  });
});

describe("phaseIndex", () => {
  it("returns the position of each phase in phaseOrder", () => {
    expect(phaseIndex("briefing")).toBe(0);
    expect(phaseIndex("diseño")).toBe(1);
    expect(phaseIndex("desarrollo")).toBe(2);
    expect(phaseIndex("revision")).toBe(3);
    expect(phaseIndex("entregado")).toBe(4);
  });

  it("returns -1 for an unknown phase", () => {
    expect(phaseIndex("no-existe" as never)).toBe(-1);
  });
});
