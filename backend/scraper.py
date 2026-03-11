import asyncio
import random
import hashlib
import time
import logging
from datetime import datetime, timezone

from playwright.async_api import async_playwright

from backend.database import SessionLocal
from backend.models import CompetitorCard
from backend.orchestrator import StrategyOrchestrator
from backend.card_discovery import discover_cards
from backend.ai_parser import extract_metrics_ai


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ScraperAgent")


BANK_URLS = {
    "Mashreq": "https://www.mashreqbank.com/en/uae/personal/cards/",
    "Emirates NBD": "https://www.emiratesnbd.com/en/cards/credit-cards/",
    "FAB": "https://www.bankfab.com/en-ae/personal/cards",
    "ADCB": "https://www.adcb.com/en/personal/cards/credit-cards",
    "RAKBANK": "https://www.rakbank.ae/en/personal-banking/cards/credit-cards",
    "CBD": "https://www.cbd.ae/personal/cards/credit-cards",
    "Ajman Bank": "https://www.ajmanbank.ae/en/personal/cards",
    "Dubai Islamic Bank": "https://www.dib.ae/personal/cards",
    "ADIB": "https://www.adib.ae/en/pages/cards.aspx",
    "Emirates Islamic": "https://www.emiratesislamic.ae/en/personal-banking/cards",
    "HSBC": "https://www.hsbc.ae/credit-cards/",
    "Citibank": "https://www.citibank.ae/credit-cards/",
    "Standard Chartered": "https://www.sc.com/ae/credit-cards/"
}


USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/118.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/119.0 Safari/537.36"
]


# concurrency limit
CONCURRENT_SCRAPES = 3
semaphore = asyncio.Semaphore(CONCURRENT_SCRAPES)


def hash_content(text: str):
    return hashlib.sha256(text.encode()).hexdigest()


def detect_product_type(card_name):

    name = card_name.lower()

    if "debit" in name:
        return "debit"

    if "flash cash" in name or "loan" in name:
        return "loan_card"

    return "credit"


async def scrape_card(bank_name: str, card: dict, browser, existing_hashes: dict) -> dict | None:
    """
    Scrape one card page and return its data as a plain dict.

    IMPORTANT: this function does NOT write anything to the database.
    All data is accumulated in memory and committed atomically only after
    the full scrape finishes (see run_scraper).

    Returns None when:
      - the page hash hasn't changed (no update needed), or
      - an error occurs (logged separately).
    """
    async with semaphore:

        card_name = card["card_name"]
        url = card["url"]

        logger.info(f"Scraping card: {bank_name} → {card_name}")

        context = await browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            extra_http_headers={"Accept-Language": "en-US,en;q=0.9"}
        )

        page = await context.new_page()

        try:

            await page.goto(url, timeout=60000, wait_until="domcontentloaded")

            await asyncio.sleep(random.randint(3, 8))

            page_text = await page.evaluate("document.body.innerText")

            page_hash = hash_content(page_text)

            # Compare against the snapshot taken before scraping started.
            # If the page hasn't changed we don't need to call the AI parser.
            hash_key = (bank_name, card_name)
            if existing_hashes.get(hash_key) == page_hash:
                logger.info(f"No change detected → skipping AI: {card_name}")
                return None

            logger.warning(f"Page change detected → running AI parser: {card_name}")

            metrics = extract_metrics_ai(page_text)

            product_type = detect_product_type(card_name)

            return {
                "bank_name": bank_name,
                "card_name": card_name,
                "product_type": product_type,
                "page_hash": page_hash,
                "annual_fee": metrics.annual_fee,
                "cashback_rate": metrics.cashback_rate,
                "welcome_bonus": metrics.welcome_bonus_value,
                "last_updated": datetime.now(timezone.utc),
            }

        except Exception as e:

            logger.error(f"Card scrape failed: {card_name} → {e}")
            return None

        finally:

            await context.close()


async def scrape_bank(name: str, url: str, browser, existing_hashes: dict) -> list[dict]:
    """
    Scrape all cards for one bank.

    Returns a list of card data dicts for cards whose pages have changed.
    Does NOT write to the database.
    """
    logger.info(f"Scanning bank card index: {name}")

    context = await browser.new_context(
        user_agent=random.choice(USER_AGENTS)
    )

    page = await context.new_page()
    results: list[dict] = []

    try:

        await page.goto(url, timeout=60000, wait_until="domcontentloaded")

        await asyncio.sleep(random.randint(5, 10))

        html = await page.content()

        cards = discover_cards(html, url)

        logger.info(f"{name}: discovered {len(cards)} cards")

        tasks = [scrape_card(name, card, browser, existing_hashes) for card in cards]

        gathered = await asyncio.gather(*tasks)

        results = [r for r in gathered if r is not None]

    except Exception as e:

        logger.error(f"Bank scan failed: {name} → {e}")

    finally:

        await context.close()

    return results


