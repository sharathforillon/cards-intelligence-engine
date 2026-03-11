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

CONCURRENT_SCRAPES = 3
semaphore = asyncio.Semaphore(CONCURRENT_SCRAPES)


def hash_content(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def detect_product_type(card_name: str) -> str:
    name = card_name.lower()
    if "debit" in name:
        return "debit"
    if "flash cash" in name or "loan" in name:
        return "loan_card"
    return "credit"


def _build_card_record(metrics: dict, bank_name: str, card_name: str,
                       page_hash: str) -> dict:
    """
    Map ai_parser output dict → flat dict suitable for CompetitorCard columns.
    All 60+ fields are covered.
    """
    product_type = detect_product_type(card_name)

    cb = metrics.get("cashback_rate")
    if not isinstance(cb, dict):
        cb = None

    return {
        # Identity
        "bank_name":      bank_name,
        "card_name":      card_name,
        "network":        metrics.get("network"),
        "product_type":   product_type,
        "card_category":  metrics.get("card_category"),
        "card_tier":      metrics.get("card_tier"),
        "target_segment": metrics.get("target_segment"),
        "is_islamic":     bool(metrics.get("is_islamic", False)),
        "is_cobrand":     bool(metrics.get("is_cobrand", False)),
        # Fees
        "annual_fee":                  metrics.get("annual_fee"),
        "annual_fee_waiver_condition": metrics.get("annual_fee_waiver_condition"),
        "joining_fee":                 metrics.get("joining_fee"),
        "supplementary_card_fee":      metrics.get("supplementary_card_fee"),
        "late_payment_fee":            metrics.get("late_payment_fee"),
        "overlimit_fee":               metrics.get("overlimit_fee"),
        "card_replacement_fee":        metrics.get("card_replacement_fee"),
        # Eligibility
        "min_salary":              metrics.get("min_salary"),
        "min_income_annual":       metrics.get("min_income_annual"),
        "nationality_eligibility": metrics.get("nationality_eligibility"),
        "employment_type":         metrics.get("employment_type"),
        "min_age":                 metrics.get("min_age"),
        # Rewards
        "reward_type":               metrics.get("reward_type"),
        "base_reward_rate":          metrics.get("base_reward_rate"),
        "dining_reward_rate":        metrics.get("dining_reward_rate"),
        "grocery_reward_rate":       metrics.get("grocery_reward_rate"),
        "fuel_reward_rate":          metrics.get("fuel_reward_rate"),
        "travel_reward_rate":        metrics.get("travel_reward_rate"),
        "online_reward_rate":        metrics.get("online_reward_rate"),
        "international_reward_rate": metrics.get("international_reward_rate"),
        "cashback_rate":             cb,
        "miles_rate":                metrics.get("miles_rate"),
        "reward_cap_monthly":        metrics.get("reward_cap_monthly"),
        "reward_cap_annual":         metrics.get("reward_cap_annual"),
        "reward_expiry_months":      metrics.get("reward_expiry_months"),
        "reward_currency":           metrics.get("reward_currency"),
        "reward_exclusions":         metrics.get("reward_exclusions"),
        "reward_redemption_rate":    metrics.get("reward_redemption_rate"),
        # Welcome offer
        "welcome_bonus":               metrics.get("welcome_bonus"),
        "welcome_bonus_miles":         metrics.get("welcome_bonus_miles"),
        "welcome_bonus_points":        metrics.get("welcome_bonus_points"),
        "welcome_bonus_cashback_aed":  metrics.get("welcome_bonus_cashback_aed"),
        "welcome_spend_requirement":   metrics.get("welcome_spend_requirement"),
        "welcome_period_days":         metrics.get("welcome_period_days"),
        # Lounge
        "lounge_access":               metrics.get("lounge_access"),
        "lounge_program":              metrics.get("lounge_program"),
        "lounge_visits_primary":       metrics.get("lounge_visits_primary"),
        "lounge_visits_guest":         metrics.get("lounge_visits_guest"),
        "lounge_visits_supplementary": metrics.get("lounge_visits_supplementary"),
        "lounge_guest_fee_usd":        metrics.get("lounge_guest_fee_usd"),
        "lounge_spend_condition":      metrics.get("lounge_spend_condition"),
        # Travel
        "travel_insurance":   metrics.get("travel_insurance"),
        "airport_transfer":   metrics.get("airport_transfer"),
        "airport_fast_track": metrics.get("airport_fast_track"),
        "concierge_service":  metrics.get("concierge_service"),
        "hotel_status":       metrics.get("hotel_status"),
        "global_wifi":        metrics.get("global_wifi"),
        "roadside_assistance":metrics.get("roadside_assistance"),
        # Lifestyle
        "golf_rounds_annual":   metrics.get("golf_rounds_annual"),
        "dining_benefits":      metrics.get("dining_benefits"),
        "cinema_benefits":      metrics.get("cinema_benefits"),
        "fitness_benefit":      metrics.get("fitness_benefit"),
        "spa_benefit":          metrics.get("spa_benefit"),
        "ride_hailing_benefit": metrics.get("ride_hailing_benefit"),
        "entertainer_access":   bool(metrics.get("entertainer_access", False)),
        # Digital wallets
        "apple_pay":   bool(metrics.get("apple_pay", False)),
        "google_pay":  bool(metrics.get("google_pay", False)),
        "samsung_pay": bool(metrics.get("samsung_pay", False)),
        "garmin_pay":  bool(metrics.get("garmin_pay", False)),
        # Forex & cash
        "fx_markup":             metrics.get("fx_markup"),
        "cash_advance_fee_pct":  metrics.get("cash_advance_fee_pct"),
        "cash_advance_min_fee":  metrics.get("cash_advance_min_fee"),
        "cash_advance_interest": metrics.get("cash_advance_interest"),
        # Financing
        "interest_rate_monthly":    metrics.get("interest_rate_monthly"),
        "balance_transfer_rate":    metrics.get("balance_transfer_rate"),
        "balance_transfer_months":  metrics.get("balance_transfer_months"),
        "balance_transfer_fee_pct": metrics.get("balance_transfer_fee_pct"),
        "installment_tenures":      metrics.get("installment_tenures"),
        "min_payment_pct":          metrics.get("min_payment_pct"),
        # Insurance
        "purchase_protection_days":  metrics.get("purchase_protection_days"),
        "extended_warranty_months":  metrics.get("extended_warranty_months"),
        "price_protection":          bool(metrics.get("price_protection", False)),
        "mobile_phone_protection":   bool(metrics.get("mobile_phone_protection", False)),
        "lost_card_liability":       metrics.get("lost_card_liability"),
        # Co-brand
        "cobrand_partner":        metrics.get("cobrand_partner"),
        "cobrand_industry":       metrics.get("cobrand_industry"),
        "miles_transfer_partners":metrics.get("miles_transfer_partners"),
        "miles_transfer_ratio":   metrics.get("miles_transfer_ratio"),
        # Spend conditions
        "spend_conditions": metrics.get("spend_conditions"),
        # Metadata
        "reward_summary": metrics.get("reward_summary"),
        "page_hash":      page_hash,
        "last_updated":   datetime.now(timezone.utc),
    }


async def scrape_card(bank_name: str, card: dict, browser,
                      existing_hashes: dict) -> dict | None:
    """
    Scrape one card page and return its full data dict.
    Does NOT write to the database (atomic commit happens in run_scraper).
    Returns None if page is unchanged or on error.
    """
    async with semaphore:
        card_name = card["card_name"]
        url       = card["url"]

        logger.info(f"Scraping: {bank_name} → {card_name}")

        context = await browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            extra_http_headers={"Accept-Language": "en-US,en;q=0.9"},
        )
        page = await context.new_page()

        try:
            await page.goto(url, timeout=90_000, wait_until="networkidle")
            await asyncio.sleep(random.randint(2, 5))
            # Scroll to ensure all benefits/fee details render (accordion sections)
            await _full_scroll_and_wait(page)

            page_text = await page.evaluate("document.body.innerText")
            page_hash = hash_content(page_text)

            if existing_hashes.get((bank_name, card_name)) == page_hash:
                logger.info(f"Unchanged → skip AI: {card_name}")
                return None

            logger.warning(f"Page changed → AI parsing: {card_name}")
            metrics = extract_metrics_ai(card_name, bank_name, page_text)
            return _build_card_record(metrics, bank_name, card_name, page_hash)

        except Exception as e:
            logger.error(f"Scrape failed: {card_name} → {e}")
            return None
        finally:
            await context.close()


