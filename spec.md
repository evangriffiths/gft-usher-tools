# Spec

Build the tooling to enable a user to:

- Extract cinema ushering shift information from a publicly accessible google sheet (build for human readability, not machine readability!)
- Extract film screening information from the cinema's website
- Map the screening info to shift info, to enable an informed decision about what film an usher will be watching on a given shift

## Parse the timetable

The timetable is a publicly accessible google sheet, URL https://docs.google.com/spreadsheets/d/12EeTMX3oHZyoCCEm4wxXMWE1VIaCCy47oJwBBSN8Br8/edit?gid=2009980392#gid=2009980392

DO NOT EDIT IT!! Only read from it!

The timetable is arranged as a sheet tab per month, appropriately named ("March 26", "April 26", etc.)

Each sheet has the following structure:

- A header row for each week (e.g. "March 10th to March 12th 2026")
- A mini table for each day in that week
- Each mini table has the the 'usher number' in the first column
- Then each column is for a shift that day (a time range and a screen number)
- The time range for the shift is the header cell for that column, in 24hr format (e.g "12.20-16.45")
- The screen number is determined by the header cell colour. Always: Yellow = Screen 1, Blue = Screen 2, Pink = Screen 3.
- Ushers pick a shift by filling in the cell with their name.
- The number of available slots per shift varies per shift. The height of the table is 4 (i.e. rows for usher 1 - 4), but if there are fewer than 4 slots available for a shift, then cells are blacked out.
- White cells (non-blacked-out) indicate an available shift. It's first-come-first-served, so if a white cell has a name already in, then that usher is assigned to that shift.
- Each mini table spans the width of the sheet

The output of this parsing step should be a list of all shifts for each month, where a shift has the following structure:

```python
class Shift(BaseModel):
    screen: ScreenNumber
    start_time: datetime
    end_time: datetime
    other_ushers: list[str]
    slots: int

    @model_validator(mode="after")
    def validate_has_slots(self) -> "Shift":
        assert self.slots > 0
        return self

    @property
    def is_free(self) -> bool:
        return len(self.other_ushers) < self.slots
```

## Map the shifts to films

The home page of the cinema is: https://www.glasgowfilm.org/home

It's a single page application (I think). No idea how we'll scrape / browse efficiently here. Maybe headless playwright?

So, remember we're looking for: film names, their start times, and the screen they're playing in.

Anyway, some ideas on how to navigate it:

You can navigate to films showing on any date by going https://www.glasgowfilm.org/home -> click date picker under 'What's On' (called 'Other Date') -> pick date. This loads below the films showing on that date (thumbnails, then clickable start times under each). You have to click on a given time to see the screen it's playing on. e.g. https://www.glasgowfilm.org/checkout/showing/midwinter-break-2/399689 -> "Glasgow Film Theatre GFT 1""

You can see ALL films currently booking from https://www.glasgowfilm.org/now-booking-a-z/. This loads a page with A-Z along the side, then across the page for each letter is a thumbnail for each film starting with that name. Clicking the film takes you to all the listings for that film. e.g. "C" -> "California Schemin" -> https://www.glasgowfilm.org/movie/california-schemin-2. On each film's page there's a 'Showtimes' section. There's a list of dates, and under each are clickable buttons for the show times for that day. Again, you need to click a show time to see what screen it's in (as above)

Another way to visit all listings on a given day is to go to https://www.glasgowfilm.org/all-listings/. Along the top of the page is a horizontal date picker (clickable badge for each date). You can navigate by clicking side arrows to move the date picker along. When you pick a date you get the same kind of thumbnail + clickable showtimes underneath for each film.

Another way to look at all films that currently have listings (not conifrmed, but looks like it) is to click the search icon in the header (from any page on the site). This loads a search bar, and even without typing anything, a list of cards are displayed below it, one for each film. This is scrollable and appears to show all films showing. If you click a card it takes you the film's page again (e.g. https://www.glasgowfilm.org/movie/california-schemin-2)

It's not clear which way is the best (fastest / most reliable / most scalable) for getting the list of films and their show times and screen.

It might be easier to go from shift (from the parsed timetable) -> find the candidate film -> confirm it, for each shift.

Or it might be easier to generate a complete list of film screenings with start time and screen, and then map these to the shifts. Explore the site first, then decide from that.

TW IMPORTANT THINGS to note when mapping film screening to shift

1. The shift ALWAYS starts 30 mins before the advertised screen time of a film.
2. Shifts contain either one or two film screenings. If the end time of the shift is a lot after the end time of the first film in that shift, that indicates there will be a second film. For these cases, we can ignore the second film and only look for the FIRST film screening for a shift.

## The stack

We haven't specified how results will be displayed to the user. To start, we can just print to the terminal / save to markdown.

Once we have it working, I'd like to turn this into a web app that renders this info, and it should be stateful. Don't worry too much about the implementation now, but thinking ahead to this, I think it makes sense to do this in e2e typescript. But I guess we need to decide what tools we're using for the above steps to know if this is a good idea, or if we need to do some bits in python or something else...
