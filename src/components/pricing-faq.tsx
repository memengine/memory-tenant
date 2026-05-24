"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Do I need a credit card for the free plan?",
    answer:
      "No. You can start on the Free plan without a credit card and add billing only when you upgrade.",
  },
  {
    question: "What counts as an API call?",
    answer:
      "Each MemoryOS API request counts as one call, including writes, retrievals, and tenant operations.",
  },
  {
    question: "What happens when I hit my monthly limit?",
    answer:
      "Free plans pause API usage at the limit. Paid plans keep your AI product running without memory context until capacity is restored or the plan is upgraded.",
  },
  {
    question: "Can I switch between monthly and annual billing?",
    answer:
      "Yes. You can choose monthly or annual checkout from the pricing page. Annual billing gives you two months free.",
  },
  {
    question: "Is data residency included?",
    answer:
      "All plans start in IN1. Enterprise customers can choose their preferred supported region.",
  },
  {
    question: "Which plans include cross-agent memory?",
    answer:
      "Growth and Enterprise include cross-agent memory features. Agent network add-ons are available for teams building public agents.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Billing is managed through Stripe Billing Portal, and your plan remains active until the end of the paid period.",
  },
  {
    question: "Do you offer custom enterprise contracts?",
    answer:
      "Yes. Enterprise plans support custom limits, dedicated Slack support, regional choices, and custom procurement terms.",
  },
];

export function PricingFaq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="bg-white px-4 py-20 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Frequently asked questions
        </h2>
        <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={faq.question}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-950"
                  aria-expanded={isOpen}
                >
                  {faq.question}
                  <ChevronDown
                    className={`size-4 shrink-0 text-slate-500 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen ? (
                  <div className="px-5 pb-5 text-sm leading-6 text-slate-600">
                    {faq.answer}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