async def _full_scroll_and_wait(page) -> None:
    """
    Scroll to the bottom of the page in increments so lazy-loaded card tiles
    all render before we capture the HTML.  Then wait for any subsequent
    network activity to settle.
    """
    prev_height = 0
    for _ in range(15):                         # max 15 scroll steps
        await page.evaluate("window.scrollBy(0, window.innerHeight * 1.5)")
        await asyncio.sleep(1.2)
        new_height = await page.evaluate("document.body.scrollHeight")
        if new_height == prev_height:
            break                               # page end reached
        prev_height = new_height

    # Scroll back to top so any sticky-header lazy loaders fire
    await page.evaluate("window.scrollTo(0, 0)")
    await asyncio.sleep(0.8)

    # Try to dismiss cookie banners / overlays that block card tiles
    for selector in [
        "button[id*='accept']",
        "button[class*='accept']",
        "button[class*='cookie']",
        "#onetrust-accept-btn-handler",
        ".cc-btn.cc-allow",
    ]:
        try:
            btn = page.locator(selector).first
            if await btn.is_visible(timeout=800):
                await btn.click()
                await asyncio.sleep(0.5)
        except Exception:
            pass


async def scrape_bank(name: str, url: str, browser,
                      existing_hashes: dict) -> list[dict]:
    """Scrape all cards for one bank. Returns list of changed card data dicts."""
    logger.info(f"Scanning bank index: {name}")

    context = await browser.new_context(user_agent=random.choice(USER_AGENTS))
    page    = await context.new_page()
    results: list[dict] = []

    try:
        # Wait for network to go idle so JS-rendered card grids appear
        await page.goto(url, timeout=90_000, wait_until="networkidle")
        await asyncio.sleep(random.randint(3, 6))

        # Scroll through the page so lazy-loaded tiles all render
        await _full_scroll_and_wait(page)

        html  = await page.content()
        cards = discover_cards(html, url)
        logger.info(f"{name}: discovered {len(cards)} cards")

        gathered = await asyncio.gather(
            *[scrape_card(name, card, browser, existing_hashes) for card in cards]
        )
        results = [r for r in gathered if r is not None]

    except Exception as e:
        logger.error(f"Bank scan failed: {name} → {e}")
    finally:
        await context.close()

    return results


