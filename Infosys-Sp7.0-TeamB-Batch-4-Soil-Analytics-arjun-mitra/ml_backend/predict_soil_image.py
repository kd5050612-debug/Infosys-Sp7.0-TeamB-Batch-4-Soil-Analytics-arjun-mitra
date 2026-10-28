import base64
import io
import json
import sys
import tempfile
import warnings
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / "models" / "image" / "best_soil_classifier_finetuned.keras"
CLASS_NAMES = [
    "Alluvial_Soil",
    "Arid_Soil",
    "Black_Soil",
    "Laterite_Soil",
    "Mountain_Soil",
    "Red_Soil",
    "Yellow_Soil",
]


def main():
    payload = json.load(sys.stdin)
    image_data = payload.get("image")
    if not isinstance(image_data, str) or not image_data:
        raise ValueError("An image data URL or base64 image is required.")

    if "," in image_data and image_data.startswith("data:"):
        image_data = image_data.split(",", 1)[1]

    image_bytes = base64.b64decode(image_data, validate=True)
    with Image.open(io.BytesIO(image_bytes)) as source:
        image = source.convert("RGB").resize((224, 224))
        array = np.asarray(image, dtype=np.float32)

    # Matches tf.keras.applications.mobilenet_v2.preprocess_input for [0, 255] RGB data.
    array = (array / 127.5) - 1.0
    batch = np.expand_dims(array, axis=0)

    import tensorflow as tf

    with tempfile.TemporaryDirectory() as temporary_directory:
        compatible_model_path = Path(temporary_directory) / MODEL_PATH.name
        with zipfile.ZipFile(MODEL_PATH) as source, zipfile.ZipFile(
            compatible_model_path, "w", zipfile.ZIP_DEFLATED
        ) as target:
            for member in source.infolist():
                contents = source.read(member.filename)
                if member.filename == "config.json":
                    config = json.loads(contents)

                    def remove_unsupported_options(value):
                        if isinstance(value, dict):
                            return {
                                key: remove_unsupported_options(item)
                                for key, item in value.items()
                                if key != "quantization_config"
                            }
                        if isinstance(value, list):
                            return [remove_unsupported_options(item) for item in value]
                        return value

                    contents = json.dumps(
                        remove_unsupported_options(config)
                    ).encode("utf-8")
                target.writestr(member, contents)

        model = tf.keras.models.load_model(compatible_model_path, compile=False)
    probabilities = np.asarray(model.predict(batch, verbose=0)[0], dtype=np.float32)
    if probabilities.size != len(CLASS_NAMES):
        raise RuntimeError(
            f"Expected {len(CLASS_NAMES)} model outputs, received {probabilities.size}."
        )

    ranked = np.argsort(probabilities)[::-1]
    prediction_index = int(ranked[0])
    top_predictions = [
        {
            "soilType": CLASS_NAMES[int(index)],
            "confidence": round(float(probabilities[index]) * 100, 2),
        }
        for index in ranked[:3]
    ]
    print(json.dumps({
        "soilType": CLASS_NAMES[prediction_index],
        "confidence": round(float(probabilities[prediction_index]) * 100, 2),
        "topPredictions": top_predictions,
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)
