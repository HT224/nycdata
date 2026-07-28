import {
  NycDataError,
  type CatalogResponse,
  type DatasetMetadata,
  type QueryOptions,
  type SearchItem,
} from "./types.js";
import { assertDatasetId, createDataUrl } from "./query.js";

export interface NycDataClientOptions {
  domain?: string;
  appToken?: string;
  fetchImpl?: typeof fetch;
}

export class NycDataClient {
  readonly domain: string;
  private readonly appToken: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(options: NycDataClientOptions = {}) {
    this.domain = options.domain ?? "data.cityofnewyork.us";
    this.appToken = options.appToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async search(term: string, limit = 10): Promise<SearchItem[]> {
    const url = new URL("https://api.us.socrata.com/api/catalog/v1");
    url.searchParams.set("search_context", this.domain);
    url.searchParams.set("q", term);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("only", "datasets");

    const response = await this.request<CatalogResponse>(url.toString());
    return response.results
      .filter((item) => item.resource.type === "dataset" || item.resource.id)
      .map((item) => {
        const domainMetadata =
          item.classification?.domainMetadata ?? item.classification?.domain_metadata;
        const agency =
          item.resource.attribution ??
          domainMetadata?.find((entry) => entry.key?.toLowerCase().endsWith("agency"))
            ?.value ??
          item.resource.name.match(/\(([^)]+)\)$/)?.[1];
        const category =
          item.classification?.domainCategory ?? item.classification?.domain_category;
        const updated =
          item.resource.dataUpdatedAt ??
          item.resource.data_updated_at ??
          item.resource.updatedAt;
        const views =
          item.resource.pageViews ?? item.resource.page_views?.page_views_total;

        return {
          id: item.resource.id,
          name: item.resource.name,
          ...(agency ? { agency } : {}),
          ...(category ? { category } : {}),
          ...(updated ? { updated } : {}),
          ...(views !== undefined ? { views } : {}),
          ...(item.resource.description ? { description: item.resource.description } : {}),
          url: item.permalink ?? `https://${this.domain}/d/${item.resource.id}`,
        };
      });
  }

  async metadata(datasetId: string): Promise<DatasetMetadata> {
    assertDatasetId(datasetId);
    return this.request<DatasetMetadata>(
      `https://${this.domain}/api/views/${datasetId}.json`,
    );
  }

  async query(
    datasetId: string,
    options: QueryOptions = {},
  ): Promise<Record<string, unknown>[]> {
    const url = createDataUrl(this.domain, datasetId, options);
    return this.request<Record<string, unknown>[]>(url);
  }

  dataUrl(datasetId: string, options: QueryOptions = {}): string {
    return createDataUrl(this.domain, datasetId, options);
  }

  private async request<T>(url: string): Promise<T> {
    const headers = new Headers({ Accept: "application/json" });
    if (this.appToken) headers.set("X-App-Token", this.appToken);

    let response: Response;
    try {
      response = await this.fetchImpl(url, { headers });
    } catch (error) {
      throw new NycDataError(
        `Could not reach NYC Open Data: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        url,
      );
    }

    if (!response.ok) {
      const body = await response.text();
      let message = body;
      try {
        const parsed = JSON.parse(body) as { message?: string; errorCode?: string };
        message = parsed.message ?? parsed.errorCode ?? body;
      } catch {
        // Keep the response body as the diagnostic.
      }
      throw new NycDataError(
        `NYC Open Data returned ${response.status}: ${message.slice(0, 500)}`,
        response.status,
        url,
      );
    }

    return (await response.json()) as T;
  }
}
