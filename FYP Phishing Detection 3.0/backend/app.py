# Import required libraries
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware #allow chrome to communicate
from pydantic import BaseModel
import joblib
import pandas as pd
from url_feature_extractor import URLFeatureExtractor  # class at URL extractor file to extract features from a raw URL

# Initialize FastAPI app
app = FastAPI()

# Enable CORS (Cross-Origin Resource Sharing) to allow frontend to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the Random Forest model
model = joblib.load("rf_model_v3.pkl")

# Define the expected feature columns in correct order
FEATURE_COLUMNS = ['url_len','dom_len','is_ip','tld_len','subdom_cnt','letter_cnt',
                   'digit_cnt','special_cnt','eq_cnt','qm_cnt','amp_cnt','dot_cnt','dash_cnt',
                   'under_cnt','letter_ratio','digit_ratio','spec_ratio','is_https','slash_cnt',
                   'entropy','path_len','query_len']

# Define input model schema for direct feature input
#BaseModel tells FastAPI: “This is the exact structure and data types I expect in the request.”
class URLFeatures(BaseModel):
    url_len: int
    dom_len: int
    is_ip: int
    tld_len: int
    subdom_cnt: int
    letter_cnt: int
    digit_cnt: int
    special_cnt: int
    eq_cnt: int
    qm_cnt: int
    amp_cnt: int
    dot_cnt: int
    dash_cnt: int
    under_cnt: int
    letter_ratio: float
    digit_ratio: float
    spec_ratio: float
    is_https: int
    slash_cnt: int
    entropy: float
    path_len: int
    query_len: int

# ✅ Define input model for raw URL input
class URLInput(BaseModel):
    url: str

# ✅ Predict directly from structured features
@app.post("/predict")
def predict(features: URLFeatures):
    try:
        # Convert to DataFrame with feature names
        input_df = pd.DataFrame([features.model_dump()])
        # Predict
        #pred=model.predict(input_df)
        #label = int(pred[0])

        # Use probability threshold instead: (hard to detect legitimate sites that are very similar to phishing sites, e.g., paypal.com vs paypa1.com)
        prob = model.predict_proba(input_df)[0][1]  # probability of being phishing
        threshold = 0.7  # raise this to reduce false positives (try 0.6, 0.7, 0.8)
        label = 1 if prob >= threshold else 0

        return {
            "prediction": label,
            "result": "Phishing" if label == 1 else "Legitimate"
        }
    except Exception as e:
        return {"error": str(e)}

# ✅ Predict from raw URL using feature extractor
@app.post("/predict_url")
def predict_from_url(input_data: URLInput):
    try:
        # Extract features using custom extractor
        extractor = URLFeatureExtractor(input_data.url)
        features = extractor.extract_model_features()
        if "error" in features:
            return {"error": features["error"]}

        # Convert to DataFrame to align with expected column names
        input_df = pd.DataFrame([features])[FEATURE_COLUMNS]

        # Predict
        #pred = model.predict(input_df)
        #label = int(pred[0])

        # Use probability threshold instead: (hard to detect legitimate sites that are very similar to phishing sites, e.g., paypal.com vs paypa1.com)
        prob = model.predict_proba(input_df)[0][1]  # probability of being phishing
        threshold = 0.7  # raise this to reduce false positives (try 0.6, 0.7, 0.8)
        label = 1 if prob >= threshold else 0


        return {
            "features": features,
            "prediction": label,
            "result": "Phishing" if label == 1 else "Legitimate"
        }
    except Exception as e:
        return {"error": str(e)}


# ✅ Root endpoint
@app.get("/")
def read_root():
    return {"message": "API is running 🚀"}