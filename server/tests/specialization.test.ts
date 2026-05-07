import request from "supertest";
import { app } from "../src/app";
import { seedTestSpecializations } from "./helpers/seedSpecializations";

describe("GET /api/specializations", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("returns 200 with an array of specializations", async () => {
    const res = await request(app).get("/api/specializations");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("returns the seeded specializations with correct shape", async () => {
    const res = await request(app).get("/api/specializations");
    expect(res.status).toBe(200);

    const specs = res.body.data as Array<{ id: number; name: string }>;
    expect(specs.length).toBeGreaterThanOrEqual(3);
    expect(typeof specs[0].id).toBe("number");
    expect(typeof specs[0].name).toBe("string");

    const names = specs.map((s) => s.name);
    expect(names).toContain("General Practice");
    expect(names).toContain("Pediatrics");
    expect(names).toContain("Cardiology");
  });

  it("returns specializations in alphabetical order", async () => {
    const res = await request(app).get("/api/specializations");
    expect(res.status).toBe(200);

    const names = (res.body.data as Array<{ name: string }>).map((s) => s.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });
});
