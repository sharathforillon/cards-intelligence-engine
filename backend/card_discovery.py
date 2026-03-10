import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup


EXCLUDED_KEYWORDS = [
    "login",
    "lost",
    "stolen",
    "report",
    "security",
    "support",
    "terms",
    "conditions",
    "faq",
    "help",
    "contact",
    "corporate",
    "business",
    "prepaid",
    "debit",
    "pdf"
]


CARD_KEYWORDS = [
    "credit card",
    "cashback",
    "platinum",
    "infinite",
    "signature",
    "world",
    "rewards",
    "miles",
    "travel",
    "skywards",
    "etihad"
]


GENERIC_CTA = [
    "apply now",
    "learn more",
    "view details",
    "discover",
    "explore"
]


def normalize_url(base_url, href):
    return urljoin(base_url, href)


def is_valid_card_link(text, url):

    text_lower = text.lower()
    url_lower = url.lower()

    if not text_lower:
        return False

    for word in EXCLUDED_KEYWORDS:
        if word in text_lower or word in url_lower:
            return False

    for keyword in CARD_KEYWORDS:
        if keyword in text_lower:
            return True

    if ("credit-card" in url_lower or "/cards/" in url_lower) and "debit" not in url_lower:
        return True

    return False


def extract_card_name(text, url):

    text = re.sub(r"\s+", " ", text).strip()

    for phrase in GENERIC_CTA:
        text = re.sub(phrase, "", text, flags=re.IGNORECASE)

    text = text.strip()

    if len(text) < 4:
        slug = url.split("?")[0].rstrip("/").split("/")[-1]
        slug = re.sub(r"[^a-zA-Z0-9\-]", "", slug)
        text = slug.replace("-", " ").title()

    return text


def discover_cards(html, base_url):

    soup = BeautifulSoup(html, "html.parser")

    cards = []
    seen = set()

    for link in soup.find_all("a", href=True):

        text = (
            link.get("title")
            or link.get("aria-label")
            or link.get_text(separator=" ", strip=True)
        )

        href = link["href"]

        full_url = normalize_url(base_url, href)

        if full_url in seen:
            continue

        if not is_valid_card_link(text, full_url):
            continue

        card_name = extract_card_name(text, full_url)

        cards.append({
            "card_name": card_name,
            "url": full_url
        })

        seen.add(full_url)

    return cards