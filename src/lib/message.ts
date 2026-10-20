/** The text a climbing key signs for a climb record. Built identically in the browser and on the server. */
export const climbMessage = (body: Record<string, unknown>) =>
  `ROPES climb record\n${JSON.stringify(
    Object.fromEntries(
      Object.entries(body)
        .filter(([k, v]) => k !== "sig" && v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  )}`;
