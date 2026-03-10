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


async def scrape_card(bank_name, card, browser):

    async with semaphore:

        db = SessionLocal()

        orchestrator = StrategyOrchestrator(db)

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

            existing = db.query(CompetitorCard).filter(
                CompetitorCard.bank_name == bank_name,
                CompetitorCard.card_name == card_name
            ).first()

            # skip AI if page unchanged
            if existing and existing.page_hash == page_hash:

                logger.info(f"No change detected → skipping AI: {card_name}")

                return

            logger.warning(f"Page change detected → running AI parser: {card_name}")

            metrics = extract_metrics_ai(page_text)

            product_type = detect_product_type(card_name)

            if existing:

                existing.page_hash = page_hash
                existing.product_type = product_type
                existing.annual_fee = metrics.annual_fee
                existing.cashback_rate = metrics.cashback_rate
                existing.welcome_bonus = metrics.welcome_bonus_value
                existing.last_updated = datetime.now(timezone.utc)

                db.commit()

                await orchestrator.handle_competitor_change(
                    competitor_name=bank_name,
                    new_cashback=metrics.cashback_rate.get("base", 0),
                    new_fee=metrics.annual_fee
                )

            else:

                new_card = CompetitorCard(
                    bank_name=bank_name,
                    card_name=card_name,
                    product_type=product_type,
                    page_hash=page_hash,
                    annual_fee=metrics.annual_fee,
                    cashback_rate=metrics.cashback_rate,
                    welcome_bonus=metrics.welcome_bonus_value,
                    last_updated=datetime.now(timezone.utc)
                )

                db.add(new_card)
                db.commit()

                logger.info(f"Indexed new card: {bank_name} → {card_name}")

        except Exception as e:

            logger.error(f"Card scrape failed: {card_name} → {e}")

        finally:

            await context.close()
            db.close()


async def scrape_bank(name, url, browser):

    logger.info(f"Scanning bank card index: {name}")

    context = await browser.new_context(
        user_agent=random.choice(USER_AGENTS)
    )

    page = await context.new_page()

    try:

        await page.goto(url, timeout=60000, wait_until="domcontentloaded")

        await asyncio.sleep(random.randint(5, 10))

        html = await page.content()

        cards = discover_cards(html, url)

        logger.info(f"{name}: discovered {len(cards)} cards")

        tasks = []

        for card in cards:

            tasks.append(scrape_card(name, card, browser))

        await asyncio.gather(*tasks)

    except Exception as e:

        logger.error(f"Bank scan failed: {name} → {e}")

    finally:

        await context.close()


async def run_scraper():

    banks = list(BANK_URLS.items())

    random.shuffle(banks)

    async with async_playwright() as p:

        browser = await p.chromium.launch(headless=True)

        for name, url in banks:

            await scrape_bank(name, url, browser)

            delay = random.randint(30, 90)

            logger.info(f"Sleeping {delay}s before next bank")

            await asyncio.sleep(delay)

        await browser.close()


if __name__ == "__main__":

    while True:

        logger.info("Starting UAE credit card intelligence scan")

        asyncio.run(run_scraper())

        logger.info("Scan complete → sleeping 48 hours")

        time.sleep(172800)