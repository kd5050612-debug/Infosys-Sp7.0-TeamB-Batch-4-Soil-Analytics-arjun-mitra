import json
import sys
import warnings
from pathlib import Path

import joblib
import pandas as pd
from sklearn.exceptions import InconsistentVersionWarning


warnings.filterwarnings("ignore", category=InconsistentVersionWarning)


ROOT = Path(__file__).resolve().parent
MODEL_DIR = ROOT / "models"
FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]


def main():
    if sys.argv[1:] == ["--warmup"]:
        joblib.load(MODEL_DIR / "crop_preprocessor.pkl")
        joblib.load(MODEL_DIR / "crop_model.pkl")
        joblib.load(MODEL_DIR / "crop_label_encoder.pkl")
        print(json.dumps({"status": "ready"}))
        return
    payload = json.load(sys.stdin)
    values = {
        "N": payload["nitrogen"],
        "P": payload["phosphorus"],
        "K": payload["potassium"],
        "temperature": payload["temperature"],
        "humidity": payload["humidity"],
        "ph": payload["ph"],
        "rainfall": payload["rainfall"],
    }
    features = pd.DataFrame([values], columns=FEATURES)
    preprocessor = joblib.load(MODEL_DIR / "crop_preprocessor.pkl")
    model = joblib.load(MODEL_DIR / "crop_model.pkl")
    encoder = joblib.load(MODEL_DIR / "crop_label_encoder.pkl")
    encoded_prediction = model.predict(preprocessor.transform(features))[0]
    probabilities = model.predict_proba(preprocessor.transform(features))[0]
    crop = encoder.inverse_transform([encoded_prediction])[0]
    confidence = round(float(max(probabilities)) * 100, 2)
    print(json.dumps({"crop": crop, "confidence": confidence}))


if __name__ == "__main__":
    main()
