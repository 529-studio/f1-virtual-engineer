import type {
  RaceControlMessageItem,
  StewardInvestigationResponse,
} from "@/types/race-control";
import type {
  StewardDossierInput,
  StewardExportResult,
} from "@/types/stewardReport";

function sanitizeFilenameSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "session";
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatIncidentMarkdown(item: RaceControlMessageItem): string[] {
  const drivers = (item.drivers_involved || []).join(", ") || "N/A";
  return [
    `### Lap ${item.lap} — ${item.category} (${item.status})`,
    `- **Incident ID**: \`${item.id}\``,
    `- **Timestamp**: ${item.timestamp_str || "N/A"}`,
    `- **Drivers Involved**: ${drivers}`,
    `- **Flag**: ${item.flag ?? "NONE"}`,
    `- **Race Control Message**: ${item.message}`,
    `- **Summary**: ${item.description}`,
    "",
  ];
}

function formatInvestigationMarkdown(inv: StewardInvestigationResponse): string[] {
  const lines = [
    "## Regulatory Deliberation & Telemetry Verdict",
    `- **Regulation Cited**: ${inv.regulation_article} — ${inv.regulation_title}`,
    `- **Predicted Verdict**: \`${inv.predicted_verdict}\` (${inv.confidence_pct}% confidence)`,
    "",
    `> "${inv.regulation_snippet}"`,
    "",
    "### Team Defense Brief",
    inv.team_defense_argument,
    "",
    "### Steward Prosecution Brief",
    inv.steward_prosecution_argument,
    "",
  ];

  const breakdown = inv.penalty_breakdown || [];
  if (breakdown.length > 0) {
    lines.push("### Penalty Likelihood Matrix", "| Sanction | Probability | Rationale |", "| :--- | :---: | :--- |");
    for (const row of breakdown) {
      lines.push(`| \`${row.penalty}\` | ${row.probability_pct}% | ${row.description} |`);
    }
    lines.push("");
  }
  return lines;
}

export function buildStewardDossier(input: StewardDossierInput): StewardExportResult {
  const incidents = input.incidents || [];
  const targetIncidents =
    input.scope === "selected" && input.selectedIncident
      ? [input.selectedIncident]
      : incidents;

  const slug = sanitizeFilenameSegment(`${input.year}-${input.event}-${input.session}`);
  const suffix = input.scope === "selected" && input.selectedIncident
    ? sanitizeFilenameSegment(input.selectedIncident.id)
    : "full-session";

  const lines: string[] = [
    `# FIA Post-Race Steward Dossier — ${input.event} (${input.year})`,
    "",
    `- **Session**: ${input.session}`,
    `- **Export Scope**: ${input.scope === "selected" ? "Selected Incident" : "Full Session Summary"}`,
    `- **Incidents Included**: ${targetIncidents.length}`,
    `- **Generated**: ${new Date().toISOString()}`,
    "",
  ];

  if (targetIncidents.length === 0) {
    lines.push("_No race control incidents available for this selection._");
  } else {
    lines.push("## Incident Timeline", "");
    for (const inc of targetIncidents) {
      lines.push(...formatIncidentMarkdown(inc));
    }
  }

  if (
    input.investigation &&
    (input.scope === "session" ||
      !input.selectedIncident ||
      input.investigation.incident_id === input.selectedIncident.id)
  ) {
    lines.push(...formatInvestigationMarkdown(input.investigation));
  }

  return {
    filename: `steward-dossier-${slug}-${suffix}.md`,
    markdown: lines.join("\n"),
    incidentCount: targetIncidents.length,
  };
}

export function buildStewardPrintableHtml(input: StewardDossierInput): string {
  const dossier = buildStewardDossier(input);
  const incidents =
    input.scope === "selected" && input.selectedIncident
      ? [input.selectedIncident]
      : input.incidents || [];

  const incidentRows = incidents
    .map((inc) => {
      const drivers = escapeHtml((inc.drivers_involved || []).join(", ") || "N/A");
      return `<tr>
        <td>Lap ${inc.lap}</td>
        <td>${escapeHtml(inc.category)}</td>
        <td>${escapeHtml(inc.status)}</td>
        <td>${drivers}</td>
        <td>${escapeHtml(inc.description || inc.message)}</td>
      </tr>`;
    })
    .join("");

  const invSection = input.investigation
    ? `<section>
        <h2>Regulatory Deliberation (${escapeHtml(input.investigation.regulation_article)})</h2>
        <p><strong>${escapeHtml(input.investigation.regulation_title)}</strong></p>
        <blockquote>${escapeHtml(input.investigation.regulation_snippet)}</blockquote>
        <p><strong>Verdict:</strong> ${escapeHtml(input.investigation.predicted_verdict)} (${input.investigation.confidence_pct}% confidence)</p>
        <h3>Team Defense</h3>
        <p>${escapeHtml(input.investigation.team_defense_argument)}</p>
        <h3>Steward Prosecution</h3>
        <p>${escapeHtml(input.investigation.steward_prosecution_argument)}</p>
      </section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(dossier.filename)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; margin: 32px; line-height: 1.5; }
    h1 { font-size: 20px; border-bottom: 2px solid #111827; padding-bottom: 8px; }
    h2 { font-size: 16px; margin-top: 24px; }
    h3 { font-size: 14px; margin-top: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
    th { background: #f3f4f6; }
    blockquote { border-left: 3px solid #374151; margin: 12px 0; padding: 4px 12px; color: #374151; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <h1>FIA Post-Race Steward Dossier — ${escapeHtml(input.event)} (${input.year})</h1>
  <p><strong>Session:</strong> ${escapeHtml(input.session)} | <strong>Incidents:</strong> ${dossier.incidentCount}</p>
  <table>
    <thead><tr><th>Lap</th><th>Category</th><th>Status</th><th>Drivers</th><th>Details</th></tr></thead>
    <tbody>${incidentRows}</tbody>
  </table>
  ${invSection}
</body>
</html>`;
}

export function triggerMarkdownDownload(filename: string, markdown: string): void {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function triggerPrintReport(html: string): boolean {
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  return true;
}
