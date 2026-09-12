import { AlertTriangle, Banknote, Check, X } from "lucide-react";

import type { PaymentFinding } from "@/types";
import { Card, RiskPill } from "@/components/ui/primitives";
import { CardHeader, Fact, FactGrid } from "@/components/Verification/VerificationList";
import { riskTone } from "@/utils/ui";

export function PaymentCard({ payment }: { payment: PaymentFinding }) {
  const tone = riskTone[payment.risk];

  return (
    <Card className="p-4 sm:p-5">
      <CardHeader
        icon={<Banknote className="size-[18px]" aria-hidden="true" />}
        title="Payment Safety Analysis"
        subtitle="What is being asked of you, and what is missing"
        action={<RiskPill level={payment.risk} />}
      />

      <FactGrid className="mt-4">
        <Fact label="Requested amount" value={payment.amount_display ?? "Amount not clearly stated"} />
        <Fact label="Purpose" value={payment.purpose ?? "Not clearly stated"} />
        <Fact label="Recipient" value={payment.recipient ?? "Not identified"} />
        <Fact
          label="Invoice"
          value={
            payment.invoice === "provided" ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-brand-600" aria-hidden="true" /> Provided
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <X className="size-4 text-red-600" aria-hidden="true" /> Not provided
              </span>
            )
          }
        />
        <Fact
          label="Urgency"
          value={
            payment.urgency ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
                <AlertTriangle className="size-4" aria-hidden="true" /> Detected — pressure to pay quickly
              </span>
            ) : (
              "No urgency language detected"
            )
          }
        />
        <Fact label="Amount in PKR" value={payment.amount_pkr ? payment.amount_pkr.toLocaleString("en-US") : "—"} />
      </FactGrid>

      {payment.reasons.length > 0 ? (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">Risk reasons</p>
          <ul className={`mt-2 space-y-1.5 rounded-xl border p-3.5 text-sm ${tone.badge}`}>
            {payment.reasons.map((reason) => (
              <li key={reason} className="flex gap-2 leading-relaxed">
                <span aria-hidden="true">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {payment.recommendation ? (
        <p className="mt-3 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-3 text-sm font-medium leading-relaxed text-brand-900">
          {payment.recommendation}
        </p>
      ) : null}
    </Card>
  );
}
