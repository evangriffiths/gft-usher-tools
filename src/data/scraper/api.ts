import { ScreenNumber, Screening } from "../../shared/types.js";

const GQL_URL = "https://www.glasgowfilm.org/graphql";

const HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "circuit-id": "29",
  "site-id": "103",
  "client-type": "consumer",
};

const SCREEN_MAP: Record<string, ScreenNumber> = {
  "171": ScreenNumber.ONE,
  "172": ScreenNumber.TWO,
  "175": ScreenNumber.THREE,
};

interface GqlShowing {
  id: string;
  time: string;
  screenId: string;
  movie: {
    id: string;
    name: string;
    urlSlug: string;
    duration: number;
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gql(query: string, variables: Record<string, unknown>): Promise<any> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(GQL_URL, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ query, variables }),
      });
      if (!resp.ok) {
        throw new Error(`GraphQL HTTP error: ${resp.status}`);
      }
      const result = await resp.json();
      if (result.errors) {
        throw new Error(`GraphQL error: ${result.errors[0].message}`);
      }
      return result.data;
    } catch (err) {
      if (attempt < 2) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
}

const SHOWINGS_QUERY = `query ($date: String, $siteIds: [ID]) {
  showingsForDate(date: $date, siteIds: $siteIds) {
    data {
      id
      time
      screenId
      movie { id name urlSlug duration }
    }
  }
}`;

export async function getScreeningsForDate(dateStr: string): Promise<Screening[]> {
  const data = await gql(SHOWINGS_QUERY, {
    date: dateStr,
    siteIds: [103],
  });

  const showings: GqlShowing[] = data.showingsForDate?.data ?? [];

  return showings
    .filter((s) => SCREEN_MAP[s.screenId] !== undefined)
    .map((s) => ({
      filmName: s.movie.name,
      startTime: new Date(s.time).toISOString(),
      screen: SCREEN_MAP[s.screenId],
      checkoutUrl: `https://www.glasgowfilm.org/movie/${s.movie.urlSlug}`,
      durationMins: s.movie.duration,
    }));
}

export async function getScreeningsForDates(dates: string[]): Promise<Screening[]> {
  const uniqueDates = [...new Set(dates)];
  const allScreenings: Screening[] = [];
  for (const dateStr of uniqueDates) {
    const screenings = await getScreeningsForDate(dateStr);
    allScreenings.push(...screenings);
  }
  return allScreenings;
}
