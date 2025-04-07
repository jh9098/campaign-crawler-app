# crawler.py

import requests, re, time, urllib3
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
MAIN_URL = "https://dbg.shopreview.co.kr/usr"
DETAIL_URL = "https://dbg.shopreview.co.kr/usr/campaign_detail?csq={}"
THREAD_COUNT = 4

def get_public_campaigns(session):
    public_campaigns = set()
    for _ in range(3):
        try:
            res = session.get(MAIN_URL, verify=False, timeout=10)
            soup = BeautifulSoup(res.text, "html.parser")
            scripts = soup.find_all("script")
            for script in scripts:
                matches = re.findall(r'data-csq=["\']?(\d+)', script.text)
                public_campaigns.update(map(int, matches))
            return public_campaigns
        except:
            time.sleep(3)
    return set()

def fetch_campaign(campaign_id, session, public_ids, dates, exclude_keywords):
    url = DETAIL_URL.format(campaign_id)
    try:
        res = session.get(url, verify=False, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")
        
        if soup.find("script", string="window.location.href = '/usr/login_form';"):
            return None

        time_info = soup.find("button", class_="butn butn-success", disabled=True)
        time_text = time_info.text.strip() if time_info else "참여 가능 시간 없음"
        if not any(day in time_text for day in dates):
            return None

        product_name = soup.find("h3").text.strip() if soup.find("h3") else ""
        if any(keyword in product_name for keyword in exclude_keywords):
            return None

        shop = soup.find("div", class_="col-sm-9")
        shop_name = shop.find("img")["alt"].strip() if shop and shop.find("img") else "쇼핑몰 정보 없음"

        result = f"{shop_name} | {time_text} | {product_name} | {url}"

        if campaign_id in public_ids:
            return (None, result)
        return (result, None)

    except:
        return (None, None)

def run_crawler(cookie: str, days: list[str], exclude_keywords: list[str]):
    session = requests.Session()
    session.cookies.set("PHPSESSID", cookie)

    public_ids = get_public_campaigns(session)
    if not public_ids:
        return {"hidden": [], "public": []}

    start_id = min(public_ids) - 100
    end_id = max(public_ids) + 100

    hidden, public = [], []
    with ThreadPoolExecutor(max_workers=THREAD_COUNT) as executor:
        futures = [executor.submit(fetch_campaign, cid, session, public_ids, days, exclude_keywords)
                   for cid in range(start_id, end_id + 1)]
        for f in futures:
            r = f.result()
            if r:
                h, p = r
                if h: hidden.append(h)
                if p: public.append(p)
    return {"hidden": hidden, "public": public}
