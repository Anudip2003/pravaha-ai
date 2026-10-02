// src/api/classifier.js
// Keyword-based category classifier.
// This runs entirely in the browser (no API call needed).
// In Step 4 we'll upgrade this to an ML model on the backend.

const RULES = [
  { category: "Food & Dining",    keywords: ["swiggy", "zomato", "restaurant", "cafe", "coffee", "lunch", "dinner", "breakfast", "food", "pizza", "burger", "biryani", "hotel", "dhaba", "tea", "chai"] },
  { category: "Groceries",        keywords: ["blinkit", "zepto", "instamart", "bigbasket", "grofers", "dmart", "grocery", "vegetables", "fruits", "milk", "ration", "supermarket"] },
  { category: "Transport",        keywords: ["uber", "ola", "rapido", "auto", "rickshaw", "cab", "bus", "metro", "train", "petrol", "diesel", "fuel", "parking", "irctc", "flight", "airfare"] },
  { category: "Shopping",         keywords: ["amazon", "flipkart", "meesho", "myntra", "ajio", "nykaa", "clothes", "shirt", "shoes", "fashion", "purchase", "mall"] },
  { category: "Entertainment",    keywords: ["netflix", "prime", "hotstar", "spotify", "youtube", "movie", "cinema", "pvr", "inox", "game", "concert", "event", "bookmyshow"] },
  { category: "Health",           keywords: ["pharmacy", "medicine", "hospital", "doctor", "clinic", "apollo", "medplus", "diagnostic", "lab", "health", "gym", "fitness"] },
  { category: "Utilities",        keywords: ["electricity", "water", "gas", "internet", "wifi", "broadband", "jio", "airtel", "vi", "bsnl", "recharge", "bill", "maintenance"] },
  { category: "Rent & Housing",   keywords: ["rent", "pg", "hostel", "flat", "society", "deposit", "landlord", "maintenance"] },
  { category: "Travel",           keywords: ["travel", "trip", "hotel booking", "airbnb", "holiday", "booking", "resort", "vacation"] },
  { category: "Savings & Investments", keywords: ["mutual fund", "sip", "stock", "zerodha", "groww", "fd", "ppf", "nps", "gold", "crypto", "investment"] },
];

export const DEFAULT_CATEGORIES = [
  "Food & Dining",
  "Groceries",
  "Transport",
  "Shopping",
  "Entertainment",
  "Health",
  "Utilities",
  "Rent & Housing",
  "Travel",
  "Savings & Investments",
  "Other",
];

const CUSTOM_CATEGORY_STORAGE_KEY = "finance_custom_categories";

export function getCustomCategories() {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map(value => String(value).trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

export function getAllCategories() {
  return [...new Set([...DEFAULT_CATEGORIES, ...getCustomCategories()])];
}

export function addCustomCategory(categoryName) {
  const value = String(categoryName ?? "").trim();
  if (!value) return null;

  const lowerValue = value.toLowerCase();
  if (getAllCategories().some(category => category.toLowerCase() === lowerValue)) {
    return null;
  }

  const next = [...getCustomCategories(), value];
  localStorage.setItem(CUSTOM_CATEGORY_STORAGE_KEY, JSON.stringify(next));
  return value;
}

export function removeCustomCategory(categoryName) {
  const value = String(categoryName ?? "").trim();
  if (!value) return false;
  if (DEFAULT_CATEGORIES.some(category => category.toLowerCase() === value.toLowerCase())) {
    return false;
  }

  const next = getCustomCategories().filter(category => category.toLowerCase() !== value.toLowerCase());
  localStorage.setItem(CUSTOM_CATEGORY_STORAGE_KEY, JSON.stringify(next));
  return true;
}

export function classifyExpense(description) {
  const lower = description.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.category;
    }
  }
  return "Other";
}

export const ALL_CATEGORIES = getAllCategories();
