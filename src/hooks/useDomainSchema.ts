"use client";

import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";

import {
  type DomainSchemaValue,
  getTenantDomainSchema,
  updateTenantDomainSchema,
} from "@/lib/api";

export const DOMAIN_SCHEMA_SWR_KEY = "tenant-domain-schema";

export function useDomainSchema() {
  const { isLoaded, getToken } = useAuth();
  const swr = useSWR(
    isLoaded ? DOMAIN_SCHEMA_SWR_KEY : null,
    () => getTenantDomainSchema(getToken),
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
    },
  );

  async function setDomainSchema(domainSchema: DomainSchemaValue) {
    const updated = await updateTenantDomainSchema(getToken, domainSchema);
    await swr.mutate(updated, { revalidate: false });
    return updated;
  }

  return {
    ...swr,
    domainSchema: swr.data?.domain_schema ?? null,
    availableDomains: swr.data?.available_domains ?? [],
    setDomainSchema,
  };
}
