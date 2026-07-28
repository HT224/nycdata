import Table from "cli-table3";
import type { DatasetMetadata, DatasetProfile, OutputFormat } from "./types.js";

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function csvEscape(value: unknown): string {
  const text = cell(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function formatRows(
  rows: Record<string, unknown>[],
  format: OutputFormat,
): string {
  if (format === "json") return JSON.stringify(rows, null, 2);
  if (rows.length === 0) return format === "csv" ? "" : "No rows returned.";

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  if (format === "csv") {
    return [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
    ].join("\n");
  }

  const table = new Table({
    head: headers,
    wordWrap: true,
    colWidths: headers.map(() => Math.max(12, Math.floor(120 / headers.length))),
  });
  for (const row of rows) table.push(headers.map((header) => cell(row[header])));
  return table.toString();
}

export function formatMetadata(metadata: DatasetMetadata, format: OutputFormat): string {
  if (format === "json") return JSON.stringify(metadata, null, 2);

  const summary = [
    `Name: ${metadata.name}`,
    `ID: ${metadata.id}`,
    `Agency: ${metadata.attribution ?? "Unknown"}`,
    `Category: ${metadata.category ?? "Unknown"}`,
    `Updated: ${formatEpoch(metadata.rowsUpdatedAt ?? metadata.dataUpdatedAt)}`,
    `API: https://data.cityofnewyork.us/resource/${metadata.id}.json`,
    "",
  ].join("\n");

  const rows = metadata.columns.map((column) => ({
    field: column.fieldName,
    name: column.name,
    type: column.dataTypeName,
    description: column.description ?? "",
  }));
  return summary + formatRows(rows, "table");
}

export function formatProfile(profile: DatasetProfile, format: OutputFormat): string {
  if (format === "json") return JSON.stringify(profile, null, 2);

  const summary = [
    `${profile.name} (${profile.id})`,
    `Total rows: ${profile.totalRows?.toLocaleString() ?? "Unknown"}`,
    `Profile basis: ${profile.sampleSize.toLocaleString()} sampled rows`,
    "",
  ].join("\n");
  const rows = profile.fields.map((field) => ({
    field: field.field,
    type: field.type,
    null_rate: `${(field.nullRate * 100).toFixed(1)}%`,
    sample_unique: field.unique,
    role: field.likelyRole ?? "",
    examples: field.examples.join(" | "),
  }));
  return summary + formatRows(rows, "table");
}

export function formatEpoch(value?: number): string {
  if (!value) return "Unknown";
  const milliseconds = value < 10_000_000_000 ? value * 1000 : value;
  return new Date(milliseconds).toISOString();
}
