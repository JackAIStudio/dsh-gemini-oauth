import React from "react";
import type { QuotaBucket } from "../../common/types";
import { formatReset } from "../quota-state";
import type { Translator } from "../types";

interface QuotaRowProps {
  bucket: QuotaBucket;
  accent?: "green" | "cyan";
  t: Translator;
}

export function QuotaRow({ bucket, accent, t }: QuotaRowProps) {
  const percent = Math.max(0, Math.min(100, Math.round((bucket.remainingFraction ?? 0) * 1000) / 10));
  return (
    <div className="dgo-row">
      <div className="dgo-rowtop">
        <div>{bucket.displayName || bucket.bucketId || t("quota")}</div>
        <div className="dgo-metrics">
          <span>{t("resetPrefix", { time: formatReset(bucket.resetTime, t) })}</span>
          <span className={`dgo-percent${accent === "cyan" ? " dgo-percent-cyan" : ""}`}>{`${percent}%`}</span>
        </div>
      </div>
      <div className="dgo-bar">
        <div
          className={`dgo-fill${accent === "cyan" ? " dgo-fill-cyan" : ""}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
