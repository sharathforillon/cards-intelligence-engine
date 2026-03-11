"""
Card discovery — finds individual credit card detail page links from a bank's
card listing page.

Design principles:
- Strip URL fragments (#apply-now, #tab_...) BEFORE deduplication so
  "learn more about X" and "Apply for X" links collapse to one canonical URL
- Only accept URLs from the SAME host as the base listing page
  (blocks apply.emiratesnbd.com, external partner portals, etc.)
- Reject known service/navigation paths (balance-transfer, installment, offers…)
- Require card-like URL structure + non-generic card name text
- Strip CTA prefixes before card name extraction
"""

import re
from urllib.parse import urljoin, urldefrag, urlparse

from bs4 import BeautifulSoup


# ── Non-card last-path-segment blocklist ──────────────────────────────────────
NON_CARD_SLUGS = {
    # Financing services
    "balance-conversion", "balance-transfer", "balance-payment",
    "loan-on-card-within-credit-limit", "loan-on-card-beyond-credit-limit",
    "loan-on-card", "loan-beyond-credit-limit",
    "installment-overview", "installment-payment-plan",
    "installment-plan", "easy-installment",
    # Generic listing / nav pages
    "credit-cards", "cards", "credit-card", "personal-cards",
    "offers", "all-offers",
    "rewards", "my-rewards", "loyalty",
    "discontinued-cards", "discontinued",
    "services", "card-services",
    "data", "how-to-pop-up",
    "apply", "apply-now", "apply-online",
    # Commercial / non-personal
    "salary-prepay-card", "commercial-cards", "prepaid-cards",
    "emirati", "priority-banking", "private-banking",
    "visa-offers", "mastercard-offers",
}

# ── URL sub-path blocklist ────────────────────────────────────────────────────
NON_CARD_PATH_FRAGMENTS = [
    "/offers/",
    "/services/",
    "/sitecore/",
    "/data/",
    "/promotions/",           # campaign/promo pages, not individual card products
    "/priority-banking/",     # e.g. ENBD "Signature by Priority Banking" (package)
    "/commercial-cards/",     # business/corporate cards, not personal
    "/private-banking/",
    "#accordion",
    "#tab_",
    "#component_",
]

SKIP_SCHEMES = ("javascript:", "mailto:", "tel:")

# ── Text exclusion patterns (substring match, case-insensitive) ───────────────
EXCLUDED_TEXT = [
    # Debit / business / prepaid
    "debit card",
    "debit cards",
    "business card",
    "business credit card",
    "business debit",
    "prepaid",
    "commercial card",
    # Generic nav / FAQ
    "log in", "sign in",
    "lost card", "stolen card", "report fraud",
    "terms and conditions",
    "contact us", "contact support",
    "faq",
    "how to", "what is", "what are",
    # Generic card management actions (not product pages)
    "block your card",
    "blocking your card",
    "activate your",
    "activating your",
    "manage your",
    "card stuck",
    "cardless cash",
    "pay your credit card",
    "pay on the go",
    "financial benefits on",
    "receiving your card",
    "supplementary",
    "why choose",
    "let us help",
    "card listing",
    "globalcash",
    # Arabic
    "العربية",
    "فاب",
    # Generic CTA-only text with no card name
    "see all offers",
    "see all discontinued",
    "skip to content",
]

# ── Card-positive text signals ────────────────────────────────────────────────
CARD_TEXT_SIGNALS = [
    "credit card",
    "cashback",
    "cash back",
    "platinum",
    "infinite",
    "signature",
    "world elite",
    "world mastercard",
    "miles",
    "travel card",
    "skywards",
    "etihad",
    "titanium",
    "visa infinite",
    "visa signature",
    "visa platinum",
    "mastercard world",
    "mastercard platinum",
    "amex",
    "american express",
    "learn more about",      # FAB uses "learn more about FAB X Card"
    "rewards card",
]

# Article/pronoun prefixes that indicate a generic link, not a product name
ARTICLE_PREFIX = re.compile(r"^(a|an|the|your|our|my)\s+", re.IGNORECASE)

