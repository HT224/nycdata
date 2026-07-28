export { NycDataClient, type NycDataClientOptions } from "./client.js";
export {
  assertDatasetId,
  buildQueryParams,
  createDataUrl,
  parsePositiveInteger,
} from "./query.js";
export { profileDataset, profileRows } from "./profile.js";
export type {
  DatasetMetadata,
  DatasetProfile,
  FieldProfile,
  OutputFormat,
  QueryOptions,
  SearchItem,
} from "./types.js";
export { NycDataError } from "./types.js";
export { VERSION } from "./version.js";
