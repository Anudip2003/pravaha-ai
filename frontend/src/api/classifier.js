// src/api/classifier.js
// Keyword-based category classifier.
// This runs entirely in the browser (no API call needed).
// In Step 4 we'll upgrade this to an ML model on the backend.

const RULES = [
  { category: "Food & Dining",    keywords: ["swiggy", "zomato", "restaurant", "cafe", "coffee", "lunch", "dinner", "breakfast", "food", "pizza", "burger", "biryani", "hotel", "dhaba", "tea", "chai"] },
  { category: "Transport",        keywords: ["uber", "ola", "rapido", "auto", "rickshaw", "cab", "bus", "metro", "train", "petrol", "diesel", "fuel", "parking", "irctc", "flight", "airfare"] },
  { category: "Groceries",        keywords: ["blinkit", "zepto", "instamart", "bigbasket", "grofers", "dmart", "grocery", "vegetables", "fruits", "milk", "ration", "supermarket"] },
  { category: "Shopping",         keywords: ["amazon", "flipkart", "meesho", "myntra", "ajio", "nykaa", "clothes", "shirt", "shoes", "fashion", "purchase", "mall"] },
  { category: "Entertainment",    keywords: ["netflix", "prime", "hotstar", "spotify", "youtube", "movie", "cinema", "pvr", "inox", "game", "concert", "event", "bookmyshow"] },
  { category: "Health",           keywords: ["pharmacy", "medicine", "hospital", "doctor", "clinic", "apollo", "medplus", "diagnostic", "lab", "health", "gym", "fitness"] },
  { category: "Education",        keywords: ["udemy", "coursera", "book", "course", "tuition", "college", "fees", "exam", "coaching", "study", "school"] },
  { category: "Utilities",        keywords: ["electricity", "water", "gas", "internet", "wifi", "broadband", "jio", "airtel", "vi", "bsnl", "recharge", "bill", "maintenance"] },
  { category: "Rent & Housing",   keywords: ["rent", "pg", "hostel", "flat", "society", "deposit", "landlord"] },
  { category: "Investments",      keywords: ["mutual fund", "sip", "stock", "zerodha", "groww", "fd", "ppf", "nps", "gold", "crypto"] },
];

export function classifyExpense(description) {
  const lower = description.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.category;
    }
  }
  return "Other";
}

export const ALL_CATEGORIES = [
  "Food & Dining", "Transport", "Groceries", "Shopping",
  "Entertainment", "Health", "Education", "Utilities",
  "Rent & Housing", "Investments", "Other",
];
