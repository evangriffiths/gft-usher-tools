export const SHEET_ID =
  "12EeTMX3oHZyoCCEm4wxXMWE1VIaCCy47oJwBBSN8Br8";

export const SHEET_EXPORT_URL = (gid?: string) => {
  const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;
  return gid ? `${base}&gid=${gid}` : base;
};

export const GFT_BASE_URL = "https://www.glasgowfilm.org";

export const SERVER_PORT = 3000;
