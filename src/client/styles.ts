// CSS Styles for Gemini OAuth Settings and Dock

export const STYLE_ID = "dsh-gemini-oauth-settings-style";

export function installStyle(): void {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.dgo-wrap{box-sizing:border-box;width:100%;max-width:760px;padding:0 0 24px;color:#111827}
.dgo-page-head{display:flex;align-items:center;gap:10px}
.dgo-brand-icon{color:#111827;flex-shrink:0}
.dgo-page-title{margin:0;color:#111827;font-size:20px;font-weight:700;line-height:28px}
.dgo-page-desc{margin:8px 0 18px;color:#8b93a1;font-size:13px;line-height:20px}
.dgo-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;box-shadow:none}
.dgo-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.dgo-title{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:700;color:#111827}
.dgo-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.dgo-btn{border:1px solid #d7dce3;background:#fff;color:#111827;border-radius:10px;padding:7px 12px;font-size:13px;line-height:18px;cursor:pointer}
.dgo-btn:hover{background:#f7f8fa}
.dgo-btn:disabled{cursor:not-allowed;opacity:.55}
.dgo-btn-primary{border-color:#111827;background:#111827;color:white}
.dgo-btn-primary:hover{background:#272d38}
.dgo-account{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding:12px;border:1px solid #eef1f5;border-radius:10px;background:#fafbfc;color:#4b5563}
.dgo-account-list{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}
.dgo-account-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid #eef1f5;border-radius:10px;background:#fafbfc;color:#4b5563}
.dgo-account-main{display:flex;flex-direction:column;gap:5px;min-width:0;flex:1 1 auto}
.dgo-account-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:16px}
.dgo-active-badge{display:inline-flex;align-items:center;font-size:12px;line-height:16px;font-weight:650;color:#059669;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:999px;padding:1px 8px}
.dgo-account-caption{font-size:12px;line-height:16px;color:#8b93a1}
.dgo-account-caption-error{color:#dc2626}
.dgo-account-actions{display:flex;gap:6px;flex:none;flex-wrap:wrap;justify-content:flex-end}
.dgo-accounts-help{margin-top:10px;color:#8b93a1;font-size:12px;line-height:18px}
.dgo-accounts-empty{border:1px dashed #d8dee8;border-radius:10px;padding:14px;color:#747f90;background:#fafbfc;font-size:13px;line-height:20px}
.dgo-email{display:flex;align-items:center;gap:9px;font-size:14px;font-weight:650;min-width:0}
.dgo-email-mark{width:16px;height:12px;border:1.8px solid #7f8a9a;border-radius:3px;position:relative;flex:0 0 auto}
.dgo-email-mark:before{content:"";position:absolute;left:1px;right:1px;top:1px;height:7px;border-bottom:1.8px solid #7f8a9a;transform:skewY(-28deg)}
.dgo-email-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dgo-quota-title{margin:16px 0 6px;color:#111827;font-size:14px;font-weight:700}
.dgo-quota-group{margin-top:10px;padding:12px 14px;background:#fafbfc;border:1px solid #eef1f5;border-radius:10px}
.dgo-group-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.dgo-group-title{font-size:13px;font-weight:700;color:#111827}
.dgo-group-desc{font-size:12px;color:#8b93a1}
.dgo-row{padding:8px 0;border-top:1px solid #edf1f5}
.dgo-row:first-of-type{border-top:0;padding-top:0}
.dgo-rowtop{display:flex;align-items:baseline;justify-content:space-between;gap:12px;color:#4b5563;font-weight:600;font-size:13px}
.dgo-metrics{display:flex;align-items:baseline;gap:10px;white-space:nowrap;color:#8b93a1;font-size:12px}
.dgo-percent{font-size:13px;font-weight:750;color:#059669}
.dgo-percent-cyan{color:#0284c7}
.dgo-bar{height:6px;margin-top:6px;border-radius:999px;background:#edf1f5;overflow:hidden}
.dgo-fill{height:100%;border-radius:999px;background:#10b981}
.dgo-fill-cyan{background:#06b6d4}
.dgo-empty{border:1px dashed #d8dee8;border-radius:10px;padding:14px;color:#747f90;background:#fafbfc;font-size:13px;line-height:20px}
.dgo-error{margin-top:12px;color:#991b1b;background:#fff5f5;border:1px solid #fecaca;border-radius:10px;padding:10px 12px;font-size:13px;white-space:pre-wrap}
.dgo-note{margin-top:12px;color:#8b93a1;font-size:12px;line-height:18px}
.dgo-model-card{margin-top:14px}
.dgo-net-card{margin-top:14px}
.dgo-net-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
.dgo-net-title{font-size:14px;font-weight:700;color:#111827}
.dgo-net-desc{margin-top:3px;color:#8b93a1;font-size:12px;line-height:18px}
.dgo-net-label{display:block;margin-bottom:6px;color:#4b5563;font-size:13px;font-weight:650}
.dgo-net-input{box-sizing:border-box;width:100%;padding:8px 12px;border:1px solid #d7dce3;border-radius:10px;font-size:13px;line-height:20px;color:#111827;background:#fff;outline:none}
.dgo-net-input:focus{border-color:#111827}
.dgo-net-help{margin-top:8px;color:#8b93a1;font-size:12px;line-height:18px}
.dgo-net-actions{margin-top:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dgo-net-btn{border:1px solid #d7dce3;background:#fff;color:#111827;border-radius:10px;padding:7px 14px;font-size:13px;line-height:18px;cursor:pointer}
.dgo-net-btn:hover{background:#f7f8fa}
.dgo-net-btn:disabled{cursor:not-allowed;opacity:.55}
.dgo-net-btn-primary{border-color:#111827;background:#111827;color:white}
.dgo-net-btn-primary:hover{background:#272d38}
.dgo-net-status{margin-top:10px;color:#059669;font-size:12px;line-height:18px}
.dgo-net-status-error{margin-top:10px;color:#991b1b;background:#fff5f5;border:1px solid #fecaca;border-radius:10px;padding:10px 12px;font-size:12px;line-height:18px;white-space:pre-wrap}
.dgo-model-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
.dgo-model-title{font-size:14px;font-weight:700;color:#111827}
.dgo-model-desc{margin-top:3px;color:#8b93a1;font-size:12px;line-height:18px}
.dgo-mini-actions{display:flex;gap:8px;white-space:nowrap}
.dgo-mini-btn{border:0;background:transparent;color:#4f5bf6;font-size:12px;line-height:18px;cursor:pointer;padding:0}
.dgo-mini-btn:hover{text-decoration:underline}
.dgo-mini-btn:disabled{cursor:not-allowed;opacity:.55}
.dgo-model-list{border:1px solid #eef1f5;border-radius:10px;overflow:hidden;max-height:320px;overflow-y:auto}
.dgo-model-row{display:flex;align-items:flex-start;gap:10px;padding:9px 14px;background:#fff;border-top:1px solid #eef1f5;cursor:pointer}
.dgo-model-row:hover{background:#fafbfc}
.dgo-model-row:first-child{border-top:0}
.dgo-check{margin-top:1px;width:16px;height:16px;accent-color:#111827;flex:0 0 auto}
.dgo-model-text{min-width:0;flex:1 1 auto}
.dgo-model-name{display:block;font-size:13px;font-weight:650;color:#111827;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dgo-model-sub{display:block;margin-top:2px;color:#9aa3b0;font-size:12px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dgo-chip{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:inherit;cursor:default;position:relative;user-select:none;white-space:nowrap;flex:0 0 auto !important;line-height:20px}
.dgo-chip:not(:last-child)::after{content:"|";color:var(--dsw-alias-separator-primary, rgba(0,0,0,0.2));margin:0 10px;font-size:12px;line-height:20px}
.dgo-chip:hover{opacity:0.8}
.dgo-chip-danger{color:#dc2626}
.dgo-chip-danger:hover{opacity:0.8}
.dgo-chip-icon{width:14px;height:14px;color:inherit;flex-shrink:0}
.dgo-tooltip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 12px;border-radius:8px;font-size:12px;line-height:18px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.15s;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.dgo-chip:hover .dgo-tooltip{opacity:1}
.dgo-tooltip::after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);border-width:5px;border-style:solid;border-color:#111827 transparent transparent transparent}
.dgo-tt-title{font-weight:600;margin-bottom:6px;color:#e5e7eb}
.dgo-tt-row{display:flex;justify-content:space-between;gap:16px;margin-top:4px;color:#9ca3af}
.dgo-tt-val{color:#fff;font-weight:500}
`;
  document.head.append(style);
}
