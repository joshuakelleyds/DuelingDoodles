import { mobileTabletCheck } from './utils.js'

const IS_MOBILE = mobileTabletCheck();

export default {
    DEFAULT_MODEL: "quickdraw-mobilevit-small",
    DEFAULT_QUANTIZED: false,
    BANNED_LABELS: [
        // List of banned labels, because they are either:
        // - Too similar to other labels
        // - Too difficult to draw
        // - Too difficult to understand
        // - Ambiguous
        "animal migration", // too difficult to understand
        "arm", // too similar to "elbow"
        "barn", // too similar to other types of buildings
        "bat", // ambiguous (animal vs. sports equipment)
        "brain", // too difficult to draw
        "coffee cup", // too similar to mug
        "circle", // when scaled down, always detected as an octogon
        "hexagon", // too similar to octogon
        "stitches", // too similar to lightning/zigzag
        "sweather", // too similar to "jacket"
        "van", // too similar to other types of vehicles
    ],
    PREDICTION_REFRESH_TIME: 10,
    BRUSH_SIZE: IS_MOBILE ? 12 : 16,
    TARGET_FPS: 60,
    GAME_DURATION: 30 + 0.5, // + 0.5 so it doesn't flicker (TODO: change to 60)
    COUNTDOWN_TIMER: 3,

    START_REJECT_THRESHOLD: 0.2, // How confident the model should be before starting to reject
    REJECT_TIME_DELAY: 3 * 1000, // How many ms to wait before helping
    REJECT_TIME_PER_LABEL: 3 * 1000, // How many ms to reject a label for after it's been drawn

    SKIP_PENALTY: 3 * 1000, // How much to penalize for skipping a drawing

    LABELS: {
        "0": "aircraft carrier",
        "1": "airplane",
        "2": "alarm clock",
        "3": "ambulance",
        "4": "angel",
        "5": "animal migration",
        "6": "ant",
        "7": "anvil",
        "8": "apple",
        "9": "arm",
        "10": "asparagus",
        "11": "axe",
        "12": "backpack",
        "13": "banana",
        "14": "bandage",
        "15": "barn",
        "16": "baseball bat",
        "17": "baseball",
        "18": "basket",
        "19": "basketball",
        "20": "bat",
        "21": "bathtub",
        "22": "beach",
        "23": "bear",
        "24": "beard",
        "25": "bed",
        "26": "bee",
        "27": "belt",
        "28": "bench",
        "29": "bicycle",
        "30": "binoculars",
        "31": "bird",
        "32": "birthday cake",
        "33": "blackberry",
        "34": "blueberry",
        "35": "book",
        "36": "boomerang",
        "37": "bottlecap",
        "38": "bowtie",
        "39": "bracelet",
        "40": "brain",
        "41": "bread",
        "42": "bridge",
        "43": "broccoli",
        "44": "broom",
        "45": "bucket",
        "46": "bulldozer",
        "47": "bus",
        "48": "bush",
        "49": "butterfly",
        "50": "cactus",
        "51": "cake",
        "52": "calculator",
        "53": "calendar",
        "54": "camel",
        "55": "camera",
        "56": "camouflage",
        "57": "campfire",
        "58": "candle",
        "59": "cannon",
        "60": "canoe",
        "61": "car",
        "62": "carrot",
        "63": "castle",
        "64": "cat",
        "65": "ceiling fan",
        "66": "cell phone",
        "67": "cello",
        "68": "chair",
        "69": "chandelier",
        "70": "church",
        "71": "circle",
        "72": "clarinet",
        "73": "clock",
        "74": "cloud",
        "75": "coffee cup",
        "76": "compass",
        "77": "computer",
        "78": "cookie",
        "79": "cooler",
        "80": "couch",
        "81": "cow",
        "82": "crab",
        "83": "crayon",
        "84": "crocodile",
        "85": "crown",
        "86": "cruise ship",
        "87": "cup",
        "88": "diamond",
        "89": "dishwasher",
        "90": "diving board",
        "91": "dog",
        "92": "dolphin",
        "93": "donut",
        "94": "door",
        "95": "dragon",
        "96": "dresser",
        "97": "drill",
        "98": "drums",
        "99": "duck",
        "100": "dumbbell",
        "101": "ear",
        "102": "elbow",
        "103": "elephant",
        "104": "envelope",
        "105": "eraser",
        "106": "eye",
        "107": "eyeglasses",
        "108": "face",
        "109": "fan",
        "110": "feather",
        "111": "fence",
        "112": "finger",
        "113": "fire hydrant",
        "114": "fireplace",
        "115": "firetruck",
        "116": "fish",
        "117": "flamingo",
        "118": "flashlight",
        "119": "flip flops",
        "120": "floor lamp",
        "121": "flower",
        "122": "flying saucer",
        "123": "foot",
        "124": "fork",
        "125": "frog",
        "126": "frying pan",
        "127": "garden hose",
        "128": "garden",
        "129": "giraffe",
        "130": "goatee",
        "131": "golf club",
        "132": "grapes",
        "133": "grass",
        "134": "guitar",
        "135": "hamburger",
        "136": "hammer",
        "137": "hand",
        "138": "harp",
        "139": "hat",
        "140": "headphones",
        "141": "hedgehog",
        "142": "helicopter",
        "143": "helmet",
        "144": "hexagon",
        "145": "hockey puck",
        "146": "hockey stick",
        "147": "horse",
        "148": "hospital",
        "149": "hot air balloon",
        "150": "hot dog",
        "151": "hot tub",
        "152": "hourglass",
        "153": "house plant",
        "154": "house",
        "155": "hurricane",
        "156": "ice cream",
        "157": "jacket",
        "158": "jail",
        "159": "kangaroo",
        "160": "key",
        "161": "keyboard",
        "162": "knee",
        "163": "knife",
        "164": "ladder",
        "165": "lantern",
        "166": "laptop",
        "167": "leaf",
        "168": "leg",
        "169": "light bulb",
        "170": "lighter",
        "171": "lighthouse",
        "172": "lightning",
        "173": "line",
        "174": "lion",
        "175": "lipstick",
        "176": "lobster",
        "177": "lollipop",
        "178": "mailbox",
        "179": "map",
        "180": "marker",
        "181": "matches",
        "182": "megaphone",
        "183": "mermaid",
        "184": "microphone",
        "185": "microwave",
        "186": "monkey",
        "187": "moon",
        "188": "mosquito",
        "189": "motorbike",
        "190": "mountain",
        "191": "mouse",
        "192": "moustache",
        "193": "mouth",
        "194": "mug",
        "195": "mushroom",
        "196": "nail",
        "197": "necklace",
        "198": "nose",
        "199": "ocean",
        "200": "octagon",
        "201": "octopus",
        "202": "onion",
        "203": "oven",
        "204": "owl",
        "205": "paint can",
        "206": "paintbrush",
        "207": "palm tree",
        "208": "panda",
        "209": "pants",
        "210": "paper clip",
        "211": "parachute",
        "212": "parrot",
        "213": "passport",
        "214": "peanut",
        "215": "pear",
        "216": "peas",
        "217": "pencil",
        "218": "penguin",
        "219": "piano",
        "220": "pickup truck",
        "221": "picture frame",
        "222": "pig",
        "223": "pillow",
        "224": "pineapple",
        "225": "pizza",
        "226": "pliers",
        "227": "police car",
        "228": "pond",
        "229": "pool",
        "230": "popsicle",
        "231": "postcard",
        "232": "potato",
        "233": "power outlet",
        "234": "purse",
        "235": "rabbit",
        "236": "raccoon",
        "237": "radio",
        "238": "rain",
        "239": "rainbow",
        "240": "rake",
        "241": "remote control",
        "242": "rhinoceros",
        "243": "rifle",
        "244": "river",
        "245": "roller coaster",
        "246": "rollerskates",
        "247": "sailboat",
        "248": "sandwich",
        "249": "saw",
        "250": "saxophone",
        "251": "school bus",
        "252": "scissors",
        "253": "scorpion",
        "254": "screwdriver",
        "255": "sea turtle",
        "256": "see saw",
        "257": "shark",
        "258": "sheep",
        "259": "shoe",
        "260": "shorts",
        "261": "shovel",
        "262": "sink",
        "263": "skateboard",
        "264": "skull",
        "265": "skyscraper",
        "266": "sleeping bag",
        "267": "smiley face",
        "268": "snail",
        "269": "snake",
        "270": "snorkel",
        "271": "snowflake",
        "272": "snowman",
        "273": "soccer ball",
        "274": "sock",
        "275": "speedboat",
        "276": "spider",
        "277": "spoon",
        "278": "spreadsheet",
        "279": "square",
        "280": "squiggle",
        "281": "squirrel",
        "282": "stairs",
        "283": "star",
        "284": "steak",
        "285": "stereo",
        "286": "stethoscope",
        "287": "stitches",
        "288": "stop sign",
        "289": "stove",
        "290": "strawberry",
        "291": "streetlight",
        "292": "string bean",
        "293": "submarine",
        "294": "suitcase",
        "295": "sun",
        "296": "swan",
        "297": "sweater",
        "298": "swing set",
        "299": "sword",
        "300": "syringe",
        "301": "t-shirt",
        "302": "table",
        "303": "teapot",
        "304": "teddy-bear",
        "305": "telephone",
        "306": "television",
        "307": "tennis racquet",
        "308": "tent",
        "309": "The Eiffel Tower",
        "310": "The Great Wall of China",
        "311": "The Mona Lisa",
        "312": "tiger",
        "313": "toaster",
        "314": "toe",
        "315": "toilet",
        "316": "tooth",
        "317": "toothbrush",
        "318": "toothpaste",
        "319": "tornado",
        "320": "tractor",
        "321": "traffic light",
        "322": "train",
        "323": "tree",
        "324": "triangle",
        "325": "trombone",
        "326": "truck",
        "327": "trumpet",
        "328": "umbrella",
        "329": "underwear",
        "330": "van",
        "331": "vase",
        "332": "violin",
        "333": "washing machine",
        "334": "watermelon",
        "335": "waterslide",
        "336": "whale",
        "337": "wheel",
        "338": "windmill",
        "339": "wine bottle",
        "340": "wine glass",
        "341": "wristwatch",
        "342": "yoga",
        "343": "zebra",
        "344": "zigzag"
    },
};
