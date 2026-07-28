import type { QueryOptions } from "./types.js";

const DATASET_ID_PATTERN = /^[a-z0-9]{4}-[a-z0-9]{4}$/i;
const NEAR_PATTERN = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/;
const FIELD_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function assertDatasetId(id: string): void {
  if (!DATASET_ID_PATTERN.test(id)) {
    throw new Error(`Invalid dataset ID "${id}". Expected a value like 43nn-pn8j.`);
  }
}

export function parsePositiveInteger(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return parsed;
}

export function buildQueryParams(options: QueryOptions): URLSearchParams {
  const params = new URLSearchParams();

  if (options.select) params.set("$select", options.select);
  if (options.where) params.set("$where", options.where);
  if (options.group) params.set("$group", options.group);
  if (options.order) params.set("$order", options.order);
  if (options.limit !== undefined) params.set("$limit", String(options.limit));
  if (options.offset !== undefined) params.set("$offset", String(options.offset));

  if (options.near) {
    if (!NEAR_PATTERN.test(options.near)) {
      throw new Error("--near must be formatted as LAT,LNG.");
    }
    if (options.radius === undefined || options.radius <= 0) {
      throw new Error("--radius must be greater than zero when --near is used.");
    }
    const field = options.locationField ?? "location";
    if (!FIELD_PATTERN.test(field)) {
      throw new Error("--location-field must be a valid API field name.");
    }
    const [lat, lng] = options.near.split(",");
    const proximity = `within_circle(${field}, ${lat}, ${lng}, ${options.radius})`;
    params.set("$where", options.where ? `(${options.where}) AND ${proximity}` : proximity);
  }

  return params;
}

export function createDataUrl(
  domain: string,
  datasetId: string,
  options: QueryOptions = {},
): string {
  assertDatasetId(datasetId);
  const url = new URL(`https://${domain}/resource/${datasetId}.json`);
  const params = buildQueryParams(options);
  params.forEach((value, key) => url.searchParams.set(key, value));
  return url.toString();
}