async def run_scraper():
    """
    Full scrape cycle with atomic database update.

    Phase 1 – Read:  snapshot existing page hashes from the DB (read-only).
    Phase 2 – Scrape: visit every bank / card URL, accumulate changed cards
                       entirely in memory.  The live DB table is untouched.
    Phase 3 – Commit: only after ALL banks have been scraped successfully,
                       open a single DB transaction and upsert every changed
                       card at once.  If the commit fails, the existing data
                       is rolled back and preserved intact.
    """

    # ── Phase 1: snapshot existing hashes (read-only) ────────────────────────
    db = SessionLocal()
    try:
        existing_records = db.query(CompetitorCard).all()
        existing_hashes: dict[tuple, str] = {
            (r.bank_name, r.card_name): r.page_hash
            for r in existing_records
        }
        logger.info(f"Loaded {len(existing_hashes)} existing card hashes for change detection.")
    finally:
        db.close()

    # ── Phase 2: scrape all banks into memory ─────────────────────────────────
    banks = list(BANK_URLS.items())
    random.shuffle(banks)

    all_scraped: list[dict] = []

    async with async_playwright() as p:

        browser = await p.chromium.launch(headless=True)

        for name, url in banks:

            bank_results = await scrape_bank(name, url, browser, existing_hashes)

            all_scraped.extend(bank_results)

            delay = random.randint(30, 90)
            logger.info(
                f"Bank '{name}' done — {len(bank_results)} changed card(s). "
                f"Sleeping {delay}s before next bank."
            )
            await asyncio.sleep(delay)

        await browser.close()

    # ── Phase 3: atomic DB commit ─────────────────────────────────────────────
    if not all_scraped:
        logger.info("Scrape complete — no page changes detected. Database is unchanged.")
        return

    logger.info(
        f"Scrape complete. Committing {len(all_scraped)} updated card(s) to the "
        "database in a single transaction…"
    )

    db = SessionLocal()
    orchestrator = StrategyOrchestrator(db)

    try:
        for card_data in all_scraped:

            bank_name = card_data["bank_name"]
            card_name = card_data["card_name"]

            existing = db.query(CompetitorCard).filter(
                CompetitorCard.bank_name == bank_name,
                CompetitorCard.card_name == card_name,
            ).first()

            if existing:
                # Update existing record with freshly scraped values
                existing.page_hash    = card_data["page_hash"]
                existing.product_type = card_data["product_type"]
                existing.annual_fee   = card_data["annual_fee"]
                existing.cashback_rate= card_data["cashback_rate"]
                existing.welcome_bonus= card_data["welcome_bonus"]
                existing.last_updated = card_data["last_updated"]

                # Fire strategy-change alerts now that data is confirmed complete
                await orchestrator.handle_competitor_change(
                    competitor_name=bank_name,
                    new_cashback=card_data["cashback_rate"].get("base", 0)
                        if isinstance(card_data["cashback_rate"], dict) else 0,
                    new_fee=card_data["annual_fee"],
                )

            else:
                # Brand-new card discovered during this scrape
                new_card = CompetitorCard(
                    bank_name    = bank_name,
                    card_name    = card_name,
                    product_type = card_data["product_type"],
                    page_hash    = card_data["page_hash"],
                    annual_fee   = card_data["annual_fee"],
                    cashback_rate= card_data["cashback_rate"],
                    welcome_bonus= card_data["welcome_bonus"],
                    last_updated = card_data["last_updated"],
                )
                db.add(new_card)
                logger.info(f"Indexed new card: {bank_name} → {card_name}")

        # Single commit — if anything fails here, rollback preserves old data
        db.commit()
        logger.info("✓ Database updated successfully with latest scraped data.")

    except Exception as e:
        db.rollback()
        logger.error(f"Database commit failed — existing data preserved: {e}")
        raise

    finally:
        db.close()


if __name__ == "__main__":

    while True:

        logger.info("Starting UAE credit card intelligence scan")

        asyncio.run(run_scraper())

        logger.info("Scan complete → sleeping 48 hours")

        time.sleep(172800)
