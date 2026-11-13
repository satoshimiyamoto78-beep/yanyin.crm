import type { Venue } from "@yanyin/domain";

/**
 * What a venue contributes to the guest app. The look itself is one yanyin
 * system (white, black, one blue) for every venue (docs/07-design-audit.md);
 * venues bring their name, mark, photos and copy.
 */
export type VenueBrand = {
  mark: string;
  cuisine: Record<"en" | "ru" | "vi", string>;
  about: {
    bio: string;
    address: string;
    hours: string;
    closes: string;
    phone: string;
    wifi: { name: string; pass: string };
    payments: string[];
    features: Record<"en" | "ru" | "vi", string>[];
    mapsQuery: string;
  };
  /** Hero slides: a featured dish (needs a photo) or the Food Roulette card. */
  hero: (HeroDish | { kind: "roulette" })[];
  ageRestricted: boolean;
};

type L = Record<"en" | "ru" | "vi", string>;

/**
 * A hero card: a full-bleed photo, a kicker, the dish name, a two-line story,
 * three short facts and the price with one action.
 */
export type HeroDish = {
  kind: "dish";
  itemId: string;
  image: string;
  kicker: L;
  blurb: L;
  facts: L[];
  /** Action label; "Add" when omitted (builders say "Build"). */
  cta?: L;
};

export function venueBrand(venue: Venue): VenueBrand {
  if (venue.type === "shisha_lounge") {
    return {
      mark: "Z",
      cuisine: { en: "Hookah lounge & bar", ru: "Кальянная и бар", vi: "Shisha lounge & bar" },
      about: {
        bio: "Zabey Community is a hookah lounge and bar in Da Nang. Good drinks, good people, great time.",
        address: "Da Nang, Vietnam (address to confirm)",
        hours: "Daily 17:00 – 02:00 (to confirm)",
        closes: "02:00",
        phone: "+84 900 000 000",
        wifi: { name: "Zabey_Guest", pass: "chill2026" },
        payments: ["Cash", "Card", "VietQR", "MoMo"],
        features: [
          { en: "Hookah lounge", ru: "Кальянная", vi: "Shisha" },
          { en: "Cocktail bar", ru: "Коктейльный бар", vi: "Quầy cocktail" },
          { en: "Live sports", ru: "Спорт на экране", vi: "Thể thao trực tiếp" },
          { en: "Air conditioning", ru: "Кондиционер", vi: "Máy lạnh" },
        ],
        mapsQuery: "Zabey Community Da Nang",
      },
      hero: [
        {
          kind: "dish",
          itemId: "build-your-hookah",
          image: "/hero/zabey-hookah.webp",
          kicker: { en: "Zabey signature", ru: "Фирменный Zabey", vi: "Đặc trưng Zabey" },
          blurb: {
            en: "Light, medium or strong: pick the strength, a tobacco to match and up to three flavours.",
            ru: "Лёгкий, средний или крепкий: выберите крепость, табак под неё и до трёх вкусов.",
            vi: "Nhẹ, vừa hay mạnh: chọn độ mạnh, loại thuốc phù hợp và tối đa ba vị.",
          },
          facts: [
            { en: "10 tobaccos", ru: "10 табаков", vi: "10 loại thuốc" },
            { en: "Fresh coals", ru: "Свежие угли", vi: "Than mới" },
            { en: "~90 min", ru: "~90 мин", vi: "~90 phút" },
          ],
          cta: { en: "Build", ru: "Собрать", vi: "Tự chọn" },
        },
        { kind: "roulette" },
        {
          kind: "dish",
          itemId: "bbq-chicken",
          image: "/dishes/pizza/bbq-chicken.webp",
          kicker: { en: "New: pizza", ru: "Новинка: пицца", vi: "Mới: pizza" },
          blurb: {
            en: "Roast chicken, red onion and coriander under a BBQ drizzle. Or build your own.",
            ru: "Курица, красный лук и кинза с соусом барбекю. Или соберите свою.",
            vi: "Gà nướng, hành tím và ngò với sốt BBQ. Hoặc tự làm pizza.",
          },
          facts: [
            { en: "Halal", ru: "Халяль", vi: "Halal" },
            { en: "25–35 cm", ru: "25–35 см", vi: "25–35 cm" },
            { en: "20 min", ru: "20 мин", vi: "20 phút" },
          ],
          cta: { en: "Choose", ru: "Выбрать", vi: "Chọn" },
        },
      ],
      ageRestricted: true,
    };
  }
  return {
    mark: "S",
    cuisine: { en: "Central Asian kitchen", ru: "Среднеазиатская кухня", vi: "Ẩm thực Trung Á" },
    about: {
      bio: "Samarkand brings the Central Asian table to Da Nang: plov from the kazan, shashlik over charcoal, fresh tandoor bread and big plates made for sharing.",
      address: "Da Nang, Vietnam (address to confirm)",
      hours: "Daily 10:00 – 23:00 (to confirm)",
      closes: "23:00",
      phone: "+84 900 000 001",
      wifi: { name: "Samarkand_Guest", pass: "plov2026" },
      payments: ["Cash", "Card", "VietQR", "MoMo"],
      features: [
        { en: "Halal kitchen", ru: "Халяльная кухня", vi: "Bếp halal" },
        { en: "Charcoal grill", ru: "Мангал на углях", vi: "Nướng than hoa" },
        { en: "Family friendly", ru: "Можно с детьми", vi: "Thân thiện gia đình" },
        { en: "Big tables", ru: "Большие столы", vi: "Bàn lớn" },
      ],
      mapsQuery: "Samarkand restaurant Da Nang",
    },
    hero: [
      {
        kind: "dish",
        itemId: "lamb-lyulya-kebab",
        image: "/hero/samarkand-lyulya.webp",
        kicker: { en: "From the charcoal grill", ru: "С углей", vi: "Nướng than hoa" },
        blurb: {
          en: "Hand-minced lamb with herbs, grilled over charcoal, on warm lavash.",
          ru: "Рубленая баранина с зеленью, на углях, на тёплом лаваше с луком.",
          vi: "Thịt cừu băm tay nướng than, ăn kèm bánh lavash ấm và hành tím.",
        },
        facts: [
          { en: "Halal", ru: "Халяль", vi: "Halal" },
          { en: "2 skewers", ru: "2 шампура", vi: "2 xiên" },
          { en: "15 min", ru: "15 мин", vi: "15 phút" },
        ],
      },
      { kind: "roulette" },
      {
        kind: "dish",
        itemId: "fatir-shurpa",
        image: "/hero/samarkand-shurpa.webp",
        kicker: { en: "Chef's soup", ru: "Суп от шефа", vi: "Súp của bếp trưởng" },
        blurb: {
          en: "Lamb broth simmered for hours with potato, carrot and dill.",
          ru: "Томлёный бульон из баранины с картофелем, морковью и укропом.",
          vi: "Nước dùng cừu hầm lâu với khoai tây, cà rốt và thì là.",
        },
        facts: [
          { en: "Halal", ru: "Халяль", vi: "Halal" },
          { en: "450 ml", ru: "450 мл", vi: "450 ml" },
          { en: "Hearty", ru: "Сытно", vi: "No lâu" },
        ],
      },
    ],
    ageRestricted: false,
  };
}
