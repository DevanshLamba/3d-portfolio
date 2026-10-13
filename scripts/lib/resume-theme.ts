// The résumé's visual theme, shared by the full and one-page versions so
// both always look the same. Returned as the contents of a <style> tag.

export function resumeCss(numberColumns: number): string {
  return `  @page { size: A4; margin: 13mm 14mm 13mm 14mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font: 10pt/1.45 "Geist", system-ui, sans-serif; color: #2e2a24; }
  a { color: inherit; text-decoration: none; border-bottom: 1px solid #e0b98a; }
  .mono, .label, .meta, .stack, .links, .contact, .numbers span { font-family: "IBM Plex Mono", ui-monospace, monospace; }

  .top { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid #2e2a24; padding-bottom: 8px; }
  h1 { margin: 0; font-size: 27pt; line-height: 1; letter-spacing: -0.5px; }
  .title { margin: 5px 0 0; font: 600 11pt "IBM Plex Mono", monospace; color: #c46a1f; letter-spacing: 0.3px; }
  .stamp { font: 700 8pt "IBM Plex Mono", monospace; letter-spacing: 1.5px; text-transform: uppercase; color: #b24a35; border: 2px solid #b24a35; border-radius: 4px; padding: 4px 8px; transform: rotate(-4deg); white-space: nowrap; }
  .contact { margin: 7px 0 0; font-size: 8.4pt; color: #4e453a; display: flex; flex-wrap: wrap; gap: 4px 14px; }

  .summary { margin: 10px 0 8px; font-size: 10pt; }
  .numbers { display: grid; grid-template-columns: repeat(${numberColumns}, 1fr); gap: 6px; margin: 0 0 4px; }
  .numbers div { border: 1.3px solid #2e2a24; border-radius: 4px; padding: 5px 7px; background: #fbf5ea; }
  .numbers b { display: block; font-size: 13.5pt; line-height: 1.1; }
  .numbers span { font-size: 6.8pt; text-transform: uppercase; letter-spacing: 0.4px; color: #6e6253; }

  h2 { margin: 12px 0 5px; font: 600 8.6pt "IBM Plex Mono", monospace; letter-spacing: 2px; text-transform: uppercase; color: #6e6253; display: flex; align-items: center; gap: 8px; }
  h2::after { content: ""; flex: 1; border-top: 1px solid #d8c7a6; }

  .project { break-inside: avoid; margin: 0 0 8px; padding-left: 9px; border-left: 2.5px solid #e8a066; }
  .project header { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
  .project h3 { margin: 0; font-size: 11pt; }
  .project .cat { font-weight: 500; color: #4e453a; font-size: 9.5pt; }
  .meta { margin: 1px 0 0; font-size: 7.8pt; color: #6e6253; }
  .tag { color: #2f6e5c; font-weight: 600; }
  .links { margin: 0; font-size: 7.6pt; text-align: right; white-space: nowrap; color: #4e453a; }
  .stack { margin: 2px 0 2px; font-size: 7.8pt; color: #c46a1f; }
  .project ul { margin: 2px 0 0; padding-left: 15px; }
  .project li { margin: 0 0 1.5px; font-size: 9.2pt; }
  .planned { margin: 3px 0 0; font-size: 8.6pt; color: #6e6253; }

  .grid2 { display: grid; grid-template-columns: 1.35fr 1fr; gap: 0 22px; }
  .skills p { margin: 0 0 3px; font-size: 9pt; }
  .skills b { font: 600 7.8pt "IBM Plex Mono", monospace; text-transform: uppercase; letter-spacing: 0.5px; color: #6e6253; margin-right: 4px; }
  .plain { margin: 0 0 3px; font-size: 9pt; }
  .plain small { color: #6e6253; font-family: "IBM Plex Mono", monospace; font-size: 7.8pt; }
  ul.plain-list { margin: 0; padding-left: 15px; font-size: 9pt; }
`;
}
