import React from "react";
import type { QuotaGroup, QuotaSummary } from "../../common/types";
import { QuotaRow } from "./QuotaRow";
import type { Translator } from "../types";

interface QuotaSectionProps {
  quota: { quota?: QuotaSummary | null; fetchedAt?: string } | null;
  t: Translator;
}

export function QuotaSection({ quota, t }: QuotaSectionProps) {
  if (!quota || !quota.quota || !Array.isArray(quota.quota.groups)) return null;

  const groups: QuotaGroup[] = quota.quota.groups
    .map((group) => ({
      displayName: group.displayName,
      description: group.description,
      buckets: Array.isArray(group.buckets) ? group.buckets : [],
    }))
    .filter((group) => group.buckets && group.buckets.length > 0);

  if (groups.length === 0) return null;

  return (
    <>
      <div className="dgo-quota-title">{t("quota")}</div>
      {groups.map((group, index) => {
        const isCyan = /claude|gpt|3p|openai|anthropic/i.test(`${group.displayName || ""} ${group.description || ""}`);
        return (
          <div className="dgo-quota-group" key={group.displayName || index}>
            <div className="dgo-group-head">
              <span className="dgo-group-title">{group.displayName || t("quota")}</span>
              {group.description && <span className="dgo-group-desc">{group.description}</span>}
            </div>
            {group.buckets?.map((bucket, bucketIndex) => (
              <QuotaRow
                key={bucket.bucketId || bucketIndex}
                bucket={bucket}
                accent={isCyan ? "cyan" : "green"}
                t={t}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}
