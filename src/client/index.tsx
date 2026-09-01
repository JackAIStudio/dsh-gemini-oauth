// Client plugin entry for dsh-gemini-oauth

import React from "react";
import { zh, en, NS } from "./i18n";
import { installStyle } from "./styles";
import { GeminiIcon } from "./components/GeminiIcon";
import { GeminiSettings } from "./GeminiSettings";
import { GeminiUsageChip } from "./components/GeminiUsageChip";

export const inject = ["slots", "locale"];

export function apply(ctx: any): void {
  installStyle();
  if (ctx.locale && typeof ctx.locale.register === "function") {
    ctx.locale.register(NS, { zh, en });
  }

  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "gemini-oauth",
    order: 13,
    label: () => "Gemini OAuth 登录",
    icon: <GeminiIcon size={14} />,
  }, (props: any) => <GeminiSettings {...props} ctx={ctx} />));

  ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
    name: "conversation.composer.dock",
    id: "dsh-gemini-oauth-usage-dock",
    order: -90,
    label: () => "Gemini OAuth",
  }, (props: any) => <GeminiUsageChip {...props} />));
}
