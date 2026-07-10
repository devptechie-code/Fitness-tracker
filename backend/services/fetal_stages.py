"""Week-by-week development data. `stage` controls which visual motif the
frontend renders (heartbeat pulse → limb buds → growing silhouette, etc).
Sizes are everyday comparisons, not clinical measurements.
Port of vitacircle services/fetalStages.js."""

SIZE_BY_WEEK = {
    4: "a poppy seed", 5: "a sesame seed", 6: "a lentil", 7: "a blueberry",
    8: "a raspberry", 9: "a grape", 10: "a kumquat", 11: "a fig",
    12: "a lime", 13: "a lemon", 14: "a peach", 15: "an apple",
    16: "an avocado", 17: "a turnip", 18: "a bell pepper", 19: "a mango",
    20: "a banana", 21: "a carrot", 22: "a papaya", 23: "a grapefruit",
    24: "an ear of corn", 25: "a cauliflower head", 26: "a lettuce head", 27: "a cucumber",
    28: "an eggplant", 29: "a butternut squash", 30: "a cabbage", 31: "a coconut",
    32: "a jicama", 33: "a pineapple", 34: "a cantaloupe", 35: "a honeydew melon",
    36: "a head of romaine", 37: "a bunch of chard", 38: "a leek bundle",
    39: "a mini watermelon", 40: "a small pumpkin",
}

STAGE_HEADLINES = {
    "spark": "Life is just beginning — cells are dividing rapidly.",
    "heartbeat": "Baby's heart has started beating — the very first milestone.",
    "limbBuds": "Tiny limb buds are forming, which will become arms and legs.",
    "fingersToes": "Fingers, toes, and facial features are taking shape.",
    "growing": "Baby is growing fast, and you may start feeling movement.",
    "senses": "Senses are sharpening — baby can hear sounds and open their eyes.",
    "thriving": "Baby is gaining weight steadily and practicing breathing motions.",
    "fullTerm": "Baby is getting into position and is nearly ready to meet you.",
}

STAGE_ORDER = ["spark", "heartbeat", "limbBuds", "fingersToes",
               "growing", "senses", "thriving", "fullTerm"]


def stage_for(week):
    if week <= 4:
        return "spark"
    if week <= 6:
        return "heartbeat"
    if week <= 10:
        return "limbBuds"
    if week <= 14:
        return "fingersToes"
    if week <= 20:
        return "growing"
    if week <= 27:
        return "senses"
    if week <= 35:
        return "thriving"
    return "fullTerm"


def get_week_data(week):
    w = min(40, max(1, week))
    stage = stage_for(w)
    return {
        "week": w,
        "stage": stage,
        "sizeComparison": SIZE_BY_WEEK.get(w, "a tiny seed"),
        "headline": STAGE_HEADLINES[stage],
    }
