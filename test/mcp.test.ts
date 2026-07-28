import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NycDataClient } from "../src/client.js";
import { createMcpServer } from "../src/mcp.js";

const openClients: Client[] = [];

afterEach(async () => {
  await Promise.all(openClients.splice(0).map((client) => client.close()));
});

async function connectedClient(fetchImpl: typeof fetch): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer(new NycDataClient({ fetchImpl }));
  const client = new Client({ name: "nycdata-test", version: "1.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  openClients.push(client);
  return client;
}

describe("nycdata MCP server", () => {
  it("publishes the four read-only dataset tools", async () => {
    const client = await connectedClient(vi.fn<typeof fetch>());
    const tools = await client.listTools();

    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "search_datasets",
      "describe_dataset",
      "query_dataset",
      "profile_dataset",
    ]);
  });

  it("runs catalog search through an MCP tool call", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          resultSetSize: 1,
          results: [
            {
              resource: {
                id: "43nn-pn8j",
                name: "Restaurant Inspections",
                type: "dataset",
                attribution: "DOHMH",
              },
              classification: { domain_category: "Health" },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const client = await connectedClient(fetchImpl);
    const result = await client.callTool({
      name: "search_datasets",
      arguments: { query: "restaurant", limit: 5 },
    });

    expect(result.isError).not.toBe(true);
    expect(result.content).toEqual([
      expect.objectContaining({
        type: "text",
        text: expect.stringContaining("43nn-pn8j"),
      }),
    ]);
  });

  it("rejects incomplete proximity queries before calling NYC", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const client = await connectedClient(fetchImpl);
    const result = await client.callTool({
      name: "query_dataset",
      arguments: {
        datasetId: "43nn-pn8j",
        near: "40.6895,-73.9724",
      },
    });

    expect(result.isError).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
