import requests
from core.config import PLANTNET_KEY


def plantnet_labels(img_path):
    if not PLANTNET_KEY:
        return []

    url = f"https://my-api.plantnet.org/v2/identify/all?api-key={PLANTNET_KEY}"

    with open(img_path, "rb") as f:
        res = requests.post(url, files={"images": f}).json()

    labels = []

    for r in res.get("results", []):
        labels.append(r["species"]["scientificNameWithoutAuthor"].lower())

    return labels
