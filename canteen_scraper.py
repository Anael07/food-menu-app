"""
Canteen scraper — unibz.markas.info/menu
=========================================
The menu page has direct per-day URLs in the format:
  https://unibz.markas.info/menu/<timestamp>

Each day link in the calendar contains a data-time attribute with the
Unix timestamp for that day. We fetch the day URL directly with requests
(no browser needed), then visit each /piatto/ detail page.

Dependencies:
    pip install requests beautifulsoup4 psycopg2-binary

Usage:
    python canteen_scraper.py                        # scrape today
    python canteen_scraper.py --date 2026-05-12      # specific date
    python canteen_scraper.py --dry-run              # parse only, no DB write
    python canteen_scraper.py --patch-schema         # add image columns, then exit
"""

import os
import re
import sys
import time
import hashlib
import argparse
import requests
import psycopg2
from datetime import date, datetime, timezone
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not installed — fall back to system environment variables

# ─────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────

BASE_URL        = "https://unibz.markas.info"
MENU_URL        = f"{BASE_URL}/menu"
IMAGES_DIR      = Path("images")
REQUEST_DELAY   = 1.2
REQUEST_TIMEOUT = 20

DB_CONFIG = {
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     int(os.getenv("DB_PORT", 5432)),
    "dbname":   os.getenv("DB_NAME",     "canteen"),
    "user":     os.getenv("DB_USER",     "postgres"),
    "password": os.getenv("DB_PASSWORD", ""),
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
}

NUTRITION_LABEL_MAP = {
    "energia":      "calories_kcal",
    "calorie":      "calories_kcal",
    "kcal":         "calories_kcal",
    "proteine":     "proteins_g",
    "protein":      "proteins_g",
    "carboidrati":  "carbohydrates_g",
    "carbohydrate": "carbohydrates_g",
    "grassi":       "fats_g",
    "lipid":        "fats_g",
    "grasso":       "fats_g",
    "fibre":        "fiber_g",
    "fibra":        "fiber_g",
    "fiber":        "fiber_g",
    "sale":         "salt_g",
    "sodio":        "salt_g",
    "salt":         "salt_g",
    "zuccheri":     "sugars_g",
    "sugar":        "sugars_g",
}

# Dish type mapping — extracted from cbp-filter-item buttons on the day page
DISH_TYPE_MAP = {
    "dt_1":  "Primi Piatti",
    "dt_2":  "Secondi Piatti",
    "dt_17": "Insalatone",
    "dt_14": "Piatto unico",
    "dt_4":  "Contorni",
    "dt_6":  "Dessert",
    "dt_7":  "Pane e Prodotti da forno",
}


# ─────────────────────────────────────────────────────────
# STEP 1 — FIND THE DAY URL FROM THE CALENDAR
# The main /menu page contains a calendar strip like:
#   <div class="squared_day" data-day="12/05/2026">
#     <a href="https://unibz.markas.info/menu/1778605344" data-time="1778605344">
# We find the link whose data-day matches our target date.
# ─────────────────────────────────────────────────────────

