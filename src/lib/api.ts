export type TokenGetter = () => Promise<string | null>;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export function displayApiError(error: unknown): string | undefined {
  if (!error) {
    return undefined;
  }
  const message = error instanceof Error ? error.message : String(error);
  if (message === "tenant_auth_required") {
    return "Select or create a workspace to load tenant data.";
  }
  if (message === "tenant_not_found") {
    return "Workspace data is still being created. Refresh once, then try again.";
  }
  return message;
}

export type QuotaMode =
  | "FULL"
  | "PASSTHROUGH"
  | "DEGRADED_RETRIEVE"
  | "BLOCKED";

export type ConflictType =
  | "FACT_UPDATE"
  | "PREFERENCE_CHANGE"
  | "NEGATION"
  | "SKILL_PROGRESSION"
  | "NUMERIC_UPDATE"
  | "TEMPORAL_SHIFT"
  | "UNKNOWN";

export type TenantUsage = {
  calls_used: number;
  calls_limit: number | null;
  tokens_used: number;
  tokens_limit: number | null;
  mode: QuotaMode;
  budget_remaining_pct: number;
  reset_at: string | null;
  plan_tier: "free" | "starter" | "growth" | "enterprise";
  conflicts_resolved_mtd?: number;
  extraction_success_rate?: number;
  nothing_to_extract_rate?: number;
  cross_user_conflicts_pending?: number;
  conflict_types_breakdown?: Partial<Record<ConflictType, number>>;
};

export type SharedContextConflictStatus =
  | "pending"
  | "clarification_queued"
  | "resolved"
  | "ignored";

export type SharedContextConflict = {
  id: string;
  detected_at: string;
  status: SharedContextConflictStatus;
  entity_type:
    | "tech_stack"
    | "company_fact"
    | "product_feature"
    | "team_process"
    | "shared_goal"
    | "organisation_policy"
    | "team_language"
    | "shared_resource"
    | "exam_date"
    | "grade_level"
    | "personal_skill"
    | "personal_preference"
    | "individual_goal"
    | "learning_style"
    | "personal_fact"
    | "marks_target"
    | "study_schedule";
  entity_value_a: string;
  entity_value_b: string;
  user_a_id: string | null;
  user_b_id: string | null;
  user_a_memory_id?: string | null;
  user_b_memory_id?: string | null;
  memory_a_content: string | null;
  memory_b_content: string | null;
  source_service_a?: string | null;
  source_service_b?: string | null;
  memory_a_created_at?: string | null;
  memory_b_created_at?: string | null;
  resolved_at?: string | null;
  resolution?: "A" | "B" | "both_valid" | null;
  resolution_path?: "user_session" | "tenant_review" | null;
  resolved_by?: "user_session" | "tenant" | null;
  resolution_reason?: string | null;
  auto_resolution?: string | null;
  auto_resolution_at?: string | null;
  requires_attention?: boolean;
};

export type ConflictStats = {
  total_detected_mtd: number;
  auto_resolved_mtd: number;
  auto_resolution_rate: number;
  resolution_breakdown: {
    per_user_scoped: number;
    recency_weighted: number;
    confidence_weighted: number;
    clarification_queued: number;
  };
  requires_attention: number;
  clarifications_pending: number;
  pending_user_session: number;
  pending_tenant_review: number;
  resolved_by_user_session_mtd: number;
  resolved_by_tenant_mtd: number;
};

export type TenantUser = {
  external_user_id: string;
  memory_count: number;
  last_active_at: string | null;
  created_at: string | null;
  is_blocked: boolean;
  quality_score_avg: number | null;
};

export type BlockEvent = {
  blocked_at: string;
  layer: "L1" | "L2" | "L3" | "L4" | "NONE";
  reason: string | null;
};

export type TenantUserDetail = TenantUser & {
  user_id: string | null;
  block_history: BlockEvent[];
  total_calls_7d: number;
  blocked_calls_7d: number;
};

export type TenantUsersResponse = {
  data: TenantUser[];
  pagination: {
    next_cursor: string | null;
    limit: number;
    total: number;
  };
};

