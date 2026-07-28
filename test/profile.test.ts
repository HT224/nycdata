import { describe, expect, it } from "vitest";
import { profileRows } from "../src/profile.js";
import type { DatasetMetadata } from "../src/types.js";

const metadata: DatasetMetadata = {
  id: "abcd-1234",
  name: "Example",
  columns: [
    { name: "Created", fieldName: "created_at", dataTypeName: "calendar_date" },
    { name: "Borough", fieldName: "borough", dataTypeName: "text" },
    { name: "Latitude", fieldName: "latitude", dataTypeName: "number" },
  ],
};

describe("profileRows", () => {
  it("reports sample quality and inferred roles", () => {
    const profile = profileRows(
      metadata,
      [
        {
          created_at: "2026-01-01T00:00:00.000",
          borough: "BROOKLYN",
          latitude: "40.7",
        },
        { created_at: "2026-01-02T00:00:00.000", borough: "QUEENS" },
        { created_at: "2026-01-03T00:00:00.000", borough: "BROOKLYN" },
      ],
      500,
    );

    expect(profile.totalRows).toBe(500);
    expect(profile.sampleSize).toBe(3);
    expect(profile.fields.find((field) => field.field === "borough")).toMatchObject({
      unique: 2,
      nullRate: 0,
    });
    expect(profile.fields.find((field) => field.field === "created_at")?.likelyRole).toBe(
      "date",
    );
    expect(profile.fields.find((field) => field.field === "latitude")).toMatchObject({
      likelyRole: "geography",
      nulls: 2,
    });
  });
});
