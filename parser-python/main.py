from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import io
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://ats.eclipticinsight.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "ATS Resume Parser Running"}

def extract_email(text):
    match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    return match.group(0) if match else ""

def extract_phone(text):
    match = re.search(r'(\+91[-\s]?)?[6-9]\d{9}', text)
    return match.group(0) if match else ""

def extract_name(text):
    lines = text.split("\n")
    for line in lines[:5]:
        if len(line.strip()) > 2 and len(line.strip()) < 30:
            return line.strip()
    return ""

@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    contents = await file.read()

    text = ""

    with pdfplumber.open(io.BytesIO(contents)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

    return {
        "success": True,
        "filename": file.filename,
        "fullText": text[:5000],
        "name": extract_name(text),
        "email": extract_email(text),
        "phone": extract_phone(text)
    }