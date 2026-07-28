#!/usr/bin/env node

import { Command, Option } from "commander";
import { NycDataClient } from "./client.js";
import { formatMetadata, formatProfile, formatRows } from "./format.js";
import { profileDataset } from "./profile.js";
import { parsePositiveInteger } from "./query.js";
import { NycDataError, type OutputFormat, type QueryOptions } from "./types.js";

const program = new Command();
const client = new NycDataClient({
  ...(process.env.SOCRATA_APP_TOKEN ? { appToken: process.env.SOCRATA_APP_TOKEN } : {}),
});

function formatOption(): Option {
  return new Option("-f, --format <format>", "output format")
    .choices(["table", "json", "csv"])
    .default("table");
}

program
  .name("nycdata")
  .description("Discover, inspect, query, and profile live NYC Open Data.")
  .version("0.1.0")
  .showSuggestionAfterError();

program
  .command("search")
  .description("Search the live NYC Open Data catalog.")
  .argument("<term>", "search term")
  .option("-l, --limit <number>", "maximum datasets", "10")
  .addOption(formatOption())
  .action(async (term: string, options: { limit: string; format: OutputFormat }) => {
    const limit = parsePositiveInteger(options.limit, "limit");
    const results = await client.search(term, limit);
    const rows = results.map((item) => ({
      id: item.id,
      name: item.name,
      agency: item.agency ?? "",
      category: item.category ?? "",
      updated: item.updated ?? "",
      description:
        item.description
          ?.replaceAll(/\s+/g, " ")
          .trim()
          .slice(0, 180) ?? "",
    }));
    process.stdout.write(`${formatRows(rows, options.format)}\n`);
  });

program
  .command("describe")
  .description("Show live metadata and schema for a dataset.")
  .argument("<dataset-id>", "Socrata dataset ID, e.g. 43nn-pn8j")
  .addOption(
    new Option("-f, --format <format>", "output format")
      .choices(["table", "json"])
      .default("table"),
  )
  .action(async (datasetId: string, options: { format: OutputFormat }) => {
    const metadata = await client.metadata(datasetId);
    process.stdout.write(`${formatMetadata(metadata, options.format)}\n`);
  });

program
  .command("query")
  .description("Query a live dataset with SoQL.")
  .argument("<dataset-id>", "Socrata dataset ID")
  .option("--select <expression>", "SoQL $select expression")
  .option("--where <expression>", "SoQL $where expression")
  .option("--group <expression>", "SoQL $group expression")
  .option("--order <expression>", "SoQL $order expression")
  .option("-l, --limit <number>", "maximum rows", "20")
  .option("--offset <number>", "row offset", "0")
  .option("--near <lat,lng>", "proximity center")
  .option("--radius <meters>", "proximity radius in meters")
  .option("--location-field <field>", "location API field", "location")
  .option("--show-url", "print the final live API URL to stderr")
  .addOption(formatOption())
  .action(
    async (
      datasetId: string,
      options: {
        select?: string;
        where?: string;
        group?: string;
        order?: string;
        limit: string;
        offset: string;
        near?: string;
        radius?: string;
        locationField: string;
        showUrl?: boolean;
        format: OutputFormat;
      },
    ) => {
      const query: QueryOptions = {
        limit: parsePositiveInteger(options.limit, "limit"),
        offset: parsePositiveInteger(options.offset, "offset"),
        ...(options.select ? { select: options.select } : {}),
        ...(options.where ? { where: options.where } : {}),
        ...(options.group ? { group: options.group } : {}),
        ...(options.order ? { order: options.order } : {}),
        ...(options.near ? { near: options.near } : {}),
        ...(options.radius
          ? { radius: parsePositiveInteger(options.radius, "radius") }
          : {}),
        ...(options.locationField ? { locationField: options.locationField } : {}),
      };
      if (options.showUrl) process.stderr.write(`${client.dataUrl(datasetId, query)}\n`);
      const rows = await client.query(datasetId, query);
      process.stdout.write(`${formatRows(rows, options.format)}\n`);
    },
  );

program
  .command("profile")
  .description("Run a bounded, sample-based profile of a live dataset.")
  .argument("<dataset-id>", "Socrata dataset ID")
  .option("-s, --sample-size <number>", "rows to sample", "100")
  .addOption(
    new Option("-f, --format <format>", "output format")
      .choices(["table", "json"])
      .default("table"),
  )
  .action(
    async (
      datasetId: string,
      options: { sampleSize: string; format: OutputFormat },
    ) => {
      const sampleSize = parsePositiveInteger(options.sampleSize, "sample-size");
      if (sampleSize > 1000) throw new Error("sample-size cannot exceed 1000.");
      const profile = await profileDataset(client, datasetId, sampleSize);
      process.stdout.write(`${formatProfile(profile, options.format)}\n`);
    },
  );

program.parseAsync().catch((error: unknown) => {
  if (error instanceof NycDataError) {
    process.stderr.write(`nycdata: ${error.message}\n`);
    if (error.url) process.stderr.write(`Request: ${error.url}\n`);
  } else {
    process.stderr.write(
      `nycdata: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  }
  process.exitCode = 1;
});
