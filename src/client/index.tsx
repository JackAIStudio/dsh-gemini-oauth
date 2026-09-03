// Client plugin entry for dsh-gemini-oauth

import React from "react";
import { zh, en, NS } from "./i18n";
import { installStyle, GEMINI_NAV_MARKER } from "./styles";
import { GeminiIcon } from "./components/GeminiIcon";
import { GeminiSettings } from "./GeminiSettings";
import { GeminiUsageChip } from "./components/GeminiUsageChip";
import { startGlobalPolling } from "./quota-state";

export const inject = ["slots", "locale"];

function registerGeminiSettingsNavIcon(): () => void {
  if (typeof document === "undefined") return () => {};
  let disposed = false;
  const sync = () => {
    if (disposed) return;
    const buttons = document.querySelectorAll<HTMLButtonElement>('[role="dialog"] nav button');
    for (const b of buttons) {
      const text = b.textContent ? b.textContent.trim() : "";
      const match = text === "Gemini OAuth 登录" || text === "Gemini OAuth Login" || text === "Gemini OAuth";
      if (match) b.setAttribute(GEMINI_NAV_MARKER, "");
      else b.removeAttribute(GEMINI_NAV_MARKER);
    }
  };
  sync();
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });
  const onDocClick = () => {
    setTimeout(sync, 20);
    setTimeout(sync, 120);
  };
  document.addEventListener("click", onDocClick);
  return () => {
    disposed = true;
    observer.disconnect();
    document.removeEventListener("click", onDocClick);
    document.querySelectorAll(`[${GEMINI_NAV_MARKER}]`).forEach((el) => {
      el.removeAttribute(GEMINI_NAV_MARKER);
    });
  };
}

export function apply(ctx: any): void {
  installStyle();
  const cleanupNavIcon = registerGeminiSettingsNavIcon();
  if (ctx.effect && typeof ctx.effect === "function") {
    ctx.effect(() => () => {
      cleanupNavIcon();
    }, "dsh-gemini-oauth nav icon");
  }
  if (ctx.locale && typeof ctx.locale.register === "function") {
    ctx.locale.register(NS, { zh, en });
  }

  startGlobalPolling();

  ctx.slots.inject("settings.section", () =>
    ctx.slots.register(
      {
        name: "settings.section",
        id: "gemini-oauth",
        order: 13,
        label: () => "Gemini OAuth 登录",
        icon: <GeminiIcon size={14} />,
      },
      (props: any) => <GeminiSettings {...props} ctx={ctx} />
    )
  );

  ctx.slots.inject("conversation.composer.dock", () =>
    ctx.slots.register(
      {
        name: "conversation.composer.dock",
        id: "dsh-gemini-oauth-usage-dock",
        order: -8,
        label: () => "Gemini OAuth",
      },
      (props: any) => <GeminiUsageChip {...props} seat="dock" ctx={ctx} />
    )
  );

  ctx.slots.inject("conversation.input.dock", () =>
    ctx.slots.register(
      {
        name: "conversation.input.dock",
        id: "dsh-gemini-oauth-usage-hero",
        order: 52,
        label: () => "Gemini OAuth",
      },
      (props: any) => <GeminiUsageChip {...props} seat="hero" ctx={ctx} />
    )
  );
}
