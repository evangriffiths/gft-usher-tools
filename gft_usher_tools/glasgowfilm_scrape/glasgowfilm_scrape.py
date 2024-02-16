import requests
from bs4 import BeautifulSoup


def get_movie_ids() -> list[str]:
    """
    Get all movies https://www.glasgowfilm.org/movie/<movie_id>
    """
    movie_ids = []
    url = "https://www.glasgowfilm.org/"
    response = requests.get(url)
    response.raise_for_status()
    html_content = response.content
    soup = BeautifulSoup(html_content, "html.parser")
    movie_links = soup.find_all("a", href=lambda href: href and "/movie/" in href)

    for link in movie_links:
        movie_id = link["href"].split("/")[-1]
        movie_ids.append(movie_id)

    return movie_ids


if __name__ == "__main__":
    movies = get_movie_ids()
    for movie in movies:
        print(movie)
