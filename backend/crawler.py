import requests  
from bs4 import BeautifulSoup
import re
import urllib3
import time
from concurrent.futures import ThreadPoolExecutor

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

MAIN_URL = "https://dbg.shopreview.co.kr/usr"
CAMPAIGN_URL_TEMPLATE = "https://dbg.shopreview.co.kr/usr/campaign_detail?csq={}"
THREAD_COUNT = 4

def get_public_campaigns(session):
    public_campaigns = set()
    for attempt in range(3):
        try:
            response = session.get(MAIN_URL, verify=False, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")
            scripts = soup.find_all("script")
            for script in scripts:
                matches = re.findall(r'data-csq=["\']?(\d+)', script.text)
                public_campaigns.update(map(int, matches))
            if public_campaigns:
                return public_campaigns
        except requests.exceptions.RequestException:
            time.sleep(5)
    return set()

def fetch_campaign_data(campaign_id, session, public_campaigns, selected_days, exclude_keywords):
    url = CAMPAIGN_URL_TEMPLATE.format(campaign_id)
    try:
        response = session.get(url, verify=False, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        
        if soup.find("script", string="window.location.href = '/usr/login_form';"):
            return None

        participation_time = soup.find("button", class_="butn butn-success", disabled=True)
        participation_time = participation_time.text.strip() if participation_time else "참여 가능 시간 없음"
        if "시에" in participation_time:
            participation_time = participation_time.replace("시에", "시 00분에")

        if not any(day in participation_time for day in selected_days):
            return None

        product_name = soup.find("h3")
        product_name = product_name.text.strip() if product_name else "상품명 없음"

        if any(keyword in product_name for keyword in exclude_keywords):
            return None

        price = "가격 정보 없음"
        total_price_section = soup.find(string=re.compile("총 결제금액"))
        if total_price_section:
            price_text = total_price_section.find_next("div", style="text-align:right")
            if price_text:
                price_numeric = re.sub(r"[^\d]", "", price_text.text.strip())
                price = price_numeric if price_numeric else "가격 정보 없음"

        tobagi_points = "0 P"
        tobagi_section = soup.find(string=re.compile("또바기 포인트"))
        if tobagi_section:
            points_text = tobagi_section.find_next("div", style="text-align:right")
            if points_text:
                tobagi_points = points_text.text.strip()

        product_type = "상품구분 없음"
        delivery_sections = soup.find_all("div", class_="row col-sm4 col-12")
        for section in delivery_sections:
            title = section.find("div", class_="col-6")
            value = section.find("div", style="text-align:right")
            if title and value and "배송" in title.text:
                product_type = value.text.strip()
                break

        shop_name = "쇼핑몰 정보 없음"
        shop_section = soup.find("div", class_="col-sm-9")
        if shop_section:
            shop_img = shop_section.find("img")
            if shop_img and "alt" in shop_img.attrs:
                shop_name = shop_img["alt"].strip()

        text_review = "포토 리뷰"
        review_label = soup.find("label", class_="form-check-label", string="텍스트 리뷰")
        if review_label:
            text_review = "텍스트 리뷰"

        result = f"{product_type} & {text_review} & {shop_name} & {price} & {tobagi_points} & {participation_time} & {product_name} & {url}"

        if campaign_id in public_campaigns:
            return (None, result)
        return (result, None)

    except requests.exceptions.RequestException:
        return (None, None)

def run_crawler(session_cookie, selected_days, exclude_keywords):
    session = requests.Session()
    session.cookies.set("PHPSESSID", session_cookie)

    public_campaigns = get_public_campaigns(session)
    if not public_campaigns:
        return [], []

    start_campaign_id = min(public_campaigns) - 100
    end_campaign_id = max(public_campaigns) + 100

    hidden_campaigns = []
    public_campaign_details = []

    with ThreadPoolExecutor(max_workers=THREAD_COUNT) as executor:
        futures = {
            executor.submit(
                fetch_campaign_data, cid, session, public_campaigns, selected_days, exclude_keywords
            ): cid for cid in range(start_campaign_id, end_campaign_id + 1)
        }
        for future in futures:
            result = future.result()
            if result:
                hidden_result, public_result = result
                if hidden_result:
                    hidden_campaigns.append(hidden_result)
                if public_result:
                    public_campaign_details.append(public_result)

    hidden_campaigns = sorted(hidden_campaigns, key=lambda x: x.split(" & ")[5])
    public_campaign_details = sorted(public_campaign_details, key=lambda x: x.split(" & ")[5])

    return hidden_campaigns, public_campaign_details
