import React from "react";

const GEMINI_SVG_PATH = "M12 2c-.6 5-4 8.5-9 9 5 .5 8.4 4 9 9 .6-5 4-8.5 9-9-5-.5-8.4-4-9-9Z";

interface GeminiIconProps {
  size?: number;
  className?: string;
}

export function GeminiIcon({ size = 20, className = "" }: GeminiIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle" }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d={GEMINI_SVG_PATH} fill="currentColor" />
    </svg>
  );
}
