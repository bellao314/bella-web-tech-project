const CATEGORY_KEYWORDS = {
  "food truck": [
    "food", "truck", "food truck", "foodtruck", "dining", "eats", "eat",
    "lunch", "dinner", "snack", "meal", "beverage", "drinks", "cuisine",
  ],
  "farmer's market": [
    "farmer", "farmers", "market", "produce", "fresh", "farm", "organic",
    "vegetables", "veggies", "fruit", "fruits", "local", "flowers", "plants", "grocery",
  ],
  "crafter": [
    "craft", "crafts", "crafter", "handmade", "artisan", "art", "gifts",
    "decor", "home", "handcrafted", "diy",
  ],
  "jewelry": [
    "jewelry", "jeweller", "jeweler", "accessories", "necklace", "ring",
    "rings", "bracelet", "bracelets", "earrings", "silver", "gold", "gem",
    "gems", "gemstone", "beads", "permanent jewelry",
  ],
  "mobile boutique": [
    "boutique", "clothing", "clothes", "apparel", "fashion", "shopping",
    "vintage", "retail", "outfits", "wear", "accessories",
  ],
  "mobile food & beverage": [
    "food", "beverage", "drinks", "coffee", "eats", "dining",
  ],
}

const SPECIALTY_RULES = [
  { match: /donut|doughnut/i, keywords: ["donut", "donuts", "doughnut", "doughnuts", "pastry", "bakery", "sweet", "dessert", "breakfast"] },
  { match: /bbq|barbecue/i, keywords: ["bbq", "barbecue", "smoked", "ribs", "pork", "brisket", "meat", "pulled pork"] },
  { match: /taco|antojito|guatemala|mexic/i, keywords: ["mexican", "taco", "tacos", "latin", "burrito", "salsa", "antojitos", "hispanic"] },
  { match: /hot dog|dog/i, keywords: ["hot dog", "hot dogs", "hotdog", "hotdogs", "sausage", "franks"] },
  { match: /pizza/i, keywords: ["pizza", "pizzas", "pie", "slice", "slices", "italian"] },
  { match: /gyro/i, keywords: ["gyro", "gyros", "greek", "mediterranean", "pita", "tzatziki"] },
  { match: /k-bop|korean/i, keywords: ["korean", "asian", "k-bop", "rice", "bibimbap"] },
  { match: /cajun|creole|boot/i, keywords: ["cajun", "creole", "southern", "louisiana", "soul food", "gumbo", "jambalaya"] },
  { match: /soulfull|soul/i, keywords: ["soul food", "southern", "comfort food"] },
  { match: /balkan/i, keywords: ["balkan", "turkish", "mediterranean", "somun", "cevapi", "eastern european"] },
  { match: /hawaiian|buzzs/i, keywords: ["hawaiian", "hawaii", "poke", "island", "aloha", "grill"] },
  { match: /deli/i, keywords: ["deli", "sandwich", "sandwiches", "panini", "sub", "subs"] },
  { match: /coffee|cafe|cardamom|juniper|espresso|roast/i, keywords: ["coffee", "cafe", "espresso", "latte", "cappuccino", "roaster", "tea", "brew", "pastries"] },
  { match: /brazil/i, keywords: ["brazil", "brazilian", "latin", "empanadas", "churrasco"] },
  { match: /pottery|clay/i, keywords: ["pottery", "ceramics", "clay", "ceramic", "mugs", "vases", "bowls"] },
  { match: /timber|wood/i, keywords: ["wood", "woodwork", "woodcraft", "timber", "furniture", "carving", "cutting boards"] },
  { match: /leather/i, keywords: ["leather", "leatherworks", "wallets", "bags", "belts"] },
  { match: /glass/i, keywords: ["glass", "glassworks", "stained glass", "blown glass"] },
  { match: /fiber|knot|knits|crochet/i, keywords: ["crochet", "fiber", "fiber arts", "yarn", "knitting", "knit", "macrame", "weaving", "textile"] },
  { match: /candle/i, keywords: ["candle", "candles", "wax", "scented", "aromatherapy", "soy"] },
  { match: /flora|willow|lavender|flower/i, keywords: ["flowers", "florals", "bouquet", "plants", "lavender", "botanicals", "succulents"] },
  { match: /honey|herb/i, keywords: ["honey", "bees", "herbs", "herbal", "raw honey", "tea"] },
  { match: /berry|orchard|produce|pastures|microgreens|rooted/i, keywords: ["produce", "fruit", "fruits", "berry", "berries", "apples", "microgreens", "farm fresh", "organic", "vegetables", "veggies"] },
  { match: /bakehouse|bake/i, keywords: ["bakehouse", "bakery", "bread", "sourdough", "pastry", "pastries", "baked goods", "cookies"] },
  { match: /book/i, keywords: ["book", "books", "bookstore", "novels", "reading", "literature"] },
]

export function getVendorKeywords(vendor) {
  if (!vendor) return []
  const keywords = new Set()

  const type = String(vendor.type || vendor.category || "").toLowerCase()
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (type.includes(cat) || cat.includes(type)) {
      kws.forEach((kw) => keywords.add(kw))
    }
  }

  const name = String(vendor.name || "").toLowerCase()
  for (const rule of SPECIALTY_RULES) {
    if (rule.match.test(name) || rule.match.test(type)) {
      rule.keywords.forEach((kw) => keywords.add(kw))
    }
  }

  if (Array.isArray(vendor.keywords)) {
    vendor.keywords.forEach((k) => {
      const clean = String(k).toLowerCase().trim()
      if (clean) keywords.add(clean)
    })
  } else if (typeof vendor.keywords === "string" && vendor.keywords.trim()) {
    vendor.keywords.split(",").forEach((k) => {
      const clean = k.toLowerCase().trim()
      if (clean) keywords.add(clean)
    })
  }

  if (Array.isArray(vendor.tags)) {
    vendor.tags.forEach((t) => {
      const clean = String(t).toLowerCase().trim()
      if (clean) keywords.add(clean)
    })
  } else if (typeof vendor.tags === "string" && vendor.tags.trim()) {
    vendor.tags.split(",").forEach((t) => {
      const clean = t.toLowerCase().trim()
      if (clean) keywords.add(clean)
    })
  }

  return Array.from(keywords)
}

export function matchesVendorSearch(vendor, query) {
  if (!query || !query.trim()) return true
  if (!vendor) return false

  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true

  const searchableFields = [
    vendor.name,
    vendor.type,
    vendor.category,
    vendor.city,
    vendor.address,
    vendor.locationName,
    vendor.description,
    ...(Array.isArray(vendor.keywords) ? vendor.keywords : []),
    ...(Array.isArray(vendor.tags) ? vendor.tags : []),
    ...getVendorKeywords(vendor),
  ]
    .filter(Boolean)
    .map((f) => String(f).toLowerCase())
    .join(" ")

  return terms.every((term) => searchableFields.includes(term))
}