export type TenantCostSummary = {
  current_month_tokens: number;
  estimated_cost_usd: number;
  cost_per_call: number | null;
  gate_block_rate: number;
  projected_month_cost_usd: number;
  savings_from_gate_usd: number;
  cost_is_estimate: true;
};

export type TenantSettings = {
  alert_webhook_url: string | null;
  overage_policy: "block" | "warn" | "charge";
};

export type DomainSchemaValue = "edtech" | "support" | null;
export type SupportTypeValue =
  | "saas"
  | "ecommerce"
  | "banking_fintech"
  | "travel"
  | "telecom"
  | "edtech_support"
  | "general_info";
export type SupportTypeMode = "single" | "multi" | "auto";

export type AvailableDomain = {
  value: string | null;
  label: string;
  description: string;
  status: "available" | "coming_soon";
};

export type TenantDomainSchema = {
  domain_schema: DomainSchemaValue;
  available_domains: AvailableDomain[];
  support_type_configured: SupportTypeValue | null;
  support_type_mode: SupportTypeMode;
  support_types_allowed: SupportTypeValue[];
};

export type TenantStudentSummary = {
  external_user_id: string;
  grade_level: string | null;
  board_or_curriculum: string | null;
  exam_name: string | null;
  exam_date: string | null;
  days_to_exam: number | null;
  weak_topics_count: number;
  forgetting_risk_count: number;
  last_session_at: string | null;
};

export type DeprecationUsageEntry = {
  field: string;
  last_used: string;
  sunset_at: string;
  migration_guide: string;
  replacement_field: string | null;
};

export type QualityLogEntry = {
  id: string;
  external_user_id: string;
  layer_blocked_at: "L1" | "L2" | "L3" | "L4" | "NONE";
  reason?: string | null;
  nothing_to_extract?: boolean;
  quality_score: number;
  semantic_similarity: number | null;
  created_at: string;
};

export type MemoryAdditionPoint = {
  label: string;
  count: number;
};

export type GateBreakdownSlice = {
  name: string;
  value: number;
};

export type RecentActivityRow = {
  id: string;
  time: string;
  user: string;
  status: "queued" | "blocked" | "passthrough";
};

export type ApiKeyData = {
  id: string;
  name: string;
  permissions: string[];
  rate_limit_per_minute: number;
  created_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
};

export type ApiKeyCreateData = ApiKeyData & {
  raw_key: string;
};

export type AuthorityRules = {
  default_priority: number;
  categories: Record<string, number>;
  domain_fields: Record<string, number>;
};

export type ServiceWriter = {
  id: string;
  service_key: string;
  display_name: string;
  api_key_id: string | null;
  authority_rules: AuthorityRules;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type EvidenceReference = {
  source_type: string;
  reference: string;
  content_hash?: string | null;
};

export type MemorySourceEvent = {
  id: string;
  external_user_id: string;
  writer_id: string | null;
  api_key_id: string | null;
  source_service: string;
  source_event_id: string;
  observed_at: string;
  received_at: string;
  payload_hash: string;
  scope: Record<string, unknown>;
  evidence_refs: EvidenceReference[];
  processing_metadata: Record<string, unknown>;
  extraction_job_id: string | null;
};

export type MemoryCategory =
  | "preference"
  | "fact"
  | "goal"
  | "procedure"
  | "relationship"
  | "expertise";

export type GlobalAgentData = {
  id: string;
  owner_tenant_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  default_categories_requested: MemoryCategory[];
  redirect_uri: string;
  is_verified: boolean;
  is_public: boolean;
  created_at: string | null;
  is_active: boolean;
};

export type GlobalAgentCreateData = GlobalAgentData & {
  raw_agent_api_key: string;
};

export type PassportLinkTokenData = {
  link_token: string;
  expires_in_seconds: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    next_cursor: string | null;
    limit: number;
    total: number;
  };
};

