// Timestamps and JSON columns are stored as text on both dialects for
// portability. ISO 8601 strings; parse/stringify at the boundary. The app
// supplies them on insert — no DB-side defaults — so plain string suffices.
type Timestamp = string;

type UserRole = 'admin' | 'user';

type UsersTable = {
  id: string;
  username: string | null;
  password_hash: string | null;
  role: UserRole;
  created_at: Timestamp;
  updated_at: Timestamp;
};

// Catalogue entry kind — discriminates the value shape for samples, plus
// special kinds for session types and event metrics.
type CatalogueKind = 'numeric' | 'categorical' | 'geo' | 'composite' | 'session' | 'event';

// The subset of CatalogueKind that's valid on a sample. Used for the
// `samples.kind` column and for narrowing a CatalogueEntry to one that
// `validateSample` has already accepted.
type SampleKind = Extract<CatalogueKind, 'numeric' | 'categorical' | 'geo' | 'composite'>;

type CatalogueNamespace = 'canonical' | 'custom';

type IngestItemType = 'sample' | 'session' | 'event' | 'annotation';

type ValidationStatus = 'accepted' | 'rejected';

// Closed enum of rejection reasons. Integrations branch on these
// programmatically — never extend without bumping the API contract.
type RejectionReason =
  | 'unknown_metric'
  | 'invalid_value_kind'
  | 'schema_mismatch'
  | 'out_of_range'
  | 'missing_field'
  | 'invalid_timestamp'
  | 'catalogue_deprecated';

type CatalogueEntriesTable = {
  id: string;
  user_id: string | null; // null = canonical (shared); set = custom owned by user
  kind: CatalogueKind;
  namespace: CatalogueNamespace;
  version: number;
  unit: string | null;
  description: string | null;
  shape: string; // JSON; kind-specific extras (range, enum values, composite components)
  deprecated: number; // 0 | 1
  created_at: Timestamp;
  updated_at: Timestamp;
};

type CatalogueAliasesTable = {
  alias: string;
  user_id: string; // aliases are always per-user
  canonical_id: string;
  created_at: Timestamp;
};

type IngestLogTable = {
  id: string;
  user_id: string;
  received_at: Timestamp;
  source_integration: string;
  source_device: string;
  source_instance: string | null;
  idempotency_key: string;
  item_type: IngestItemType;
  metric: string | null; // null for session items
  payload: string; // JSON of the original item
  validation_status: ValidationStatus;
  rejection_reason: RejectionReason | null;
  catalogue_version: number | null;
  published_id: string | null; // points into samples/sessions/events when accepted
};

type SamplesTable = {
  id: string;
  user_id: string;
  metric_id: string;
  kind: SampleKind;
  start_at: Timestamp;
  end_at: Timestamp;
  tz: string | null;
  value: string; // JSON of the kind-specific value
  source_integration: string;
  source_device: string;
  source_instance: string | null;
  ingest_log_id: string;
  catalogue_version: number;
  created_at: Timestamp;
};

type EventsTable = {
  id: string;
  user_id: string;
  metric_id: string;
  at: Timestamp;
  tz: string | null;
  payload: string; // JSON
  source_integration: string;
  source_device: string;
  source_instance: string | null;
  ingest_log_id: string;
  catalogue_version: number;
  created_at: Timestamp;
};

type SessionsTable = {
  id: string;
  user_id: string;
  session_type: string;
  start_at: Timestamp;
  end_at: Timestamp;
  tz: string | null;
  metadata: string | null; // JSON
  source_integration: string;
  source_device: string;
  source_instance: string | null;
  ingest_log_id: string;
  catalogue_version: number;
  created_at: Timestamp;
};

type AnnotationsTable = {
  id: string;
  user_id: string;
  text: string;
  start_at: Timestamp;
  end_at: Timestamp;
  tz: string | null;
  tags: string | null; // JSON array of strings
  source_integration: string;
  source_device: string;
  source_instance: string | null;
  ingest_log_id: string;
  created_at: Timestamp;
};

type DatabaseSchema = {
  users: UsersTable;
  catalogue_entries: CatalogueEntriesTable;
  catalogue_aliases: CatalogueAliasesTable;
  ingest_log: IngestLogTable;
  samples: SamplesTable;
  events: EventsTable;
  sessions: SessionsTable;
  annotations: AnnotationsTable;
};

export type {
  AnnotationsTable,
  CatalogueAliasesTable,
  CatalogueEntriesTable,
  CatalogueKind,
  CatalogueNamespace,
  DatabaseSchema,
  EventsTable,
  IngestItemType,
  IngestLogTable,
  RejectionReason,
  SampleKind,
  SamplesTable,
  SessionsTable,
  UserRole,
  UsersTable,
  ValidationStatus,
};
