import { describe, expect, it } from "vitest";
import {
  assertDatasetId,
  buildQueryParams,
  createDataUrl,
  parsePositiveInteger,
} from "../src/query.js";

describe("query helpers", () => {
  it("validates Socrata dataset IDs", () => {
    expect(() => assertDatasetId("43nn-pn8j")).not.toThrow();
    expect(() => assertDatasetId("restaurant-inspections")).toThrow(
      /Invalid dataset ID/,
    );
  });

  it("builds standard SoQL parameters", () => {
    const params = buildQueryParams({
      select: "borough, count(*)",
      where: "borough = 'BROOKLYN'",
      group: "borough",
      order: "count(*) desc",
      limit: 10,
      offset: 5,
    });

    expect(params.get("$select")).toBe("borough, count(*)");
    expect(params.get("$where")).toBe("borough = 'BROOKLYN'");
    expect(params.get("$group")).toBe("borough");
    expect(params.get("$order")).toBe("count(*) desc");
    expect(params.get("$limit")).toBe("10");
    expect(params.get("$offset")).toBe("5");
  });

  it("combines proximity with an existing where clause", () => {
    const params = buildQueryParams({
      where: "grade = 'A'",
      near: "40.689,-73.972",
      radius: 1000,
      locationField: "location",
    });

    expect(params.get("$where")).toBe(
      "(grade = 'A') AND within_circle(location, 40.689, -73.972, 1000)",
    );
  });

  it("requires radius with proximity", () => {
    expect(() => buildQueryParams({ near: "40.7,-73.9" })).toThrow(/radius/);
  });

  it("creates encoded live dataset URLs", () => {
    const url = new URL(
      createDataUrl("data.cityofnewyork.us", "43nn-pn8j", {
        where: "grade = 'A'",
        limit: 5,
      }),
    );

    expect(url.pathname).toBe("/resource/43nn-pn8j.json");
    expect(url.searchParams.get("$where")).toBe("grade = 'A'");
    expect(url.searchParams.get("$limit")).toBe("5");
  });

  it("parses non-negative integers", () => {
    expect(parsePositiveInteger("20", "limit")).toBe(20);
    expect(() => parsePositiveInteger("-1", "limit")).toThrow();
    expect(() => parsePositiveInteger("1.5", "limit")).toThrow();
  });
});
