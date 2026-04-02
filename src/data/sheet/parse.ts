import ExcelJS from "exceljs";
import { Shift, ScreenNumber } from "../../shared/types.js";
import { argbToScreen, isBlack } from "./colors.js";
import { downloadWorkbook } from "./download.js";

/**
 * Create a Date from UK local time (handles GMT/BST automatically).
 * The sheet always uses UK local time, but the server may be in any timezone.
 */
function ukLocalDate(year: number, month: number, day: number, hour: number, min: number): Date {
  // Start by assuming UTC, then check what hour that is in London
  const utc = new Date(Date.UTC(year, month, day, hour, min));
  const londonHour = parseInt(
    utc.toLocaleString("en-GB", { timeZone: "Europe/London", hour: "2-digit", hour12: false })
  );
  if (londonHour === hour) {
    // UTC = London time (GMT period)
    return utc;
  }
  // London is ahead by 1 (BST) - subtract 1 hour to get correct UTC
  return new Date(Date.UTC(year, month, day, hour - 1, min));
}

// Matches time ranges like "12.20-16.45" or "12.20-16.45 (x2)"
const TIME_RANGE_RE = /^(\d{1,2})\.(\d{2})-(\d{1,2})\.(\d{2})/;

// Matches day headers like "TUESDAY 10th" or "Monday 6th"
const DAY_HEADER_RE = /^([A-Za-z]+)\s+(\d{1,2})(st|nd|rd|th)$/;

// Matches week headers like "March 10th to March 12th 2026"
const WEEK_HEADER_RE = /^(\w+)\s+\d{1,2}\w*\s+to\s+\w+\s+\d{1,2}\w*\s+(\d{4})/;

interface ShiftColumn {
  colIndex: number;
  screen: ScreenNumber;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
}

function getCellArgb(cell: ExcelJS.Cell): string | undefined {
  const fill = cell.fill;
  if (fill && fill.type === "pattern" && fill.fgColor?.argb) {
    return fill.fgColor.argb;
  }
  return undefined;
}

function getCellText(cell: ExcelJS.Cell): string {
  const val = cell.value;
  if (val === null || val === undefined) return "";
  if (typeof val === "object" && "richText" in val) {
    return (val as ExcelJS.CellRichTextValue).richText
      .map((rt) => rt.text)
      .join("");
  }
  return String(val).trim();
}

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function monthNameToNumber(name: string): number {
  const idx = MONTH_NAMES.indexOf(name.toLowerCase());
  if (idx === -1) throw new Error(`Unknown month: ${name}`);
  return idx; // 0-based for Date constructor
}

export async function parseShifts(months?: string[]): Promise<Shift[]> {
  const buffer = await downloadWorkbook();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const targetTabs = months
    ? workbook.worksheets.filter((ws) =>
        months.some((m) => ws.name.toLowerCase().includes(m.toLowerCase()))
      )
    : workbook.worksheets;

  const allShifts: Shift[] = [];

  for (const ws of targetTabs) {
    console.log(`Parsing sheet: ${ws.name}`);
    const shifts = parseSheet(ws);
    allShifts.push(...shifts);
  }

  return allShifts;
}

function parseSheet(ws: ExcelJS.Worksheet): Shift[] {
  const shifts: Shift[] = [];

  const tabParts = ws.name.match(/^(\w+)\s+(\d{2,4})$/);
  const tabMonth = tabParts ? monthNameToNumber(tabParts[1]) : null;
  const tabYear = tabParts
    ? parseInt(tabParts[2]) + (parseInt(tabParts[2]) < 100 ? 2000 : 0)
    : null;

  let currentYear = tabYear ?? new Date().getFullYear();
  let currentMonth = tabMonth ?? new Date().getMonth();
  let currentDay: number | null = null;

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const firstCellText = getCellText(row.getCell(1));
    const secondCellText = getCellText(row.getCell(2));

    const weekMatch = firstCellText.match(WEEK_HEADER_RE);
    if (weekMatch) {
      currentYear = parseInt(weekMatch[2]);
      currentMonth = monthNameToNumber(weekMatch[1]);
      continue;
    }

    const dayMatch = secondCellText.match(DAY_HEADER_RE);
    if (dayMatch) {
      const newDay = parseInt(dayMatch[2]);
      // Detect month rollover (e.g. 31st → 1st within a week that spans months)
      if (currentDay !== null && newDay < currentDay) {
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
      }
      currentDay = newDay;
      continue;
    }

    const timeMatch = secondCellText.match(TIME_RANGE_RE);
    if (timeMatch && currentDay !== null) {
      const shiftCols = parseShiftColumns(row, ws.columnCount);
      if (shiftCols.length === 0) continue;

      const usherRows: ExcelJS.Row[] = [];
      for (let ur = r + 1; ur <= Math.min(r + 4, ws.rowCount); ur++) {
        const usherRow = ws.getRow(ur);
        const label = getCellText(usherRow.getCell(1));
        if (label.toLowerCase().startsWith("usher")) {
          usherRows.push(usherRow);
        }
      }

      for (const col of shiftCols) {
        const startTime = ukLocalDate(
          currentYear, currentMonth, currentDay,
          col.startHour, col.startMin
        );
        const endTime = ukLocalDate(
          currentYear, currentMonth, currentDay,
          col.endHour, col.endMin
        );

        if (endTime < startTime) {
          endTime.setDate(endTime.getDate() + 1);
        }

        let slots = 0;
        const ushers: string[] = [];

        for (const usherRow of usherRows) {
          const cell = usherRow.getCell(col.colIndex);
          const argb = getCellArgb(cell);
          if (!isBlack(argb)) {
            slots++;
            const name = getCellText(cell);
            if (name) ushers.push(name);
          }
        }

        if (slots > 0) {
          shifts.push({
            screen: col.screen,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            otherUshers: ushers,
            slots,
          });
        }
      }
    }
  }

  return shifts;
}

function parseShiftColumns(row: ExcelJS.Row, maxCol: number): ShiftColumn[] {
  const cols: ShiftColumn[] = [];

  for (let c = 2; c <= maxCol; c++) {
    const cell = row.getCell(c);
    const text = getCellText(cell);
    const match = text.match(TIME_RANGE_RE);
    if (!match) continue;

    const argb = getCellArgb(cell);
    const screen = argbToScreen(argb);
    if (!screen) continue;

    cols.push({
      colIndex: c,
      screen,
      startHour: parseInt(match[1]),
      startMin: parseInt(match[2]),
      endHour: parseInt(match[3]),
      endMin: parseInt(match[4]),
    });
  }

  return cols;
}
