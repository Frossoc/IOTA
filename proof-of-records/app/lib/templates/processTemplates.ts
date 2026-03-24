export type ProcessTemplate = {
  id: string;
  label: string;
  description: string;
  exampleFields: string[];
  exampleMetrics: string[];
  notes?: string;
};

const PROCESS_TEMPLATE_LIST: ProcessTemplate[] = [
  {
    id: "waste_traceability",
    label: "Waste traceability",
    description: "Track material movements, treatment events, and recovery outcomes for audit-ready records.",
    exampleFields: ["date", "waste_type", "weight_kg", "origin_site", "destination"],
    exampleMetrics: ["total_units (kg)", "records secured", "batch count"],
    notes: "Prioritize clear unit consistency (kg/tons) before proof generation.",
  },
  {
    id: "esg_reporting",
    label: "ESG reporting",
    description: "Capture periodic environmental or operational indicators for transparent ESG disclosures.",
    exampleFields: ["date", "indicator", "value", "unit", "facility"],
    exampleMetrics: ["total_units", "monthly totals", "scope coverage"],
    notes: "Use standardized indicator names so downstream reporting stays comparable.",
  },
  {
    id: "compliance_logs",
    label: "Compliance logs",
    description: "Record controls, checks, and compliance events with timestamped evidence trails.",
    exampleFields: ["date", "control_name", "status", "operator", "record_id"],
    exampleMetrics: ["passed_checks", "failed_checks", "records secured"],
    notes: "Include record IDs whenever possible for direct traceability in audits.",
  },
  {
    id: "media_news_integrity",
    label: "Media / news integrity",
    description: "Anchor publication events and source metadata to prove integrity of media timelines.",
    exampleFields: ["date", "headline", "source", "checksum", "publisher"],
    exampleMetrics: ["articles anchored", "sources covered", "correction events"],
    notes: "Hash source assets off-chain and store only digest/URI references in proof metadata.",
  },
  {
    id: "supply_chain_event",
    label: "Supply chain event",
    description: "Register operational events across suppliers, logistics nodes, and delivery checkpoints.",
    exampleFields: ["date", "event_type", "quantity", "unit", "site"],
    exampleMetrics: ["total_units", "events per route", "on-time event ratio"],
    notes: "Keep event_type values normalized to avoid fragmented analytics.",
  },
];

const PROCESS_TEMPLATE_INDEX = new Map<string, ProcessTemplate>(
  PROCESS_TEMPLATE_LIST.map((template) => [template.label.toLowerCase(), template] as const)
);

const PROCESS_TEMPLATE_ALIASES: Record<string, string> = {
  "supply chain": "supply chain event",
};

export const PROCESS_TEMPLATES = PROCESS_TEMPLATE_LIST;

export function findProcessTemplate(processType: string): ProcessTemplate | null {
  const normalized = processType.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const direct = PROCESS_TEMPLATE_INDEX.get(normalized);
  if (direct) {
    return direct;
  }

  const alias = PROCESS_TEMPLATE_ALIASES[normalized];
  return alias ? PROCESS_TEMPLATE_INDEX.get(alias) ?? null : null;
}