export type MemoryRecord = {
  id: string;
  content: string;
  category: string;
  importance_score: number;
  original_importance_score?: number | null;
  confidence_score: number;
  created_at: string | null;
  updated_at: string | null;
  last_accessed_at: string | null;
  access_count: number;
  is_hot?: boolean;
  is_archived: boolean;
  system_archived?: boolean;
  source_job_id?: string | null;
  source_event_id?: string | null;
  provenance?: {
    event_id?: string;
    service?: string;
    observed_at?: string;
    received_at?: string | null;
    payload_hash?: string;
    evidence?: EvidenceReference[];
    authority_rules?: AuthorityRules;
    processing?: Record<string, unknown>;
  } | null;
  agent_id: string | null;
  metadata: Record<string, unknown>;
};

export type RetrieveContextFormat = "bullets" | "json" | "xml";

export type RetrieveMemoriesRequest = {
  external_user_id: string;
  query: string;
  limit?: number;
  categories?: string[];
  agent_id?: string | null;
  time_filter_days?: number | null;
  format?: RetrieveContextFormat;
  context_max_tokens?: number;
};

export type RetrieveMemoriesResponse = {
  data: MemoryRecord[];
  system_prompt_addition: string;
  context_token_count?: number;
  memories_from_hot_tier?: number;
  clarification_question?: string | null;
  cached?: boolean;
};

type Envelope<T> = {
  data: T;
};

async function apiFetch<T>(
  path: string,
  getToken: TokenGetter,
  init?: RequestInit,
): Promise<T> {
  if (!API_BASE) {
    throw new ApiRequestError("NEXT_PUBLIC_API_BASE is not configured.", 500);
  }

  const token = await getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string; detail?: string };
      errorMessage = payload.error ?? payload.detail ?? errorMessage;
    } catch {
      // Keep the default message when the payload is not JSON.
    }
    throw new ApiRequestError(errorMessage, response.status);
  }

  return (await response.json()) as T;
}

export function truncateUserId(value: string): string {
  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    : [];
}

function formatDayLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "2-digit",
  }).format(value);
}

function buildTrailingDaySeries(
  rows: Array<{ label: string; count: number }>,
  totalDays: number,
): MemoryAdditionPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const counts = new Map(rows.map((row) => [row.label, row.count]));
  const series: MemoryAdditionPoint[] = [];

  for (let offset = totalDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const isoDay = day.toISOString().slice(0, 10);
    series.push({
      label: isoDay,
      count: counts.get(isoDay) ?? 0,
    });
  }

  return series;
}

export async function getTenantUsage(getToken: TokenGetter): Promise<TenantUsage> {
  const response = await apiFetch<Envelope<TenantUsage>>("/v1/tenant/usage", getToken);
  return response.data;
}

export async function getTenantDomainSchema(
  getToken: TokenGetter,
): Promise<TenantDomainSchema> {
  const response = await apiFetch<Envelope<TenantDomainSchema>>(
    "/v1/tenant/domain-schema",
    getToken,
  );
  return response.data;
}

export async function updateTenantDomainSchema(
  getToken: TokenGetter,
  domainSchema: DomainSchemaValue,
): Promise<TenantDomainSchema> {
  const response = await apiFetch<Envelope<TenantDomainSchema>>(
    "/v1/tenant/domain-schema",
    getToken,
    {
      method: "PATCH",
      body: JSON.stringify({ domain_schema: domainSchema }),
    },
  );
  return response.data;
}

