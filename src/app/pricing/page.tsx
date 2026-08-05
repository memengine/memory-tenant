import { redirect } from "next/navigation";

function marketingPricingUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_MARKETING_BASE_URL;
  if (!baseUrl) {
    // No marketing URL configured — redirect to the upgrade page instead
    return process.env.NEXT_PUBLIC_UPGRADE_URL ?? "/";
  }
  return `${baseUrl.replace(/\/$/, "")}/pricing`;
}

export default function PricingRedirectPage() {
  redirect(marketingPricingUrl());
}
