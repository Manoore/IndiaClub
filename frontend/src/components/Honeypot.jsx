import React from "react";

// Hidden field that people never see or fill in; bots that auto-fill every input get rejected by the API.
export const HONEYPOT_FIELD = "website_hp";

export default function Honeypot({ value, onChange }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Leave this empty
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
