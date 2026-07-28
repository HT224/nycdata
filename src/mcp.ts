#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { NycDataClient } from "./client.js";
import { profileDataset } from "./profile.js";
import type { QueryOptions } from "./types.js";
import { VERSION } from "./version.js";

const jsonText = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const toolError = (error: unknown) => ({
  isError: true,
  content: [
    {
      type: "text" as const,
      text: error instanceof Error ? error.message : String(error),
    },
  ],
});

export function createMcpServer(client = new NycDataClient()): McpServer {
  const server = new McpServer({
    name: "nycdata",
    version: VERSION,
  });

  server.registerTool(
    "search_datasets",
    {
      title: "Search NYC Open Data datasets",
      description:
        "Search the live NYC Open Data catalog. Use this before choosing a dataset or inventing a dataset ID.",
      inputSchema: {
        query: z.string().min(1).describe("Plain-language dataset search query"),
        limit: z.number().int().min(1).max(50).default(10),
      },
    },
    async ({ query, limit }) => {
      try {
        return jsonText(await client.search(query, limit));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "describe_dataset",
    {
      title: "Describe an NYC Open Data dataset",
      description:
        "Return live metadata, schema, field names, types, descriptions, and update information for a Socrata dataset ID.",
      inputSchema: {
        datasetId: z
          .string()
          .regex(/^[a-z0-9]{4}-[a-z0-9]{4}$/i)
          .describe("Stable Socrata dataset ID, e.g. 43nn-pn8j"),
      },
    },
    async ({ datasetId }) => {
      try {
        return jsonText(await client.metadata(datasetId));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "query_dataset",
    {
      title: "Query a live NYC Open Data dataset",
      description:
        "Run a read-only SoQL query against a live NYC dataset. Inspect the dataset first so field names and row semantics are verified.",
      inputSchema: {
        datasetId: z
          .string()
          .regex(/^[a-z0-9]{4}-[a-z0-9]{4}$/i),
        select: z.string().optional().describe("SoQL $select expression"),
        where: z.string().optional().describe("SoQL $where expression"),
        group: z.string().optional().describe("SoQL $group expression"),
        order: z.string().optional().describe("SoQL $order expression"),
        limit: z.number().int().min(1).max(1000).default(20),
        offset: z.number().int().min(0).default(0),
        near: z
          .string()
          .regex(/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/)
          .optional()
          .describe("Optional LAT,LNG proximity center"),
        radius: z
          .number()
          .positive()
          .max(50_000)
          .optional()
          .describe("Proximity radius in meters; required with near"),
        locationField: z
          .string()
          .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
          .default("location"),
      },
    },
    async ({
      datasetId,
      select,
      where,
      group,
      order,
      limit,
      offset,
      near,
      radius,
      locationField,
    }) => {
      try {
        if ((near && radius === undefined) || (!near && radius !== undefined)) {
          throw new Error("near and radius must be supplied together.");
        }
        const options: QueryOptions = {
          limit,
          offset,
          locationField,
          ...(select ? { select } : {}),
          ...(where ? { where } : {}),
          ...(group ? { group } : {}),
          ...(order ? { order } : {}),
          ...(near ? { near } : {}),
          ...(radius !== undefined ? { radius } : {}),
        };
        const url = client.dataUrl(datasetId, options);
        const rows = await client.query(datasetId, options);
        return jsonText({ datasetId, url, rowCount: rows.length, rows });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "profile_dataset",
    {
      title: "Profile an NYC Open Data dataset",
      description:
        "Run a bounded profile with a live total row count and sample-derived null rates, cardinality, likely roles, and examples.",
      inputSchema: {
        datasetId: z
          .string()
          .regex(/^[a-z0-9]{4}-[a-z0-9]{4}$/i),
        sampleSize: z.number().int().min(1).max(1000).default(100),
      },
    },
    async ({ datasetId, sampleSize }) => {
      try {
        return jsonText(await profileDataset(client, datasetId, sampleSize));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  return server;
}

export async function runMcpServer(): Promise<void> {
  const client = new NycDataClient({
    ...(process.env.SOCRATA_APP_TOKEN
      ? { appToken: process.env.SOCRATA_APP_TOKEN }
      : {}),
  });
  const server = createMcpServer(client);
  await server.connect(new StdioServerTransport());
  process.stderr.write("nycdata MCP server running on stdio\n");
}

const isMain = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isMain) {
  runMcpServer().catch((error: unknown) => {
    process.stderr.write(
      `nycdata-mcp: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
