from app.vision.plantnet import plantnet_labels
from app.vision.inaturalist import inaturalist_labels
from app.vision.opencv_symptoms import opencv_symptoms


def merged_labels(img_path):
    p = plantnet_labels(img_path)
    i = inaturalist_labels(img_path)
    o = opencv_symptoms(img_path)

    return list(set(p + i + o))
