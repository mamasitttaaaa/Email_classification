from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import pickle

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "./model_dev/gbert_email_classifier3"
TOKENIZER_PATH = "./model_dev/gbert_email_classifier3"
LABEL_ENCODER_PATH = "./model_dev/gbert_email_classifier3/label_encoder.pkl"

tokenizer = AutoTokenizer.from_pretrained(TOKENIZER_PATH)

model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
model.eval()  # inference setup

# LabelEncoder to translate index to text category
with open(LABEL_ENCODER_PATH, "rb") as f:
    label_encoder = pickle.load(f)

# Prediction endpoint
@app.post("/predict")
async def predict(req: Request):
    data = await req.json()
    text = data.get("text", "")
    
    if not text:
        return {"error": "No text provided"}
    
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=512
    )

    # Prediction
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        predicted_index = torch.argmax(logits, dim=1).item()
        predicted_label = label_encoder[predicted_index]
    
    return {"category": predicted_label}

# To start: uvicorn server:app --reload