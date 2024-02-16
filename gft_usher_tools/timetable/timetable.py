import datetime
import enum
import os
import re

import gspread
import pygsheets
import requests
from dotenv import load_dotenv
from google.oauth2 import service_account
from googleapiclient.discovery import build
from oauth2client.service_account import ServiceAccountCredentials
from pydantic import BaseModel


class CellColour(BaseModel):
    red: float
    green: float
    blue: float

    @staticmethod
    def from_tuple(t: tuple[float, float, float]) -> "CellColour":
        return CellColour(red=t[0], green=t[1], blue=t[2])

    # TODO: Hardcoded values, correct as of 16/02/2024
    @staticmethod
    def get_gray() -> "CellColour":
        return CellColour(red=0.8, green=0.8, blue=0.8)

    @staticmethod
    def get_S1() -> "CellColour":
        return CellColour(red=1.0, green=0.8509804, blue=0.4)

    @staticmethod
    def get_S2() -> "CellColour":
        return CellColour(red=0.2901961, green=0.5254902, blue=0.9098039)

    @staticmethod
    def get_S3() -> "CellColour":
        return CellColour(red=1.0, green=0.0, blue=1.0)


class ScreenNumber(enum.Enum):
    ONE = 1
    TWO = 2
    THREE = 3


class Shift(BaseModel):
    screen: ScreenNumber
    start_time: datetime.datetime
    end_time: datetime.datetime
    other_ushers: list[str]


def get_current_month_str() -> str:
    return datetime.datetime.now().strftime("%B")


def get_next_month() -> str:
    next_month = datetime.datetime.now().month % 12 + 1
    return datetime.datetime(2024, next_month, 1).strftime("%B")


def get_time_table_url() -> str:
    load_dotenv()
    if "GFT_TIMETALBE_URL" in os.environ:
        url = os.environ["GFT_TIMETALBE_URL"]
    else:
        url = input("Enter the URL for the Google Sheets document: ")
        # Cache the url to .env file
        with open(".env", "a") as f:
            f.write(f"GFT_TIMETALBE_URL={url}\n")
    return url


def get_credentials_path() -> str:
    if "CREDENTIALS_JSON_PATH" in os.environ:
        credentials_path = os.environ["CREDENTIALS_JSON_PATH"]
    else:
        credentials_path = input("Enter the path to the credentials.json file: ")
        # Cache the path to .env file for future use
        with open(".env", "a") as f:
            f.write(f"CREDENTIALS_JSON_PATH={credentials_path}\n")
    return credentials_path


def get_credentials(credentials_path: str) -> ServiceAccountCredentials:
    return ServiceAccountCredentials.from_json_keyfile_name(
        filename=credentials_path,
        scopes=[
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/drive",
        ],
    )


def get_gspread_sheets_to_parse(
    url: str, credentials_path: str
) -> list[gspread.Worksheet]:
    credentials = get_credentials(credentials_path=credentials_path)
    gc = gspread.authorize(credentials)
    sh = gc.open_by_url(url)

    candidate_sheet_names: list[str] = [get_current_month_str(), get_next_month()]
    return [s for s in sh.worksheets() if s.title in candidate_sheet_names]


def get_pygsheets_with_names(
    url: str, credentials_path: str, sheet_names: list[str]
) -> list[pygsheets.Worksheet]:
    credentials = service_account.Credentials.from_service_account_file(
        credentials_path, scopes=["https://www.googleapis.com/auth/spreadsheets"]
    )
    gc = pygsheets.authorize(custom_credentials=credentials)
    sh = gc.open_by_url(url)

    candidate_sheet_names: list[str] = [get_current_month_str(), get_next_month()]
    return [s for s in sh.worksheets() if s.title in sheet_names]


def get_pygsheets_to_parse(
    url: str, credentials_path: str
) -> list[pygsheets.Worksheet]:
    credentials = service_account.Credentials.from_service_account_file(
        credentials_path, scopes=["https://www.googleapis.com/auth/spreadsheets"]
    )
    gc = pygsheets.authorize(custom_credentials=credentials)
    sh = gc.open_by_url(url)

    candidate_sheet_names: list[str] = [get_current_month_str(), get_next_month()]
    return [s for s in sh.worksheets() if s.title in candidate_sheet_names]


def extract_spreadsheet_id(url):
    # Regular expression to match Google Drive URL
    pattern = r"/spreadsheets/d/([a-zA-Z0-9-_]+)"
    match = re.search(pattern, url)
    if match:
        return match.group(1)
    else:
        return None


def _get_colour_of_cell(
    cell_name: str, sheet_name: str, sheet_url: str, credentials_path: str
):
    credentials = get_credentials(credentials_path=credentials_path)
    service = build("sheets", "v4", credentials=credentials)
    result = (
        service.spreadsheets()
        .get(
            spreadsheetId=extract_spreadsheet_id(sheet_url),
            ranges=f"{sheet_name}!{cell_name}",
            fields="sheets(data(rowData.values(userEnteredFormat.backgroundColor)))",
        )
        .execute()
    )
    return CellColour.model_validate(
        result["sheets"][0]["data"][0]["rowData"][0]["values"][0]["userEnteredFormat"][
            "backgroundColor"
        ]
    )


def download_spreadsheet(url: str, credentials_path: str, output_path: str):
    response = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {service_account.Credentials.from_service_account_file(credentials_path).token}"
        },
    )
    response.raise_for_status()
    with open(output_path, "wb") as f:
        f.write(response.content)


def get_shifts_from_gspread_sheet(sheet: gspread.Worksheet) -> list[Shift]:
    raise NotImplementedError


def get_shifts_from_pygsheet(sheet: pygsheets.Worksheet) -> list[Shift]:
    values = sheet.get_all_values()
    cell = sheet.cell("D4")
    rs = sheet.get_all_records()
    return []  # TODO: Implement


if __name__ == "__main__":
    url = get_time_table_url()
    credentials_path = get_credentials_path()

    sheet_names: list[str] = [get_current_month_str(), get_next_month()]
    for sheet in get_pygsheets_with_names(
        url=url, credentials_path=credentials_path, sheet_names=sheet_names
    ):
        print(f"Parsing sheet: {sheet.title} to find shifts")
        shifts = get_shifts_from_pygsheet(sheet=sheet)
