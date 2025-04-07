from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from crawler import run_crawler

app = FastAPI()

# CORS 허용 (Netlify용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://dbgapp.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CrawlRequest(BaseModel):
    session_cookie: str
    selected_days: list[str]
    exclude_keywords: list[str]

@app.post("/crawl")
async def crawl_handler(req: CrawlRequest):
    hidden, public = run_crawler(
        session_cookie=req.session_cookie,
        selected_days=req.selected_days,
        exclude_keywords=req.exclude_keywords
    )
    return {"hidden": hidden, "public": public}