# CTA words that prefix card names
CTA_PREFIX = re.compile(
    r"^(learn more about|about the|about|apply (now )?for|apply for the|"
    r"apply now for|apply now|discover the|discover|explore the|explore|"
    r"view the|view details of|find out about|know more about|"
    r"more about|for the|for)\s+",
    re.IGNORECASE,
)
CTA_SUFFIX = re.compile(
    r"\s+(apply now|apply online|learn more|view details|explore|discover)$",
    re.IGNORECASE,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _strip_fragment(url: str) -> str:
    clean, _ = urldefrag(url)
    return clean


def _netloc(url: str) -> str:
    return urlparse(url).netloc.lower()


def _last_slug(url: str) -> str:
    path = urlparse(_strip_fragment(url)).path
    return path.rstrip("/").split("/")[-1].lower()


def _path_lower(url: str) -> str:
    return urlparse(_strip_fragment(url)).path.lower()


def _same_domain(url: str, base_url: str) -> bool:
    """Only accept URLs hosted on the same domain as the bank's listing page."""
    return _netloc(url) == _netloc(base_url)


def _is_card_detail_url(url: str, base_url: str) -> bool:
    """
    URL must:
    1. Navigate away from the base listing page (path differs)
    2. End in a slug that is not a known service/nav page
    3. Have 'card' or 'credit' somewhere in the path OR the link text signals a card
    4. Not contain a non-card sub-path
    """
    base_path = _path_lower(base_url).rstrip("/")
    url_path  = _path_lower(url).rstrip("/")

    if url_path == base_path:
        return False

    slug = _last_slug(url)

    if slug in NON_CARD_SLUGS or len(slug) < 4:
        return False

    url_lower = url.lower()

    for frag in NON_CARD_PATH_FRAGMENTS:
        if frag in url_lower:
            return False

    # /promotions/ allowed only if slug is card-like
    if "/promotions/" in url_lower:
        hints = ["card", "credit", "visa", "mastercard", "amex",
                 "skywards", "etihad", "miles", "rewards", "cashback"]
        if not any(h in slug for h in hints):
            return False

    # Path OR slug must mention "card" or "credit" or a known card product word
    card_hints = ["card", "credit", "visa", "mastercard", "amex", "titanium",
                  "platinum", "infinite", "signature", "gold", "elite",
                  "skywards", "etihad", "miles", "cashback", "rewards",
                  "travel", "world", "go4it", "lulu", "noon", "beyond",
                  "solitaire", "vox", "gemini"]
    if not any(h in url_path for h in card_hints):
        return False

    return True


# ── Main validation ───────────────────────────────────────────────────────────

def is_valid_card_link(text: str, canonical_url: str, base_url: str) -> bool:
    """Return True only if the link points to an individual credit card product page."""

    text_lower = text.lower().strip()

    # 1. Skip non-http schemes
    if any(canonical_url.lower().startswith(s) for s in SKIP_SCHEMES):
        return False

    # 2. Same domain only
    if not _same_domain(canonical_url, base_url):
        return False

    # 3. URL must look like a card detail page
    if not _is_card_detail_url(canonical_url, base_url):
        return False

    # 4. Text blocklist
    for phrase in EXCLUDED_TEXT:
        if phrase in text_lower:
            return False

    # 5. Strip CTA prefix and check if what remains starts with an article
    #    (e.g. "a supplementary credit card" → "supplementary credit card" — still bad)
    stripped = CTA_PREFIX.sub("", text).strip()
    stripped = CTA_SUFFIX.sub("", stripped).strip()
    if ARTICLE_PREFIX.match(stripped):
        return False

    # 6. Text must have a positive card signal OR the stripped name looks specific
    for kw in CARD_TEXT_SIGNALS:
        if kw in text_lower:
            return True

    # Stripped name is long enough and mentions "card"
    if len(stripped) >= 8 and "card" in stripped.lower():
        return True

    return False


# ── Card name extraction ──────────────────────────────────────────────────────

def extract_card_name(text: str, canonical_url: str) -> str:
    """Return a clean card product name, falling back to URL slug."""
    name = CTA_PREFIX.sub("", text).strip()
    name = CTA_SUFFIX.sub("", name).strip()
    name = re.sub(r"\s+", " ", name).strip()

    if len(name) < 5 or len(name) > 120:
        slug = _strip_fragment(canonical_url).split("?")[0].rstrip("/").split("/")[-1]
        slug = re.sub(r"[^a-zA-Z0-9\-]", "", slug)
        name = slug.replace("-", " ").title()

    return name


# ── Entry point ───────────────────────────────────────────────────────────────

def discover_cards(html: str, base_url: str) -> list[dict]:
    """
    Parse a bank's card listing page and return unique individual card pages.

    Returns: [{"card_name": str, "url": str}, ...]
    URLs are canonical (fragment-stripped) and deduplicated.
    """
    soup = BeautifulSoup(html, "html.parser")

    cards: list[dict] = []
    seen_urls: set[str] = set()

    for link in soup.find_all("a", href=True):
        href = link["href"]

        full_url  = urljoin(base_url, href)
        canonical = _strip_fragment(full_url)

        # Deduplicate on fragment-free URL
        if canonical in seen_urls:
            continue

        text = (
            link.get("title")
            or link.get("aria-label")
            or link.get_text(separator=" ", strip=True)
            or ""
        )

        if not is_valid_card_link(text, canonical, base_url):
            continue

        card_name = extract_card_name(text, canonical)
        cards.append({"card_name": card_name, "url": canonical})
        seen_urls.add(canonical)

    return cards