def get_day_url(target_date: date) -> str | None:
    """
    Fetches the main menu page and finds the direct URL
    for the target date from the calendar strip.
    Returns e.g. https://unibz.markas.info/menu/1778605344
    """
    print(f"[step1] Fetching calendar from {MENU_URL}")
    resp = requests.get(MENU_URL, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    # Date format used on the page: "12/05/2026"
    date_str = target_date.strftime("%d/%m/%Y")

    # Find the squared_day div whose data-day matches
    for div in soup.select("div.squared_day"):
        if div.get("data-day") == date_str:
            a = div.select_one("a.squared_day_overlay")
            if a:
                href = a.get("href", "")
                # Direct URL: https://unibz.markas.info/menu/1778605344
                if "/menu/" in href and href.startswith("http"):
                    print(f"[step1] Found day URL: {href}")
                    return href
                # Hash URL fallback: #/0/3783/3  — build from data-time
                data_time = a.get("data-time")
                if data_time:
                    url = f"{BASE_URL}/menu/{data_time}"
                    print(f"[step1] Built day URL from data-time: {url}")
                    return url

    print(f"[step1] Date {date_str} not found in calendar.")
    print("[step1] Available dates:")
    for div in soup.select("div.squared_day[data-day]"):
        print(f"         {div.get('data-day')}")
    return None


# ─────────────────────────────────────────────────────────
# STEP 2 — FETCH THE DAY PAGE AND FIND ALL MEAL CARDS
# The day page at /menu/<timestamp> contains cbp-item divs,
# each with a link to a /piatto/<id>-slug detail page.
# ─────────────────────────────────────────────────────────

def get_meal_cards(day_url: str) -> list[dict]:
    """
    Fetches the day menu page and returns a list of
    { detail_url, name, category, preview_img_url } dicts.
    """
    print(f"[step2] Fetching day menu: {day_url}")
    resp = requests.get(day_url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    # Save a debug snapshot
    Path("debug_day.html").write_text(resp.text, encoding="utf-8")
    print(f"[step2] Day page HTML: {len(resp.text)} chars")

    cards = []
    seen_urls = set()

    # Each meal card is a div.cbp-item containing an <a> to /piatto/
    for item in soup.select("div.cbp-item"):
        # Find the detail page link
        detail_url = None
        for a in item.find_all("a", href=True):
            href = a["href"]
            if "/piatto/" in href:
                detail_url = urljoin(BASE_URL, href)
                break

        if not detail_url or detail_url in seen_urls:
            continue
        seen_urls.add(detail_url)

        # Preview image
        img = item.select_one("img")
        preview_url = None
        if img:
            src = img.get("src") or img.get("data-src") or img.get("data-lazy-src")
            if src:
                preview_url = urljoin(BASE_URL, src)

        # Meal name from caption or figure caption
        name_el = item.select_one("figcaption, .cbp-l-caption-title, p, .nome-piatto")
        name = name_el.get_text(strip=True) if name_el else None

        # Category filter label (e.g. "Secondi Piatti")
        cat_el = item.select_one(".cbp-filter-item, .categoria, .tipo")
        # Also check data attributes
        category = None
        if cat_el:
            category = cat_el.get_text(strip=True)
        # Try reading from the item's own data-filter attribute
        if not category:
            data_filter = item.get("data-filter", "")
            if data_filter:
                category = data_filter.strip(".")

        # Extract dish type from dt_X class (e.g. "dt_1" → "Primi Piatti")
        dish_type = None
        classes = item.get("class", [])
        for cls in classes:
            if cls in DISH_TYPE_MAP:
                dish_type = DISH_TYPE_MAP[cls]
                break

        cards.append({
            "detail_url":      detail_url,
            "name":            name,
            "category":        category,
            "dish_type":       dish_type,
            "preview_img_url": preview_url,
        })

    print(f"[step2] Found {len(cards)} meal card(s).")

    if not cards:
        print("[step2] No cbp-item cards found. Checking page structure...")
        for cls in ["cbp-item", "piatto", "col-sm-4", "col-md-4", "menu-item"]:
            print(f"         '{cls}' appears {resp.text.count(cls)} time(s)")

    return cards


# ─────────────────────────────────────────────────────────
# STEP 3 — PARSE EACH MEAL DETAIL PAGE
# ─────────────────────────────────────────────────────────

def fetch_detail(url: str) -> BeautifulSoup:
    time.sleep(REQUEST_DELAY)
    resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")


def parse_detail(soup: BeautifulSoup, meta: dict) -> dict:
    """
    Parses a full meal detail page at /piatto/<id>-slug.
    HTML structure (confirmed from DevTools screenshots):
      h1                                    → meal name
      div.stagionalita                      → seasonality / category
      div.column_left  img                  → hi-res photo
      div.preparazione  p                   → description
      div.allergeni_piatto
        div.allergene  p.nome-allergene     → confirmed allergen name
      div.tracce_di_allergeni               → trace allergens
      div.valori_nutrizionali_piatto
        div.row_gda
          span.gda-label                    → nutrient label
          span.gda-value                    → nutrient value
      ul li                                 → ingredients (name: quantity)
    """

    # Name
    h1 = soup.select_one("h1")
    name = h1.get_text(strip=True) if h1 else meta.get("name")

    # Category / dish type
    stag = soup.select_one("div.stagionalita")
    category  = meta.get("category") or (stag.get_text(strip=True) if stag else None)
    dish_type = meta.get("dish_type")

    # Hi-res image
    image_url = None
    col_left = soup.select_one("div.column_left")
    if col_left:
        img = col_left.select_one("img")
        if img:
            src = (img.get("src") or img.get("data-src")
                   or img.get("data-lazy-src") or img.get("data-original"))
            if src:
                image_url = urljoin(BASE_URL, src)
    if not image_url:
        image_url = meta.get("preview_img_url")

    # Description
    description = None
    prep = soup.select_one("div.preparazione")
    if prep:
        paras = [p.get_text(" ", strip=True)
                 for p in prep.select("p") if p.get_text(strip=True)]
        description = " ".join(paras) or prep.get_text(strip=True)

    # Confirmed allergens
    allergens = []
    alg_block = soup.select_one("div.allergeni_piatto")
    if alg_block:
        for div in alg_block.select("div.allergene"):
            nome = div.select_one("p.nome-allergene")
            if nome:
                text = nome.get_text(strip=True)
            else:
                img_tag = div.select_one("img")
                text = (img_tag.get("alt", "").strip() if img_tag
                        else div.get_text(strip=True))
            if text:
                allergens.append({"name": text, "is_trace": False})

    # Trace allergens
    trace_block = soup.select_one("div.tracce_di_allergeni")
    if trace_block:
        structured = trace_block.select("div.allergene")
        if structured:
            for div in structured:
                nome = div.select_one("p.nome-allergene")
                text = nome.get_text(strip=True) if nome else div.get_text(strip=True)
                if text:
                    allergens.append({"name": text, "is_trace": True})
        else:
            raw = trace_block.get_text(" ", strip=True)
            m = re.search(r"(?:contenere|contiene)\s*[:\s]+(.+)", raw, re.IGNORECASE)
            if m:
                for item in re.split(r"[,;]", m.group(1)):
                    item = item.strip().rstrip(". ")
                    if item:
                        allergens.append({"name": item, "is_trace": True})

    # Ingredients — "Name (allergens): quantity"
    ingredients = []
    for li in soup.select("ul li"):
        if li.find("a"):
            continue
        raw = li.get_text(" ", strip=True)
        if not raw or len(raw) > 250 or "quantità" in raw.lower():
            continue
        if ":" in raw:
            name_part, qty = raw.rsplit(":", 1)
            ingredients.append({"name": name_part.strip(), "quantity": qty.strip()})
        else:
            ingredients.append({"name": raw.strip(), "quantity": None})

    # Nutritional info
    nutrition = {}
    nutr_block = (soup.select_one("div.valori_nutrizionali_piatto")
                  or soup.select_one(".dichiarazione-nutrizionale"))
    if nutr_block:
        for row in nutr_block.select("div.row_gda, tr"):
            label_el = (row.select_one("span.gda-label")
                        or row.select_one("td:first-child, th"))
            value_el = (row.select_one("span.gda-value")
                        or row.select_one("td:nth-child(2)"))
            if not label_el or not value_el:
                continue
            col = normalize_nutrition_label(label_el.get_text(strip=True))
            val = parse_float(value_el.get_text(strip=True))
            if col and val is not None:
                nutrition[col] = val

    dietary = detect_dietary_flags(
        f"{name or ''} {description or ''} {category or ''}"
    )

    return {
        "name":        name,
        "category":    category,
        "dish_type":   dish_type,
        "description": description,
        "price":       None,
        "image_url":   image_url,
        "allergens":   allergens,
        "ingredients": ingredients,
        "nutrition":   nutrition,
        "source_url":  meta.get("detail_url"),
        **dietary,
    }


# ─────────────────────────────────────────────────────────
# STEP 4 — IMAGE DOWNLOAD
# ─────────────────────────────────────────────────────────

def download_image(image_url: str) -> str | None:
    if not image_url:
        return None
    try:
        IMAGES_DIR.mkdir(parents=True, exist_ok=True)
        url_hash = hashlib.md5(image_url.encode()).hexdigest()[:12]
        ext = image_url.split("?")[0].rsplit(".", 1)[-1].lower()
        ext = ext if ext in ("jpg", "jpeg", "png", "webp", "gif") else "jpg"
        filepath = IMAGES_DIR / f"{url_hash}.{ext}"
        if filepath.exists():
            print(f"    [img] cached  → {filepath.name}")
            return str(filepath)
        time.sleep(REQUEST_DELAY)
        resp = requests.get(image_url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        filepath.write_bytes(resp.content)
        print(f"    [img] saved   → {filepath.name} ({len(resp.content)//1024} KB)")
        return str(filepath)
    except Exception as e:
        print(f"    [img] failed  → {image_url}: {e}")
        return None


# ─────────────────────────────────────────────────────────
# UTILITIES
# ─────────────────────────────────────────────────────────

def normalize_nutrition_label(label: str) -> str | None:
    ll = label.lower().strip()
    for key, col in NUTRITION_LABEL_MAP.items():
        if key in ll:
            return col
    return None

def parse_float(text: str) -> float | None:
    if not text:
        return None
    m = re.search(r"\d+[.,]?\d*", text.replace(",", "."))
    return float(m.group()) if m else None

def detect_dietary_flags(text: str) -> dict:
    t = text.lower()
    return {
        "is_vegetarian": any(w in t for w in ["vegetariano", "vegetarian", "veggie"]),
        "is_vegan":      any(w in t for w in ["vegano", "vegan", "plant-based"]),
    }


# ─────────────────────────────────────────────────────────
# ORCHESTRATE FULL SCRAPE
# ─────────────────────────────────────────────────────────

def scrape(target_date: date) -> list[dict]:
    # Step 1: get the direct URL for this day
    day_url = get_day_url(target_date)
    if not day_url:
        print(f"[scraper] No menu URL found for {target_date}.")
        return []

    # Step 2: get the list of meal cards from the day page
    cards = get_meal_cards(day_url)
    if not cards:
        print("[scraper] No meal cards found on the day page.")
        return []

    # Step 3: fetch and parse each detail page
    meals = []
    for i, meta in enumerate(cards, 1):
        url = meta["detail_url"]
        print(f"\n  [{i}/{len(cards)}] {meta.get('name') or url}")
        try:
            detail_soup = fetch_detail(url)
            meal = parse_detail(detail_soup, meta)
            print(f"         name        : {meal['name']}")
            print(f"         allergens   : {len(meal['allergens'])}  "
                  f"ingredients: {len(meal['ingredients'])}  "
                  f"nutrition: {bool(meal['nutrition'])}  "
                  f"image: {bool(meal['image_url'])}")
            if meal["name"]:
                meals.append(meal)
        except Exception as e:
            print(f"         [error] {e}")

    print(f"\n[scraper] {len(meals)} meal(s) ready for {target_date}.")
    return meals


# ─────────────────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────────────────

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

def upsert_daily_menu(cur, menu_date: date) -> int:
    cur.execute("""
        INSERT INTO daily_menu (menu_date, day_of_week, restaurant_name, scraped_at)
        VALUES (%s, %s, %s, NOW())
        ON CONFLICT (menu_date, restaurant_name)
        DO UPDATE SET scraped_at = NOW()
        RETURNING id
    """, (menu_date, menu_date.strftime("%A"), "Unibz Mensa"))
    return cur.fetchone()[0]

def upsert_allergen(cur, name: str) -> int:
    cur.execute("INSERT INTO allergen (name) VALUES (%s) "
                "ON CONFLICT (name) DO NOTHING RETURNING id", (name.strip(),))
    row = cur.fetchone()
    if row: return row[0]
    cur.execute("SELECT id FROM allergen WHERE name = %s", (name.strip(),))
    return cur.fetchone()[0]

def upsert_ingredient(cur, name: str) -> int:
    cur.execute("INSERT INTO ingredient (name) VALUES (%s) "
                "ON CONFLICT (name) DO NOTHING RETURNING id", (name.strip(),))
    row = cur.fetchone()
    if row: return row[0]
    cur.execute("SELECT id FROM ingredient WHERE name = %s", (name.strip(),))
    return cur.fetchone()[0]

def insert_meal(cur, menu_id: int, data: dict) -> int:
    cur.execute("""
        INSERT INTO meal (menu_id, name, category, dish_type, description, price,
                          is_vegetarian, is_vegan, is_available,
                          image_url, image_path)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,TRUE,%s,%s) RETURNING id
    """, (menu_id, data.get("name"), data.get("category"),
          data.get("dish_type"), data.get("description"), data.get("price"),
          data.get("is_vegetarian", False), data.get("is_vegan", False),
          data.get("image_url"), data.get("image_path")))
    return cur.fetchone()[0]

def insert_meal_allergen(cur, meal_id, allergen_id):
    cur.execute("INSERT INTO meal_allergen (meal_id, allergen_id) "
                "VALUES (%s,%s) ON CONFLICT DO NOTHING", (meal_id, allergen_id))

def insert_meal_ingredient(cur, meal_id, ingredient_id, quantity=None):
    cur.execute("INSERT INTO meal_ingredient (meal_id, ingredient_id, quantity) "
                "VALUES (%s,%s,%s) ON CONFLICT DO NOTHING",
                (meal_id, ingredient_id, quantity))

def insert_nutritional_info(cur, meal_id: int, data: dict):
    if not any(v is not None for v in data.values()): return
    cur.execute("""
        INSERT INTO nutritional_info
            (meal_id, calories_kcal, proteins_g, carbohydrates_g,
             fats_g, fiber_g, salt_g, sugars_g)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (meal_id) DO UPDATE SET
            calories_kcal=EXCLUDED.calories_kcal, proteins_g=EXCLUDED.proteins_g,
            carbohydrates_g=EXCLUDED.carbohydrates_g, fats_g=EXCLUDED.fats_g,
            fiber_g=EXCLUDED.fiber_g, salt_g=EXCLUDED.salt_g,
            sugars_g=EXCLUDED.sugars_g
    """, (meal_id, data.get("calories_kcal"), data.get("proteins_g"),
          data.get("carbohydrates_g"), data.get("fats_g"),
          data.get("fiber_g"), data.get("salt_g"), data.get("sugars_g")))


# ─────────────────────────────────────────────────────────
# STORE ALL MEALS
# ─────────────────────────────────────────────────────────

def store_meals(meals: list[dict], target_date: date, dry_run: bool = False):
    if dry_run:
        print("\n[dry-run] Results — nothing written to DB:")
        for m in meals:
            short = [i["name"] for i in m["ingredients"][:4]]
            more  = f" +{len(m['ingredients'])-4} more" if len(m["ingredients"]) > 4 else ""
            print(f"\n  • {m['name']}")
            print(f"      category    : {m['category']}")
            print(f"      dish_type   : {m['dish_type']}")
            print(f"      allergens   : {[a['name'] for a in m['allergens']]}")
            print(f"      ingredients : {short}{more}")
            print(f"      nutrition   : {m['nutrition']}")
            print(f"      image_url   : {m['image_url']}")
        return

    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                menu_id = upsert_daily_menu(cur, target_date)
                print(f"\n[db] Menu ID {menu_id}  →  {target_date}\n")
                for meal_data in meals:
                    meal_data["image_path"] = download_image(meal_data.get("image_url"))
                    meal_id = insert_meal(cur, menu_id, meal_data)
                    print(f"  [db] #{meal_id}: {meal_data['name']}")
                    for a in meal_data.get("allergens", []):
                        insert_meal_allergen(cur, meal_id, upsert_allergen(cur, a["name"]))
                    for ing in meal_data.get("ingredients", []):
                        insert_meal_ingredient(cur, meal_id,
                            upsert_ingredient(cur, ing["name"]), ing.get("quantity"))
                    insert_nutritional_info(cur, meal_id, meal_data.get("nutrition", {}))
        print(f"\n[db] Done — {len(meals)} meal(s) stored for {target_date}.")
    finally:
        conn.close()


def apply_schema_patch():
    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("""ALTER TABLE meal
                    ADD COLUMN IF NOT EXISTS image_url  TEXT,
                    ADD COLUMN IF NOT EXISTS image_path TEXT;""")
        print("Schema patch applied.")
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────

def get_week_dates(reference_date: date) -> list[date]:
    """
    Returns all dates for the week (Monday to Saturday)
    that contains the reference_date.
    """
    # Monday of the current week
    monday = reference_date - __import__('datetime').timedelta(days=reference_date.weekday())
    # Monday to Saturday (6 days)
    return [monday + __import__('datetime').timedelta(days=i) for i in range(6)]


def main():
    parser = argparse.ArgumentParser(description="Canteen scraper — unibz.markas.info")
    parser.add_argument("--date", default=str(date.today()), help="YYYY-MM-DD (default: today)")
    parser.add_argument("--week", action="store_true", help="Scrape the full week (Mon-Sat)")
    parser.add_argument("--dry-run", action="store_true", help="Parse only, no DB write")
    parser.add_argument("--patch-schema", action="store_true", help="Add image columns and exit")
    args = parser.parse_args()

    if args.patch_schema:
        apply_schema_patch()
        return

    reference_date = datetime.strptime(args.date, "%Y-%m-%d").date()

    # Build list of dates to scrape
    if args.week:
        dates_to_scrape = get_week_dates(reference_date)
        print("=" * 60)
        print(f"  Canteen scraper  |  WEEKLY MODE"
              f"  {'|  DRY RUN' if args.dry_run else ''}")
        print(f"  Scraping: {dates_to_scrape[0]} → {dates_to_scrape[-1]}")
        print("=" * 60)
    else:
        dates_to_scrape = [reference_date]
        print("=" * 60)
        print(f"  Canteen scraper  |  {reference_date}"
              f"  {'|  DRY RUN' if args.dry_run else ''}")
        print("=" * 60)

    # Scrape each date
    total_stored = 0
    for target_date in dates_to_scrape:
        print(f"\n{'─' * 60}")
        print(f"  Scraping {target_date.strftime('%A %d %B %Y')}...")
        print(f"{'─' * 60}")

        meals = scrape(target_date)
        if not meals:
            print(f"  No meals found for {target_date} — skipping.")
            continue

        store_meals(meals, target_date, dry_run=args.dry_run)
        total_stored += len(meals)
        time.sleep(2)  # polite pause between days

    print(f"\n{'=' * 60}")
    print(f"  All done — {total_stored} meal(s) stored across {len(dates_to_scrape)} day(s).")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
