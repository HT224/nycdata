import { describe, expect, it, vi } from "vitest";
import { NycDataClient } from "../src/client.js";

describe("NycDataClient", () => {
  it("normalizes catalog search results", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          resultSetSize: 1,
          results: [
            {
              resource: {
                id: "43nn-pn8j",
                name: "DOHMH New York City Restaurant Inspection Results",
                type: "dataset",
                description: "Inspection data",
                attribution: "Department of Health and Mental Hygiene (DOHMH)",
                data_updated_at: "2026-07-27T00:00:00.000Z",
                page_views: { page_views_total: 42 },
              },
              classification: {
                domain_category: "Health",
                domain_metadata: [
                  {
                    key: "Dataset-Information_Agency",
                    value: "Department of Health and Mental Hygiene (DOHMH)",
                  },
                ],
              },
              permalink: "https://data.cityofnewyork.us/d/43nn-pn8j",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const client = new NycDataClient({ fetchImpl });
    const results = await client.search("restaurant", 5);

    expect(results).toEqual([
      {
        id: "43nn-pn8j",
        name: "DOHMH New York City Restaurant Inspection Results",
        agency: "Department of Health and Mental Hygiene (DOHMH)",
        category: "Health",
        updated: "2026-07-27T00:00:00.000Z",
        views: 42,
        description: "Inspection data",
        url: "https://data.cityofnewyork.us/d/43nn-pn8j",
      },
    ]);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("sends the optional app token without placing it in the URL", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = new NycDataClient({ appToken: "secret-token", fetchImpl });

    await client.query("43nn-pn8j", { limit: 1 });

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).not.toContain("secret-token");
    expect(new Headers(init?.headers).get("X-App-Token")).toBe("secret-token");
  });
});
