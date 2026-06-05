import { redirect } from "next/navigation";

function marketingPricingUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_MARKETING_BASE_URL || "http://localhost:3002";
  return `${baseUrl.replace(/\/$/, "")}/pricing`;
}

export default function PricingRedirectPage() {
  redirect(marketingPricingUrl());
}
