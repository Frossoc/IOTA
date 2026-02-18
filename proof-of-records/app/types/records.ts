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

export type ProofResponse = {
  ok: true;
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
  explorer?: {
    tx: string;
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
