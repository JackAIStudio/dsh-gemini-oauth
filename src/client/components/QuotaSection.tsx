import React from "react";
import type { QuotaSummary } from "../../common/types";
import { geminiQuotaBuckets, quotaBucketLabel } from "../quota-state";
import { QuotaRow } from "./QuotaRow";
import type { Translator } from "../types";

interface QuotaSectionProps {
  quota?: QuotaSummary | null;
  t: Translator;
  embedded?: boolean;
}

export function QuotaSection({ quota, t, embedded }: QuotaSectionProps) {
  const buckets = geminiQuotaBuckets(quota);
  if (buckets.length === 0) return null;

  return (
    <div className={embedded ? "dgo-account-quota" : undefined}>
      {!embedded && <div className="dgo-quota-title">{t("quota")}</div>}
      {buckets.map((bucket, index) => (
        <QuotaRow
          key={bucket.bucketId || `${bucket.displayName || "bucket"}-${index}`}
          bucket={{ ...bucket, displayName: quotaBucketLabel(bucket, t) }}
          t={t}
        />
      ))}
    </div>
  );
}
