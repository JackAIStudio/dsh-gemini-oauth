import React, { useMemo } from "react";
import type { ModelCatalogOption } from "../../common/types";
import type { Translator } from "../types";

interface ModelSelectorProps {
  options: ModelCatalogOption[];
  busy: boolean;
  onToggle: (modelId: string, enabled: boolean) => void;
  onSetAll: (enabled: boolean) => void;
  t: Translator;
}

export function ModelSelector({ options, busy, onToggle, onSetAll, t }: ModelSelectorProps) {
  const familyOrder = (option: ModelCatalogOption): number => {
    const text = `${option.id || ""} ${option.name || ""}`.toLowerCase();
    if (text.includes("gemini")) return 1;
    if (text.includes("claude")) return 2;
    if (text.includes("gpt")) return 3;
    return 4;
  };

  const versionOf = (option: ModelCatalogOption): number[] => {
    const match = `${option.id} ${option.name}`.match(/(?:gemini|claude|gpt)[-_ ]*v?(\d+(?:\.\d+)*)/i)
      || `${option.id} ${option.name}`.match(/\b(\d+(?:\.\d+)+)\b/);
    if (!match) return [0];
    return match[1].split(".").map((num) => parseInt(num, 10) || 0);
  };

  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      const famA = familyOrder(a);
      const famB = familyOrder(b);
      if (famA !== famB) return famA - famB;
      const va = versionOf(a);
      const vb = versionOf(b);
      const len = Math.max(va.length, vb.length);
      for (let i = 0; i < len; i++) {
        const na = va[i] ?? 0;
        const nb = vb[i] ?? 0;
        if (na !== nb) return nb - na;
      }
      return (a.name || a.id || "").localeCompare(b.name || b.id || "");
    });
  }, [options]);

  return (
    <section className="dgo-card dgo-model-card">
      <div className="dgo-model-head">
        <div>
          <div className="dgo-model-title">{t("modelSelector")}</div>
          <div className="dgo-model-desc">{t("modelSelectorDesc")}</div>
        </div>
        <div className="dgo-mini-actions">
          <button className="dgo-mini-btn" disabled={busy} onClick={() => onSetAll(true)}>
            {t("selectAll")}
          </button>
          <button className="dgo-mini-btn" disabled={busy} onClick={() => onSetAll(false)}>
            {t("unselectAll")}
          </button>
        </div>
      </div>
      {sortedOptions.length === 0 ? (
        <div className="dgo-empty">{t("loadingModels")}</div>
      ) : (
        <div className="dgo-model-list">
          {sortedOptions.map((option) => (
            <label className="dgo-model-row" key={option.id}>
              <input
                className="dgo-check"
                type="checkbox"
                checked={!!option.enabled}
                disabled={busy}
                onChange={(event) => onToggle(option.id, event.target.checked)}
              />
              <span className="dgo-model-text">
                <span className="dgo-model-name">{option.name || option.id}</span>
                <span className="dgo-model-sub">{option.id}</span>
              </span>
            </label>
          ))}
        </div>
      )}
      <div className="dgo-note">{t("modelSelectorNote")}</div>
    </section>
  );
}
