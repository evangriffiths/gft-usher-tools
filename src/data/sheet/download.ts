import { SHEET_EXPORT_URL } from "../../config.js";

export async function downloadWorkbook(): Promise<ArrayBuffer> {
  const url = SHEET_EXPORT_URL();
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to download spreadsheet: ${response.status} ${response.statusText}`);
  }
  return response.arrayBuffer();
}
