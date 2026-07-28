export type OutputFormat = "table" | "json" | "csv";

export interface CatalogResource {
  id: string;
  name: string;
  description?: string;
  attribution?: string;
  type?: string;
  updatedAt?: string;
  data_updated_at?: string;
  dataUpdatedAt?: string;
  pageViews?: number;
  page_views?: {
    page_views_total?: number;
  };
  columns?: Array<{
    fieldName?: string;
    name?: string;
    dataTypeName?: string;
    description?: string;
  }>;
}

export interface CatalogResult {
  resource: CatalogResource;
  classification?: {
    domainCategory?: string;
    domain_category?: string;
    domainMetadata?: Array<{ key?: string; value?: string }>;
    domain_metadata?: Array<{ key?: string; value?: string }>;
  };
  metadata?: {
    domain?: string;
  };
  permalink?: string;
}

export interface CatalogResponse {
  resultSetSize: number;
  results: CatalogResult[];
}

export interface DatasetColumn {
  id?: number;
  name: string;
  fieldName: string;
  dataTypeName: string;
  description?: string;
  position?: number;
  cachedContents?: {
    non_null?: number | string;
    null?: number | string;
    cardinality?: number | string;
    smallest?: string;
    largest?: string;
    top?: Array<{ item: string; count: number | string }>;
  };
}

export interface DatasetMetadata {
  id: string;
  name: string;
  description?: string;
  attribution?: string;
  category?: string;
  rowsUpdatedAt?: number;
  metadataUpdatedAt?: number;
  rowsUpdatedBy?: string;
  dataUpdatedAt?: number;
  columns: DatasetColumn[];
  metadata?: {
    custom_fields?: Record<string, Record<string, string>>;
  };
  permalink?: string;
}

export interface SearchItem {
  id: string;
  name: string;
  agency?: string;
  category?: string;
  updated?: string;
  views?: number;
  description?: string;
  url: string;
}

export interface QueryOptions {
  select?: string;
  where?: string;
  group?: string;
  order?: string;
  limit?: number;
  offset?: number;
  near?: string;
  radius?: number;
  locationField?: string;
}

export interface FieldProfile {
  field: string;
  type: string;
  sampled: number;
  nulls: number;
  nullRate: number;
  unique: number;
  examples: string[];
  likelyRole?: "date" | "geography";
}

export interface DatasetProfile {
  id: string;
  name: string;
  totalRows?: number;
  sampleSize: number;
  sampledAt: string;
  fields: FieldProfile[];
}

export class NycDataError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly url?: string,
  ) {
    super(message);
    this.name = "NycDataError";
  }
}
