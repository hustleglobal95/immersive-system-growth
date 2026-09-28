export type ZensiaMenuCategoryId =
  | "hot-beverages"
  | "espresso-drinks"
  | "cold-beverages"
  | "breads"
  | "empanadas"
  | "specialty-desserts";

export type ZensiaMenuCategory = {
  id: ZensiaMenuCategoryId;
  label: string;
  shortLabel: string;
  tone: string;
  accent: string;
  ink: string;
  kind: "hot" | "espresso" | "cold" | "bread" | "empanada" | "dessert";
};

export type ZensiaMenuItem = {
  id: string;
  name: string;
  category: ZensiaMenuCategoryId;
  variants?: readonly string[];
};

export const ZENSIA_MENU_CATEGORIES: readonly ZensiaMenuCategory[] = [
  { id: "hot-beverages", label: "Hot Beverages", shortLabel: "Hot", tone: "#34221b", accent: "#e2b673", ink: "#f6eddf", kind: "hot" },
  { id: "espresso-drinks", label: "Espresso Drinks", shortLabel: "Espresso", tone: "#211914", accent: "#c98255", ink: "#f3e8da", kind: "espresso" },
  { id: "cold-beverages", label: "Cold Beverages", shortLabel: "Cold", tone: "#20302d", accent: "#96c5b3", ink: "#edf4ef", kind: "cold" },
  { id: "breads", label: "Breads", shortLabel: "Breads", tone: "#70462d", accent: "#edc77e", ink: "#fff1db", kind: "bread" },
  { id: "empanadas", label: "Empanadas", shortLabel: "Empanadas", tone: "#8a4d28", accent: "#f0b768", ink: "#fff0dc", kind: "empanada" },
  { id: "specialty-desserts", label: "Specialty Desserts", shortLabel: "Desserts", tone: "#51313a", accent: "#e9a7af", ink: "#f8e9ea", kind: "dessert" },
] as const;

export const ZENSIA_MENU_ITEMS: readonly ZensiaMenuItem[] = [
  { id: "brew-regular", name: "Brew (Regular)", category: "hot-beverages" },
  { id: "mocha", name: "Mocha", category: "hot-beverages" },
  { id: "cappuccino", name: "Cappuccino", category: "hot-beverages" },
  { id: "latte", name: "Latte", category: "hot-beverages" },
  { id: "chai-latte", name: "Chai Latte", category: "hot-beverages" },
  { id: "herbal-infusions-tea", name: "Herbal Infusions (Tea)", category: "hot-beverages" },
  { id: "dried-fruit-infusions-tea", name: "Dried Fruit Infusions (Tea)", category: "hot-beverages" },

  { id: "regular-espresso", name: "Regular Espresso", category: "espresso-drinks" },
  { id: "double-espresso", name: "Double Espresso", category: "espresso-drinks" },
  { id: "macchiato", name: "Macchiato", category: "espresso-drinks" },
  { id: "cortado", name: "Cortado", category: "espresso-drinks" },
  { id: "flat-white", name: "Flat White", category: "espresso-drinks" },

  { id: "cold-brew", name: "Cold Brew", category: "cold-beverages" },
  { id: "nitro", name: "Nitro", category: "cold-beverages" },
  { id: "frappe-coffee", name: "Frappe Coffee", category: "cold-beverages" },
  { id: "iced-latte", name: "Iced Latte", category: "cold-beverages" },
  { id: "iced-chai-latte", name: "Iced Chai Latte", category: "cold-beverages" },
  { id: "iced-matcha-sweet", name: "Iced Matcha (Sweet)", category: "cold-beverages" },
  { id: "iced-matcha-unsweet", name: "Iced Matcha (Unsweet)", category: "cold-beverages" },
  { id: "mocha-frappe", name: "Mocha Frappe", category: "cold-beverages" },
  { id: "chai-latte-frappe", name: "Chai Latte Frappe", category: "cold-beverages" },
  { id: "iced-tea", name: "Iced Tea", category: "cold-beverages" },
  { id: "affogato-coffee", name: "Affogato Coffee", category: "cold-beverages" },
  {
    id: "fruit-slush-juice",
    name: "Fruit Slush/Juice",
    category: "cold-beverages",
    variants: ["Lulo", "Passion Fruit", "Black Berry", "Banana P.", "Mango", "Guanabana", "Coconut Lemonade"],
  },
  {
    id: "zen-energy",
    name: "ZenEnergy",
    category: "cold-beverages",
    variants: ["Dragon Fruit", "Blue Berry", "Purple", "Starfruit"],
  },

  { id: "almojabana", name: "Almojabana (Corn Meal Cheese Bread)", category: "breads" },
  { id: "pandeyuca", name: "Pandeyuca (Cassava Bread)", category: "breads" },
  { id: "pandebono-cheese", name: "Pandebonos (Colombian Cheese Bread)", category: "breads" },
  { id: "pandebono-guava-cheese", name: "Pandebonos (Guava- Cheese Bread)", category: "breads" },
  { id: "cheese-sticks", name: "Cheese Sticks", category: "breads" },
  { id: "corn-sweet-arepa", name: "Corn Sweet Arepa", category: "breads" },

  { id: "wheat-beef", name: "Wheat Beef", category: "empanadas" },
  { id: "wheat-ham-cheese", name: "Wheat Ham & Cheese", category: "empanadas" },
  { id: "corn-beef", name: "Corn Beef", category: "empanadas" },
  { id: "corn-cheese", name: "Corn Cheese", category: "empanadas" },
  { id: "corn-ham-cheese", name: "Corn Ham & Cheese", category: "empanadas" },
  { id: "corn-spinach", name: "Corn Spinach", category: "empanadas" },

  { id: "milhojas", name: "Milhojas (Napoleon)", category: "specialty-desserts" },
  { id: "beso-de-angel", name: "Beso de Angel (Flan)", category: "specialty-desserts" },
  { id: "dubai-chocolate-brownie", name: "Dubai Chocolate Brownie", category: "specialty-desserts" },
  { id: "carrot-cake", name: "Carrot Cake", category: "specialty-desserts" },
  { id: "lemon-cake", name: "Lemon Cake", category: "specialty-desserts" },
  { id: "pumpkin-cake", name: "Pumpkin Cake", category: "specialty-desserts" },
  { id: "passion-fruit-delight", name: "Passion Fruit Delight", category: "specialty-desserts" },
] as const;

export function menuItemsForCategory(category: ZensiaMenuCategoryId) {
  return ZENSIA_MENU_ITEMS.filter((item) => item.category === category);
}

export const ZENSIA_MENU_CORE_ITEM_COUNT = ZENSIA_MENU_ITEMS.length;
export const ZENSIA_MENU_VARIANT_COUNT = ZENSIA_MENU_ITEMS.reduce(
  (total, item) => total + (item.variants?.length ?? 0),
  0,
);