export async function updateTenantSupportType(
  getToken: TokenGetter,
  payload: {
    support_type: SupportTypeValue | null;
    support_type_mode: SupportTypeMode;
    support_types_allowed: SupportTypeValue[];
  },
): Promise<{
  support_type_configured: SupportTypeValue | null;
  support_type_mode: SupportTypeMode;
  support_types_allowed: SupportTypeValue[];
}> {
  const response = await apiFetch<Envelope<{
    support_type_configured: SupportTypeValue | null;
    support_type_mode: SupportTypeMode;
    support_types_allowed: SupportTypeValue[];
  }>>(
    "/v1/tenant/support-type",
    getToken,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function getSharedContextConflicts(
  getToken: TokenGetter,
): Promise<SharedContextConflict[]> {
  const response = await apiFetch<Envelope<SharedContextConflict[]>>(
    "/v1/tenant/shared-context-conflicts?include_resolved=true",
    getToken,
  );
  return response.data;
}

export async function getConflictStats(getToken: TokenGetter): Promise<ConflictStats> {
  const response = await apiFetch<Envelope<ConflictStats>>(
    "/v1/tenant/conflict-stats",
    getToken,
  );
  return response.data;
}

export async function updateSharedContextConflict(
  getToken: TokenGetter,
  conflictId: string,
  payload: { status: "ignored" },
): Promise<SharedContextConflict> {
  const response = await apiFetch<Envelope<SharedContextConflict | SharedContextConflict[]>>(
    `/v1/tenant/shared-context-conflicts/${encodeURIComponent(conflictId)}`,
    getToken,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return Array.isArray(response.data) ? response.data[0] : response.data;
}

export async function resolveTenantConflict(
  getToken: TokenGetter,
  conflictId: string,
  payload: { correct_user: "A" | "B" | "both_valid"; reason?: string },
): Promise<{ resolved: boolean; conflict_id: string; action_taken: string }> {
  const response = await apiFetch<
    Envelope<{ resolved: boolean; conflict_id: string; action_taken: string }>
  >(`/v1/tenant/conflicts/${encodeURIComponent(conflictId)}/resolve`, getToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function getTenantUsersPage(
  getToken: TokenGetter,
  options?: { cursor?: string | null; limit?: number; search?: string },
): Promise<TenantUsersResponse> {
  const search = new URLSearchParams({
    limit: String(options?.limit ?? 50),
  });
  if (options?.cursor) {
    search.set("cursor", options.cursor);
  }
  if (options?.search) {
    search.set("search", options.search);
  }

  return apiFetch<TenantUsersResponse>(`/v1/tenant/users?${search.toString()}`, getToken);
}

export async function getTenantCostSummary(
  getToken: TokenGetter,
): Promise<TenantCostSummary> {
  const response = await apiFetch<Envelope<TenantCostSummary>>(
    "/v1/tenant/cost-summary",
    getToken,
  );
  return response.data;
}

export async function getTenantStudentsPage(
  getToken: TokenGetter,
  options?: { cursor?: string | null; limit?: number },
): Promise<PaginatedResponse<TenantStudentSummary>> {
  const search = new URLSearchParams({
    limit: String(options?.limit ?? 50),
  });
  if (options?.cursor) {
    search.set("cursor", options.cursor);
  }

  return apiFetch<PaginatedResponse<TenantStudentSummary>>(
    `/v1/tenant/students?${search.toString()}`,
    getToken,
  );
}

export async function getAllTenantUsers(
  getToken: TokenGetter,
  options?: { search?: string },
): Promise<TenantUser[]> {
  const users: TenantUser[] = [];
  let nextCursor: string | null = null;

  do {
    const response = await getTenantUsersPage(
      getToken,
      {
        limit: 100,
        cursor: nextCursor,
        search: options?.search,
      },
    );
    users.push(...response.data);
    nextCursor = response.pagination.next_cursor;
  } while (nextCursor);

  return users;
}

export async function getTenantUserDetail(
  getToken: TokenGetter,
  externalUserId: string,
): Promise<TenantUserDetail> {
  const response = await apiFetch<Envelope<TenantUserDetail>>(
    `/v1/tenant/users/${encodeURIComponent(externalUserId)}/stats`,
    getToken,
  );
  return response.data;
}

export async function blockTenantUser(
  getToken: TokenGetter,
  externalUserId: string,
): Promise<boolean> {
  const response = await apiFetch<Envelope<{ blocked: boolean }>>(
    `/v1/tenant/users/${encodeURIComponent(externalUserId)}/block`,
    getToken,
    { method: "POST" },
  );
  return response.data.blocked;
}

export async function deleteTenantUser(
  getToken: TokenGetter,
  externalUserId: string,
): Promise<{ deleted: boolean; memories_removed: number }> {
  const response = await apiFetch<
    Envelope<{ deleted: boolean; memories_removed: number }>
  >(`/v1/tenant/users/${encodeURIComponent(externalUserId)}`, getToken, {
    method: "DELETE",
  });
  return response.data;
}

export async function getTenantQualityLogPage(
  getToken: TokenGetter,
  options?: { cursor?: string | null; limit?: number; search?: string },
): Promise<PaginatedResponse<QualityLogEntry>> {
  const search = new URLSearchParams({
    limit: String(options?.limit ?? 50),
  });
  if (options?.cursor) {
    search.set("cursor", options.cursor);
  }
  if (options?.search) {
    search.set("search", options.search);
  }

  return apiFetch<PaginatedResponse<QualityLogEntry>>(
    `/v1/tenant/quality-log?${search.toString()}`,
    getToken,
  );
}

export async function getAllTenantQualityLogEntries(
  getToken: TokenGetter,
  options?: { search?: string },
): Promise<QualityLogEntry[]> {
  const rows: QualityLogEntry[] = [];
  let nextCursor: string | null = null;

  do {
    const response = await getTenantQualityLogPage(
      getToken,
      {
        limit: 100,
        cursor: nextCursor,
        search: options?.search,
      },
    );
    rows.push(...response.data);
    nextCursor = response.pagination.next_cursor;
  } while (nextCursor);

  return rows;
}

export async function getRecentActivity(
  getToken: TokenGetter,
  mode: QuotaMode,
): Promise<RecentActivityRow[]> {
  const response = await apiFetch<
    Envelope<QualityLogEntry[]> & {
      pagination?: { next_cursor: string | null; limit: number; total: number };
    }
  >("/v1/tenant/quality-log?limit=10", getToken);

  return response.data.map((entry) => ({
    id: entry.id,
    time: entry.created_at,
    user: truncateUserId(entry.external_user_id),
    status:
      entry.layer_blocked_at !== "NONE"
        ? "blocked"
        : mode === "PASSTHROUGH"
          ? "passthrough"
          : "queued",
  }));
}

export async function getMemoryAdditions(
  getToken: TokenGetter,
): Promise<MemoryAdditionPoint[]> {
  const response = await apiFetch<{ data?: unknown }>(
    "/v1/tenant/memory-additions?limit=30",
    getToken,
  );

  const rows = asArray(response.data)
    .map((row) => ({
      label: String(row.day ?? row.date ?? row.bucket ?? row.label ?? row.created_at ?? ""),
      count: Number(row.count ?? row.total ?? row.value ?? 0),
    }))
    .filter((row) => row.label)
    .map((row) => ({
      label: row.label.slice(0, 10),
      count: row.count,
    }))
    .slice(-30);

  return buildTrailingDaySeries(rows, 30).map((row) => ({
    label: formatDayLabel(new Date(`${row.label}T00:00:00Z`)),
    count: row.count,
  }));
}

export async function getGateBreakdown(
  getToken: TokenGetter,
): Promise<GateBreakdownSlice[]> {
  const response = await apiFetch<{ data?: unknown }>(
    "/v1/tenant/quality-log?group_by=layer",
    getToken,
  );

  const grouped = asArray(response.data)
    .map((row) => ({
      name: String(
        row.layer ?? row.layer_blocked_at ?? row.name ?? "Unknown",
      ),
      value: Number(row.count ?? row.total ?? row.value ?? 0),
    }))
    .filter((row) => row.name && row.name !== "NONE");

  const normalizedLayers = ["L1", "L2", "L3", "L4"];

  if (grouped.length > 0) {
    const groupedMap = new Map(grouped.map((item) => [item.name, item.value]));
    return normalizedLayers.map((layer) => ({
      name: layer,
      value: groupedMap.get(layer) ?? 0,
    }));
  }

  const fallbackRows = asArray(response.data);
  const accumulator = new Map<string, number>();
  for (const row of fallbackRows) {
    const layer = String(row.layer_blocked_at ?? "NONE");
    if (!layer || layer === "NONE") {
      continue;
    }
    accumulator.set(layer, (accumulator.get(layer) ?? 0) + 1);
  }

  return normalizedLayers.map((layer) => ({
    name: layer,
    value: accumulator.get(layer) ?? 0,
  }));
}

export async function listApiKeys(
  getToken: TokenGetter,
  options?: { cursor?: string | null; limit?: number },
): Promise<PaginatedResponse<ApiKeyData>> {
  const limit = Math.min(50, Math.max(1, options?.limit ?? 20));
  const search = new URLSearchParams({
    limit: String(limit),
  });
  if (options?.cursor) {
    search.set("cursor", options.cursor);
  }

  return apiFetch<PaginatedResponse<ApiKeyData>>(
    `/v1/api-keys?${search.toString()}`,
    getToken,
  );
}

export async function createApiKey(
  getToken: TokenGetter,
  payload: {
    name: string;
    permissions?: string[];
    rate_limit_per_minute?: number;
  },
): Promise<ApiKeyCreateData> {
  const response = await apiFetch<Envelope<ApiKeyCreateData>>(
    "/v1/api-keys",
    getToken,
    {
      method: "POST",
      body: JSON.stringify({
        name: payload.name,
        permissions: payload.permissions ?? [],
        rate_limit_per_minute: payload.rate_limit_per_minute ?? 60,
      }),
    },
  );

  return response.data;
}

export async function revokeApiKey(
  getToken: TokenGetter,
  apiKeyId: string,
): Promise<boolean> {
  const response = await apiFetch<Envelope<{ deleted: boolean }>>(
    `/v1/api-keys/${encodeURIComponent(apiKeyId)}`,
    getToken,
    { method: "DELETE" },
  );
  return response.data.deleted;
}

export async function listServiceWriters(
  getToken: TokenGetter,
): Promise<ServiceWriter[]> {
  const response = await apiFetch<Envelope<ServiceWriter[]>>(
    "/v1/tenant/service-writers",
    getToken,
  );
  return response.data;
}

export async function createServiceWriter(
  getToken: TokenGetter,
  payload: {
    service_key: string;
    display_name: string;
    api_key_id?: string | null;
    authority_rules: AuthorityRules;
  },
): Promise<ServiceWriter> {
  const response = await apiFetch<Envelope<ServiceWriter>>(
    "/v1/tenant/service-writers",
    getToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function updateServiceWriter(
  getToken: TokenGetter,
  writerId: string,
  payload: Partial<{
    display_name: string;
    api_key_id: string | null;
    authority_rules: AuthorityRules;
    is_active: boolean;
  }>,
): Promise<ServiceWriter> {
  const response = await apiFetch<Envelope<ServiceWriter>>(
    `/v1/tenant/service-writers/${encodeURIComponent(writerId)}`,
    getToken,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function listSourceEvents(
  getToken: TokenGetter,
  options?: {
    externalUserId?: string;
    sourceService?: string;
    limit?: number;
  },
): Promise<MemorySourceEvent[]> {
  const search = new URLSearchParams({
    limit: String(options?.limit ?? 100),
  });
  if (options?.externalUserId) {
    search.set("external_user_id", options.externalUserId);
  }
  if (options?.sourceService) {
    search.set("source_service", options.sourceService);
  }
  const response = await apiFetch<Envelope<MemorySourceEvent[]>>(
    `/v1/tenant/source-events?${search.toString()}`,
    getToken,
  );
  return response.data;
}

export async function listGlobalAgents(
  getToken: TokenGetter,
): Promise<GlobalAgentData[]> {
  const response = await apiFetch<Envelope<GlobalAgentData[]>>(
    "/v1/agents/global",
    getToken,
  );
  return response.data;
}

export async function createGlobalAgent(
  getToken: TokenGetter,
  payload: {
    name: string;
    description?: string | null;
    logo_url?: string | null;
    website_url?: string | null;
    default_categories_requested: MemoryCategory[];
    redirect_uri?: string | null;
  },
): Promise<GlobalAgentCreateData> {
  const response = await apiFetch<Envelope<GlobalAgentCreateData>>(
    "/v1/agents/global",
    getToken,
    {
      method: "POST",
      body: JSON.stringify({
        name: payload.name,
        description: payload.description || null,
        logo_url: payload.logo_url || null,
        website_url: payload.website_url || null,
        default_categories_requested: payload.default_categories_requested,
        redirect_uri: payload.redirect_uri || "",
      }),
    },
  );

  return response.data;
}

export async function createPassportLinkToken(
  getToken: TokenGetter,
  payload: {
    agent_id: string;
    external_user_id: string;
  },
): Promise<PassportLinkTokenData> {
  const response = await apiFetch<Envelope<PassportLinkTokenData>>(
    "/v1/tenant/memory-passport/link-token",
    getToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  return response.data;
}

export async function updateTenantSettings(
  getToken: TokenGetter,
  payload: Partial<TenantSettings>,
): Promise<TenantSettings> {
  const response = await apiFetch<Envelope<TenantSettings>>(
    "/v1/tenant/settings",
    getToken,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  return response.data;
}

export async function testTenantWebhook(
  getToken: TokenGetter,
): Promise<{ delivered: boolean; status_code: number }> {
  const response = await apiFetch<
    Envelope<{ delivered: boolean; status_code: number }>
  >("/v1/tenant/test-webhook", getToken, {
    method: "POST",
  });

  return response.data;
}

export async function getDeprecationUsage(
  getToken: TokenGetter,
): Promise<DeprecationUsageEntry[]> {
  const response = await apiFetch<Envelope<DeprecationUsageEntry[]>>(
    "/v1/tenant/deprecation-usage",
    getToken,
  );

  return response.data;
}

export async function listMemories(
  getToken: TokenGetter,
  options?: {
    cursor?: string | null;
    limit?: number;
    categories?: string[];
    agentId?: string | null;
    externalUserId?: string | null;
  },
): Promise<PaginatedResponse<MemoryRecord>> {
  const search = new URLSearchParams({
    limit: String(options?.limit ?? 20),
  });
  if (options?.cursor) {
    search.set("cursor", options.cursor);
  }
  for (const category of options?.categories ?? []) {
    search.append("categories", category);
  }
  if (options?.agentId) {
    search.set("agent_id", options.agentId);
  }
  if (options?.externalUserId) {
    search.set("external_user_id", options.externalUserId);
  }

  return apiFetch<PaginatedResponse<MemoryRecord>>(
    `/v1/memories?${search.toString()}`,
    getToken,
  );
}

export async function retrieveMemories(
  getToken: TokenGetter,
  payload: RetrieveMemoriesRequest,
): Promise<RetrieveMemoriesResponse> {
  const body: Record<string, unknown> = {
    external_user_id: payload.external_user_id,
    query: payload.query,
    limit: payload.limit ?? 10,
    format: payload.format ?? "bullets",
    context_max_tokens: payload.context_max_tokens ?? 500,
  };
  if (payload.categories?.length) {
    body.categories = payload.categories;
  }
  if (payload.agent_id) {
    body.agent_id = payload.agent_id;
  }
  if (payload.time_filter_days !== undefined && payload.time_filter_days !== null) {
    body.time_filter_days = payload.time_filter_days;
  }

  const response = await apiFetch<RetrieveMemoriesResponse | Envelope<RetrieveMemoriesResponse>>(
    "/v1/memories/retrieve",
    getToken,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  return "data" in response && !Array.isArray(response.data) && typeof response.data === "object"
    ? response.data
    : (response as RetrieveMemoriesResponse);
}

export async function deleteMemory(
  getToken: TokenGetter,
  memoryId: string,
): Promise<boolean> {
  const response = await apiFetch<Envelope<{ deleted: boolean }>>(
    `/v1/memories/${encodeURIComponent(memoryId)}`,
    getToken,
    { method: "DELETE" },
  );

  return response.data.deleted;
}
