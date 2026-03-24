export type ColumnMapping = {
  date: string;
  type: string;
  value: string;
  unit: string;
};

export type RecordRow = {
  date: string;
  type: string;
  value: number;
  unit: string;
  site?: string;
  operator?: string;
  notes?: string;
  record_id?: string;
};

export type ParseResponse = {
  columns: string[];
  preview: Record<string, unknown>[];
  sampleRow: Record<string, unknown> | null;
  totalRows: number;
};

export type ProcessType =
  | "Waste traceability"
  | "ESG reporting"
  | "Supply chain"
  | "Supply chain event"
  | "Compliance logs"
  | "Media / news integrity"
  | "Other";

export type ProjectContext = {
  project_name: string;
  process_type: string;
  description?: string;
};

export type ProofJsonRequest = {
  project_context: {
    project_name: string;
    process_type: string;
    description?: string;
  };
  records: Array<{
    date: string;
    type: string;
    value: number;
    unit: string;
    site?: string;
    operator?: string;
    notes?: string;
    record_id?: string;
  }>;
  evidence?: {
    photo_base64: string;
    filename?: string;
    content_type?: string;
  };
  proof_units_mode?: "batch" | "merkle";
  network?: "testnet" | "mainnet";
  mainnet_confirm_token?: string;
};

export type ProofUnitsMode = "batch" | "merkle";

export type MerkleLeafResponse = {
  index: number;
  leaf_hash: string;
  proof: string[];
};

export type MerkleProofResponse = {
  algorithm: "sha256-v1";
  root: string;
  leaf_count: number;
  leaves: MerkleLeafResponse[];
};

export type ProofResponse = {
  ok: true;
  proof_db_id?: string;
  proof_units_mode?: ProofUnitsMode;
  rows_count: number;
  event_hash: string;
  canonical_string: string;
  uri: string;
  issuer: string;
  timestamp: string;
  warnings: string[];
  errors: string[];
  metrics?: {
    total_units: number;
  };
  txId?: string;
  tx_digest?: string;
  object_id?: string | null;
  anchor_error?: string;
  explorer?: {
    tx?: string;
    object?: string;
    package?: string;
  };
  token?: {
    supply: number;
    txId: string;
    explorerTx: string;
  };
  evidence?: {
    photo_hash: string;
    photo_uri: string;
  };
  merkle?: MerkleProofResponse;
  project_context?: ProjectContext;
  network?: "testnet" | "mainnet";
};

export type VerifyRowRequest = {
  row: RecordRow;
  row_index: number;
  proof: string[];
  expected_root: string;
};

export type VerifyRowResponse = {
  ok: boolean;
  match?: boolean;
  computed_leaf_hash?: string;
  computed_root?: string;
  error?: string;
};

export type VerifyResponse = {
  ok: boolean;
  computed_event_hash?: string;
  expected_event_hash?: string | null;
  match?: boolean | null;
  onchain_event_hash?: string | null;
  match_onchain?: boolean | null;
  explorer?: {
    tx: string | null;
    object: string | null;
    package: string | null;
  };
  error?: string;
};

export type VerifyRequest = {
  canonical?: unknown;
  canonical_string?: string;
  expected_event_hash?: string;
  uri?: string;
  txId?: string;
  tx_digest?: string;
  objectId?: string;
  object_id?: string;
  network?: "testnet" | "mainnet";
  mainnet_confirm_token?: string;
};

export type RawSpreadsheetRow = Record<string, unknown>;
export type FieldMapping = ColumnMapping;
export type ParseApiResponse = ParseResponse & { error?: string };

export type ProofBundle = {
  canonical: {
    version: "1";
    rows: RecordRow[];
  };
  canonicalString: string;
  eventHash: string;
  uri: string;
  issuedAt: string;
  recordCount: number;
};

export type ProofApiResponse = {
  normalizedPreview: RecordRow[];
  totalRows: number;
  validRows: number;
  errors: string[];
  warnings: string[];
  bundle: ProofBundle;
  error?: string;
};

export type VerifyApiResponse = VerifyResponse & { uri?: string | null };
