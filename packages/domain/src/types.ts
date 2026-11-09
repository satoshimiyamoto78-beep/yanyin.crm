export const LANGS = ["en", "ru", "vi", "ko", "zh"] as const;
export type Lang = (typeof LANGS)[number];

/** Localized text. English is the fallback language. */
export type I18nText = Partial<Record<Lang, string>>;

export type Currency = "VND" | "USD" | "UZS" | "TJS";

/** Integer amount in the currency's smallest practical unit (VND has none). */
export type Money = { amount: number; currency: Currency };

export type ItemStatus = "confirmed" | "suggested";

export type CategoryRole =
  | "soup"
  | "salad"
  | "starter"
  | "main"
  | "grill"
  | "side"
  | "pasta"
  | "pastry"
  | "dessert"
  | "drink"
  | "hot_drink"
  | "alcohol"
  | "hookah"
  | "snack";

export type Variant = { id: string; name: I18nText; price: number };

export type ModifierOption = { id: string; name: I18nText; price: number };

export type ModifierGroup = {
  id: string;
  name: I18nText;
  required: boolean;
  /** Maximum options a guest may pick; 1 means single choice. */
  max: number;
  /** "scale": options are ordered steps picked with a slider (e.g. hookah strength 1–10). */
  display: "chips" | "scale";
  /** Option preselected when the guest opens the item (also used by quick add). */
  defaultOptionId?: string;
  options: ModifierOption[];
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: I18nText;
  /** Short description shown on cards (draft until the venue confirms). */
  description?: I18nText;
  /** Base price; when variants exist it equals the cheapest variant. */
  price: number;
  variants: Variant[];
  modifierGroups: ModifierGroup[];
  tags: string[];
  status: ItemStatus;
  /** Public URL of the dish photo (real photo, AI-enhanced per ADR-007). */
  photo?: string;
  note?: string;
};

export type ServiceCall = { id: string; name: I18nText };

export type Category = {
  id: string;
  name: I18nText;
  group?: string;
  role: CategoryRole;
  status: ItemStatus;
  ageRestricted: boolean;
  items: MenuItem[];
  serviceCalls: ServiceCall[];
};

export type VenueType = "restaurant" | "shisha_lounge" | "cafe" | "bar";

export type Venue = {
  slug: string;
  name: string;
  type: VenueType;
  city: string;
  country: string;
  currency: Currency;
  timezone: string;
  languages: Lang[];
  ageRestricted: boolean;
};

export type Menu = { venue: Venue; categories: Category[] };
