import type {
  DatasetMetadata,
  DatasetProfile,
  FieldProfile,
} from "./types.js";
import type { NycDataClient } from "./client.js";

const DATE_TYPES = new Set(["calendar_date", "floating_timestamp", "fixed_timestamp"]);
const GEO_TYPES = new Set(["location", "point", "multipoint", "polygon", "multipolygon"]);

function stringifyExample(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function profileRows(
  metadata: DatasetMetadata,
  rows: Record<string, unknown>[],
  totalRows?: number,
): DatasetProfile {
  const fields: FieldProfile[] = metadata.columns.map((column) => {
    const values = rows.map((row) => row[column.fieldName]);
    const populated = values.filter((value) => value !== null && value !== undefined && value !== "");
    const examples = [...new Set(populated.map(stringifyExample))].slice(0, 3);
    const type = column.dataTypeName;
    const likelyRole = DATE_TYPES.has(type)
      ? "date"
      : GEO_TYPES.has(type) ||
          /(^|_)(lat|latitude|lon|lng|longitude|location|geom|geometry)($|_)/i.test(
            column.fieldName,
          )
        ? "geography"
        : undefined;

    return {
      field: column.fieldName,
      type,
      sampled: rows.length,
      nulls: rows.length - populated.length,
      nullRate: rows.length === 0 ? 0 : (rows.length - populated.length) / rows.length,
      unique: new Set(populated.map(stringifyExample)).size,
      examples,
      ...(likelyRole ? { likelyRole } : {}),
    };
  });

  return {
    id: metadata.id,
    name: metadata.name,
    ...(totalRows !== undefined ? { totalRows } : {}),
    sampleSize: rows.length,
    sampledAt: new Date().toISOString(),
    fields,
  };
}

export async function profileDataset(
  client: NycDataClient,
  datasetId: string,
  sampleSize = 100,
): Promise<DatasetProfile> {
  const [metadata, rows, countRows] = await Promise.all([
    client.metadata(datasetId),
    client.query(datasetId, { limit: sampleSize }),
    client.query(datasetId, { select: "count(*) as count", limit: 1 }),
  ]);

  const rawCount = countRows[0]?.count;
  const totalRows =
    typeof rawCount === "string" || typeof rawCount === "number"
      ? Number(rawCount)
      : undefined;

  return profileRows(
    metadata,
    rows,
    Number.isFinite(totalRows) ? totalRows : undefined,
  );
}
