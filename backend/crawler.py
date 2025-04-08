# backend/crawler.py

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
            response = session.get(MAIN_URL, verify=False, timeout=10)
            response.raise_for_status()
            scripts = BeautifulSoup(response.text, "html.parser").find_all("script")
            for script in scripts:
                matches = re.findall(r'data-csq=["\']?(\d+)', script.text)
                public_campaigns.update(map(int, matches))
            if public_campaigns:
                return public_campaigns
        except requests.exceptions.RequestException:
            time.sleep(3)
    return set()

def fetch_campaign_data(campaign_id, session, public_campaigns, selected_days, exclude_keywords):
    url = CAMPAIGN_URL_TEMPLATE.format(campaign_id)
    try:
        response = session.get(url, verify=False, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        # 로그인 여부 확인
        if soup.find("script", string="window.location.href = '/usr/login_form';"):
            return None

        # 참여 시간 확인
        participation_time = soup.find("button", class_="butn butn-success", disabled=True)
        participation_time = participation_time.text.strip() if participation_time else ""
        if "시에" in participation_time:
            participation_time = participation_time.replace("시에", "시 00분에")
        print(f"🔍 캠페인 {campaign_id} 참여 시간: {participation_time}")
        print(f"🔍 상품명: {product_name}")

        if not any(day in participation_time for day in selected_days):
            return None
        print(f"🔍 캠페인 {campaign_id} 참여 시간: {participation_time}")
        print(f"🔍 상품명: {product_name}")

        # 종료된 캠페인, 참여불가 조건
        if soup.find("button", string="종료된 캠페인 입니다") or \
           soup.find("div", id="alert_msg", string="해당 캠페인은 참여가 불가능한 상태입니다.") or \
           soup.find("button", string="참여 가능 시간이 아닙니다") or \
           soup.find("button", string="캠페인 참여"):
            return None

        product_name_tag = soup.find("h3")
        product_name = product_name_tag.text.strip() if product_name_tag else "상품명 없음"
        if product_name != "상품명 없음" and any(keyword in product_name for keyword in exclude_keywords):
            return None


        # 가격 추출
        price = "가격 정보 없음"
        price_tag = soup.find(string=re.compile("총 결제금액"))
        if price_tag:
            price_text = price_tag.find_next("div", style="text-align:right")
            if price_text:
                price_value = re.sub(r"[^\d]", "", price_text.text)
                price = price_value if price_value else price

        # 포인트 추출
        tobagi_points = "0 P"
        point_tag = soup.find(string=re.compile("또바기 포인트"))
        if point_tag:
            pt = point_tag.find_next("div", style="text-align:right")
            if pt:
                tobagi_points = pt.text.strip()

        # 배송 구분
        product_type = "상품구분 없음"
        for section in soup.find_all("div", class_="row col-sm4 col-12"):
            title = section.find("div", class_="col-6")
            value = section.find("div", style="text-align:right")
            if title and value and "배송" in title.text:
                product_type = value.text.strip()
                break

        # 쇼핑몰
        shop_name = "쇼핑몰 정보 없음"
        shop_section = soup.find("div", class_="col-sm-9")
        if shop_section:
            shop_img = shop_section.find("img")
            if shop_img and "alt" in shop_img.attrs:
                shop_name = shop_img["alt"].strip()

        # 리뷰 형태
        text_review = "포토 리뷰"
        if soup.find("label", string="텍스트 리뷰"):
            text_review = "텍스트 리뷰"

        # 가격 기준 필터
        if price != "가격 정보 없음":
            price_num = int(price)
            if "기타배송" in product_type and "스마트스토어" in shop_name and price_num < 90000:
                return None
            if "기타배송" in product_type and "쿠팡" in shop_name and price_num < 28500:
                return None
            if "실배송" in product_type and price_num < 8500:
                return None

        result = f"{product_type} & {text_review} & {shop_name} & {price} & {tobagi_points} & {participation_time} & {product_name} & {url}"
        return (None, result) if campaign_id in public_campaigns else (result, None)

    except requests.exceptions.RequestException:
        return (None, None)

def run_crawler(session_cookie, selected_days, exclude_keywords):
    session = requests.Session()
    session.cookies.set("PHPSESSID", session_cookie)

    public_campaigns = get_public_campaigns(session)
    print("✅ 공개 캠페인 수:", len(public_campaigns))
    print("✅ 필터 날짜 조건:", selected_days)
    print("✅ 제외 키워드:", exclude_keywords)

    if not public_campaigns:
        return [], []

    start_id = 40000
    end_id = 40100

    hidden = []
    public = []

    with ThreadPoolExecutor(max_workers=THREAD_COUNT) as executor:
        futures = {
            executor.submit(
                fetch_campaign_data, cid, session, public_campaigns, selected_days, exclude_keywords
            ): cid for cid in range(start_id, end_id + 1)
        }
        for future in futures:
            result = future.result()
            if result:
                h, p = result
                if h: hidden.append(h)
                if p: public.append(p)

    hidden.sort(key=lambda x: x.split(" & ")[5])
    public.sort(key=lambda x: x.split(" & ")[5])
    return hidden, public
