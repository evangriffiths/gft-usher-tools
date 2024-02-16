from gft_usher_tools.timetable.timetable import (
    CellColour,
    _get_colour_of_cell,
    get_credentials_path,
    get_pygsheets_with_names,
    get_time_table_url,
)


def test_cell_colour0():
    sheet_url = get_time_table_url()
    credentials_path = get_credentials_path()
    assert (
        _get_colour_of_cell(
            cell_name="K6",
            sheet_name="February",
            sheet_url=sheet_url,
            credentials_path=credentials_path,
        )
        == CellColour.get_gray()
    )


def test_cell_colour1():
    sheet_url = get_time_table_url()
    sheet = get_pygsheets_with_names(
        url=sheet_url, credentials_path=get_credentials_path(), sheet_names=["February"]
    )[0]
    assert CellColour.from_tuple(sheet.cell("D4").color) == CellColour.get_S1()