async def run_scraper() -> None:
    """
    Full scrape cycle with atomic DB update.

    Phase 1 – Read:   snapshot existing page hashes (read-only).
    Phase 2 – Scrape: accumulate all changed card data in memory.
                      Live DB table is completely untouched.
    Phase 3 – Commit: single transaction upserts all changed cards at once.
                      On failure, rollback preserves existing data intact.
    """

    # Phase 1: snapshot hashes
    db = SessionLocal()
    try:
        existing = db.query(CompetitorCard).all()
        existing_hashes = {(r.bank_name, r.card_name): r.page_hash for r in existing}
        logger.info(f"Loaded {len(existing_hashes)} existing hashes.")
    finally:
        db.close()

    # Phase 2: scrape all banks into memory
    banks = list(BANK_URLS.items())
    random.shuffle(banks)
    all_scraped: list[dict] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for name, url in banks:
            bank_results = await scrape_bank(name, url, browser, existing_hashes)
            all_scraped.extend(bank_results)
            delay = random.randint(30, 90)
            logger.info(f"'{name}' done — {len(bank_results)} changed. "
                        f"Sleeping {delay}s before next bank.")
            await asyncio.sleep(delay)
        await browser.close()

    if not all_scraped:
        logger.info("No page changes detected — DB unchanged.")
        return

    # Phase 3: atomic commit
    logger.info(f"Committing {len(all_scraped)} updated cards in a single transaction…")
    db = SessionLocal()
    orchestrator = StrategyOrchestrator(db)

    try:
        for data in all_scraped:
            existing_row = db.query(CompetitorCard).filter(
                CompetitorCard.bank_name == data["bank_name"],
                CompetitorCard.card_name == data["card_name"],
            ).first()

            if existing_row:
                for col, val in data.items():
                    setattr(existing_row, col, val)
                await orchestrator.handle_competitor_change(
                    competitor_name=data["bank_name"],
                    new_cashback=(data.get("cashback_rate") or {}).get("base", 0),
                    new_fee=data.get("annual_fee") or 0,
                )
            else:
                db.add(CompetitorCard(**data))
                logger.info(f"New card indexed: {data['bank_name']} → {data['card_name']}")

        db.commit()
        logger.info("✓ DB updated with latest scraped data.")

    except Exception as e:
        db.rollback()
        logger.error(f"Commit failed — existing data preserved: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    while True:
        logger.info("Starting UAE credit card intelligence scan")
        asyncio.run(run_scraper())
        logger.info("Scan complete → sleeping 48 hours")
        time.sleep(172_800)
