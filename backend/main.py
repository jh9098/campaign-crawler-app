from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from crawler import run_crawler

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Netlify와 연결용
    allow_methods=["*"],
    allow_headers=["*"],
)

class CrawlRequest(BaseModel):
    session_cookie: str
    selected_days: list[str]  # ["07일", "08일"]
    exclude_keywords: list[str]  # ["이발기", "깔창"]

@app.post("/crawl")
def crawl(data: CrawlRequest):
    result = run_crawler(
        cookie=data.session_cookie,
        days=data.selected_days,
        exclude_keywords=data.exclude_keywords
    )
    return result
