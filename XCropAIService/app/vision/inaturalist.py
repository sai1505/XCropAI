import requests

def inaturalist_labels(img_path):
    url = "https://api.inaturalist.org/v1/computervision/score_image"

    with open(img_path, "rb") as f:
        res = requests.post(url, files={"image": f}).json()

    labels = []

    for r in res.get("results", []):
        labels.append(r["taxon"]["name"].lower())

    return labels

