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

export type QuotaMode =
  | "FULL"
  | "PASSTHROUGH"
  | "DEGRADED_RETRIEVE"
  | "BLOCKED";

export type TenantUsage = {
  calls_used: number;
  calls_limit: number | null;
  tokens_used: number;
  tokens_limit: number | null;
  mode: QuotaMode;
  budget_remaining_pct: number;
  reset_at: string | null;
  plan_tier: "free" | "starter" | "growth" | "enterprise";
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
  confidence_score: number;
  created_at: string | null;
  updated_at: string | null;
  last_accessed_at: string | null;
  access_count: number;
  is_archived: boolean;
  agent_id: string | null;
  metadata: Record<string, unknown>;
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
  const search = new URLSearchParams({
    limit: String(options?.limit ?? 20),
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
