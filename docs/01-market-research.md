# Исследование рынка: HoReCa, SaaS, Центральная Азия

> Дата: 8 ноября 2026. Источники в основном вендорские (маркетинг, блоги), поэтому цифры ориентировочные. Всё, что касается законов и фискализации, перед разработкой проверяем по официальным источникам (налоговые комитеты, ОФД, банки).

## 1. Главные выводы

1. **На рынке Центральной Азии правят «скучные» системы.** iiko, r_keeper, Poster, Jowi, Syrve, Clopos закрывают кассу, склад и отчёты. Ни у кого нет игровой мотивации персонала и игрового заказа для гостей как ядра продукта. Это и есть наша ниша.
2. **Без фискализации не продать.** И в Узбекистане, и в Таджикистане продажа без онлайн-кассы, передающей чеки через оператора фискальных данных (ОФД), карается штрафами. Это обязательное требование для MVP, если мы заменяем кассу, а не работаем рядом с ней.
3. **Локальные платежи важнее Stripe.** Узбекистан: Payme, Click, Uzum, Uzcard/Humo. Таджикистан: Корти Милли, Alif, DC и единый национальный QR-стандарт. Stripe подходит только для зарубежных клиентов и для оплаты подписки самой платформы.
4. **Деньги в SaaS для ресторанов делают на платежах и расширении.** У Toast чистое удержание выручки (NRR) по SaaS 109% за 2025 год, а доход с платежей идёт поверх подписки. Отток у малого бизнеса высокий, около 25–40% в год, в основном из-за закрытия заведений.
5. **Геймификация работает, но доказательства слабые.** Есть крупные внедрения (франчайзи Applebee's: 7 000 сотрудников, 140 ресторанов), но цифры эффекта в основном от вендоров. Наша задача: встроить измерение эффекта в продукт с первого дня, чтобы продавать на собственных данных.

## 2. Конкуренты

### Центральная Азия и СНГ

| Система | Происхождение | Сильные стороны | Слабые стороны / наш шанс |
|---|---|---|---|
| **iiko / Syrve** | Россия / международная версия | Самая глубокая сеть партнёров в Узбекистане (Zetta, Soft24 с 2015 года), сильная аналитика, сети | Дорого, сложно, внедрение через интегратора, устаревший UX |
| **r_keeper** (UCS) | Россия | Дилеры в Узбекистане, Таджикистане, Казахстане, Кыргызстане; надёжная касса | Тяжёлая, ориентирована на железо, нет «фана» |
| **Poster** | Украина, облачная | Простая, дешёвая, облако; заявляет облачную фискализацию для Таджикистана; есть интеграция с Multikassa в Узбекистане | Слабая поддержка узбекской фискализации (по данным вендорского сравнения), простая аналитика |
| **Jowi** | Узбекистан | Локальный игрок, от ~$30 в месяц | Мало публичной информации, базовый функционал |
| **Neon Alisa** | Узбекистан | Сильная локальная фискализация | Локальный, без экосистемы |
| **Clopos** | Азербайджан, офис в Ташкенте | POS, KDS, QR-меню, приложение менеджера, сети | Классический POS, без геймификации |
| **Delever** | Узбекистан | Онлайн-продажи и доставка, интеграция с iiko, R-Keeper, Poster, Jowi, Syrve; заявляет 500+ ресторанов | Не POS, а слой доставки: **партнёр, а не конкурент** |
| **Paloma365, RAOS, E-POS, ERA** | Узбекистан | Кассовое ПО и виртуальные кассы | Узкая касса: **потенциальные партнёры по фискализации** |

### Мировые ориентиры (для продукта и цен)

| Система | Цены (2026, по сравнительным обзорам) | Чему учимся |
|---|---|---|
| **Toast** | $0–$69/мес за ПО, бандл от $110; платежи от 2,49% + $0,15; контракт 2 года | Самый глубокий ресторанный функционал; модель «софт + платежи»; NRR 109% |
| **Square for Restaurants** | $0–$149/мес за локацию | Самый низкий порог входа и самое простое обучение |
| **Lightspeed Restaurant** | $69–$399/мес за локацию, 4 тарифа | Сети и мультилокации |
| **Foodics** (MENA) | — | Встроенная геймификация; заявляет +42% удержания персонала и +28% апсейла (цифры вендора) |
| **HME ZOOM Nitro** | — | Лидерборды для drive-thru: геймификация по скорости |

### Позиционирование yanyin

| | Классический POS (iiko, r_keeper) | Простой облачный POS (Poster, Jowi) | **yanyin.crm** |
|---|---|---|---|
| Касса и склад | ✅ глубоко | ✅ базово | ✅ глубоко, с техкартами |
| Гостевое QR-меню и заказ | дополнительно | дополнительно | ✅ ядро |
| Игры для гостей | ❌ | ❌ | ✅ Food Roulette, Mystery Dish, Taste Quiz |
| Квесты, XP, бонусы персонала | ❌ | ❌ | ✅ ядро, считаются автоматически по продажам |
| AI-ассистент для всех ролей | ❌ | ❌ | ✅ Yan |
| Современный UX, мобильный | слабо | средне | ✅ уровень Linear / Stripe |
| Внедрение | через интегратора, недели | сам, дни | сам за один день: импорт меню и шаблоны |

## 3. Фискализация и законы

### Узбекистан
- Онлайн-кассы с передачей чеков в реальном времени в Государственный налоговый комитет обязательны для розницы и B2C. Чеки доступны в my.soliq.uz.
- Позиции в чеке нужно сопоставлять с кодами **ИКПУ** (справочник tasnif.soliq.uz).
- Прямая отправка в ОФД требует подписи чека **PKCS#7** сертификатом налогоплательщика, поэтому большинство интеграторов работают через шлюз виртуальной кассы (Multikassa, E-POS, ERA, RAOS), который подписывает чек на своей стороне. **Рекомендация:** интегрироваться с 1–2 провайдерами виртуальной кассы, а не сертифицировать свою кассу.
- Маркированные товары (алкоголь, табак) передаются через ОФД в национальную систему маркировки. Это важно для баров.
- Для ресторанов действует кешбэк НДС (с 2024 года), а в 2026 году правительство упрощает возврат: 40% независимо от безналичной оплаты. Налоговый комитет и ТПП в 2026 году усилили контроль за общепитом. **Для нас это продающий аргумент:** «прозрачная касса, которая помогает получить кешбэк НДС».

### Таджикистан
- **Постановление Правительства № 638 от 22.11.2025** вводит новый порядок применения ККТ: онлайн-кассы, виртуальные кассы и учётное ПО обмениваются данными через оператора фискальных данных. По одному источнику, ОФД — ООО «Технология Групп».
- **Закон № 2209 от 17.12.2025:** штрафы для юрлиц за нарушение правил ККТ 250–300 расчётных показателей, за приём наличных без кассы 350–400.
- В чеке обязательны: ИНН, серийный номер кассы, номер чека, дата и время.
- НДС 14% при безналичных операциях (с 2024 года). Рестораны с 2016 года обязаны принимать карты.
- **Рекомендация:** до разработки кассового модуля получить у ОФД список требований и порядок сертификации ПО. Poster заявляет облачную фискализацию для Таджикистана, то есть путь существует.

## 4. Платежи

| Страна | Провайдеры | Как интегрироваться |
|---|---|---|
| Узбекистан | **Payme, Click, Uzum, Paynet, Atmos**, карты Uzcard/Humo | Click: SHOP API (оплата в приложении Click) или Merchant API (на нашем сайте). Uzum: ссылка Biller (service ID, order ID, сумма, redirect) + вебхуки с basic auth. Payme: merchant gateway. Нужен договор с каждым провайдером до технической интеграции |
| Таджикистан | **Корти Милли, Alif (Alif Pay), DC**, Visa/Mastercard | Единый национальный QR-стандарт: гость платит любым участвующим приложением. Мерчант должен быть юрлицом в Таджикистане, нужен ИНН |
| Подписка платформы | Stripe (для иностранных клиентов), локальные провайдеры | — |

**Архитектурный вывод:** нужен слой `payments` с адаптерами под каждого провайдера (единый интерфейс: create, webhook, refund, status). Счёт заведения создаётся в нашей системе, а провайдер только проводит оплату.

## 5. Тренды HoReCa-технологий (2026)

- **QR-меню стало стандартом.** 63% ресторанов США планируют вкладываться в QR для меню, заказа и оплаты.
- **AI пока на старте.** По данным National Restaurant Association, 26% операторов в США используют AI-инструменты, и только 6% применяют AI для приёма заказов. Окно возможностей открыто.
- **Запрос на всё в одном.** Владельцы хотят, чтобы POS, платежи, онлайн-заказ, отчёты и гостевые инструменты работали в одной системе.
- **Рынок POS-терминалов** оценивается в ~$62,7 млрд в 2026 году с ростом ~9,5% в год (один источник, не подтверждён).

## 6. SaaS-метрики и бенчмарки

| Метрика | Ориентир | Источник / уверенность |
|---|---|---|
| SaaS NRR | 109% (Toast, 2025) | Отчётность Toast, надёжно |
| Валовая маржа SaaS | 80% (Toast, Q4 2025) | Надёжно |
| Take rate с платежей | 0,48% (Toast) | Надёжно |
| Годовой отток SMB-ресторанов | 25–40% | Вендорские блоги, низкая уверенность |
| Месячный отток | 2,5–3% | Интервью, анекдотично |

**Выводы для бизнес-модели:**
1. Бесплатный тариф (только цифровое меню) как вход в воронку.
2. Подписка за локацию: Starter → Pro → Ultimate.
3. Доход с платежей поверх подписки, как главный рычаг выручки.
4. Расширение внутри клиента: новые филиалы, AI-кредиты, white-label.
5. Отток в основном из-за закрытия заведений, поэтому выгодно идти в сети и франшизы, а не только в одиночные кафе.

## 7. Геймификация персонала: что известно

- **Франчайзи Applebee's:** ~7 000 сотрудников в 140 ресторанах, ~1 800 входов в день. Механики: соревнование, признание, награды.
- **Tealive (Gametize):** обучение через квизы и фото-челленджи, 2 232 активных игрока, 135 000+ выполненных заданий.
- **CARA (UPcell):** очки обмениваются на реальные подарочные карты.
- **Pilla:** командные очки вместо индивидуальных из-за высокой текучки (3 очка за вовремя, 1 за опоздание, 0 за пропуск).
- **Foodics (вендор):** +42% удержания персонала, +28% апсейла, NPS с 42 до 67.

**Выводы для yanyin.quest:**
- Награды должны быть **реальными** (деньги, выходной, лучшая смена), а не только виртуальными бейджами.
- Нужны **командные** квесты, а не только личные: при высокой текучке они устойчивее.
- Лидерборды можно отключать, чтобы избежать токсичной конкуренции.
- Прогресс считается **только по данным системы** (продажи, отзывы), без ручного ввода, иначе будут накрутки.
- **Встроить аналитику эффекта:** апсейл, текучесть и средний чек до и после включения квестов. Это будет наш главный кейс для продаж.

## 8. Открытые вопросы для проверки

- [ ] Официальная документация API soliq.uz и условия провайдеров виртуальных касс (Multikassa, E-POS, ERA)
- [ ] Порядок сертификации ПО у ОФД Таджикистана (Постановление № 638)
- [ ] Merchant-документация Alif, DC и Корти Милли; спецификация национального QR
- [ ] Реальные цены iiko, Jowi, Clopos в Ташкенте и Душанбе (запросить как клиент)
- [ ] Интервью с 10–15 владельцами ресторанов в Душанбе и Ташкенте (см. `docs/04-decisions.md`)

## Источники

**Конкуренты Центральной Азии**
- [iiko vs Neon Alisa vs Poster: POS comparison for Uzbekistan (Zoomda)](https://zoomda.uz/en/knowledge-base/iiko-vs-jowi-vs-poster)
- [Delever: restaurant delivery platform](https://www.delever.uz/en/solutions/restaurant)
- [BizAtlas: restaurants and cafés automation in Uzbekistan](https://bizatlas.uz/en/industries/restaurants/)
- [BizAtlas: HoReCa automation in Uzbekistan](https://bizatlas.uz/en/industries/horeca/)
- [Soft24: iiko in Uzbekistan](https://soft24.uz/en/restoran/)
- [Zetta: iiko in Uzbekistan](https://zetta.uz/en/)
- [r_keeper](https://www.rkeeper-mm.com/en)
- [Picktech: системы управления рестораном 2026](https://picktech.ru/catalog/restaurant-management-software/)
- [Clopos pricing](https://clopos.com/pricing) · [Clopos POS](https://clopos.com/en/restaurant-pos-system)
- [Syrve on GetApp](https://www.getapp.com/all-software/a/syrve/) · [Syrve all-in-one](https://lets.syrve.com/syrve-all-in-one-restaurant-management-system)

**Мировые POS**
- [NerdWallet: Toast vs Square](https://nerdwallet.com/article/small-business/toast-vs-square)
- [Expert Market: Square vs Toast vs Lightspeed](https://www.expertmarket.com/pos/square-vs-toast-vs-lightspeed)
- [UpMenu: best restaurant POS 2026](https://www.upmenu.com/blog/restaurant-pos-system/)
- [DineOpen: Toast vs Square vs Lightspeed](https://www.dineopen.com/vs/toast-vs-square-vs-lightspeed)
- [Costbench: Toast vs Lightspeed pricing](https://costbench.com/compare/lightspeed-restaurant-vs-toast-pos/)

**Фискализация и налоги**
- [Multikassa + Poster integration](https://joinposter.com/en/applications/multikassa)
- [Poster: fiscalization in Tajikistan](https://joinposter.com/en/applications/fiscal-tj)
- [E-POS Systems: virtual cash register](http://epos.uz/en)
- [ERA: kassa](https://pos.era.uz/en/kassa)
- [RAOS](https://raos.uz/)
- [Uzbekistan e-invoicing 2026](https://www.e-invoice.app/country/UZ) · [Tajikistan e-invoicing](https://www.e-invoice.app/country/TJ)
- [101digital: Uzbekistan e-commerce tax guide 2026](https://101digital.uz/en/blog/uzbekistan-ecommerce-tax-legal-guide-2026/)
- [kun.uz: Tax Committee and Chamber of Commerce vs catering tax fraud (2026)](https://kun.uz/en/news/2026/04/24/chamber-of-commerce-and-tax-committee-join-forces-to-curb-catering-tax-fraud)
- [kun.uz: VAT refunds for restaurants, 40% (2026)](https://kun.uz/en/news/2026/05/07/govt-to-simplify-vat-refunds-for-restaurants-allow-40-reimbursement-regardless-of-cashless-payments)
- [kun.uz: VAT cashback for HoReCa (2024)](https://live.kun.uz/en/news/2024/08/20/government-introduces-vat-cashback-and-documentation-free-procurement-for-restaurants-cafes-and-hotels)
- [Daryo: Tajikistan VAT 14% for non-cash](https://daryo.uz/en/2024/01/07/tajikistans-vat-rate-drops-to-14-for-non-cash-transactions-from-january-1-2024)
- [Asia-Plus: restaurants forced to accept cards](https://asiaplus.news/en/2016/07/05/retailers-and-restaurants-in-tajikistan-forced-to-accept-payment-by-bank-card/)
- [Asia-Plus: fines for incomplete receipts](https://asiaplus.news/?p=398415)
- [Eurasianet: bank card fines](https://eurasianet.org/tajikistan-retailers-face-giant-bank-card-fines)

**Платежи**
- [onedev.uz: accepting payments in Uzbekistan (Click, Payme, Uzum)](https://onedev.uz/en/blog/how-to-accept-online-payments-in-uzbekistan-click-payme-uzum-and-cards)
- [PayTechUZ (PyPI)](https://pypi.org/project/paytechuz/)
- [pay-uz (GitHub)](https://github.com/shaxzodbek-uzb/pay-uz)
- [sayt.uz: Uzcard/Humo integration](https://sayt.uz/en/blog/uzcard-humo-tolov-integratsiya)
- [Alif cards (Korti Milli)](https://alif.tj/en/cards) · [Alif Bank](https://en.wikipedia.org/wiki/Alif_Bank)
- [PayAtlas: accepting payments in Tajikistan](https://payatlas.com/countries/tajikistan-tj)
- [CPT: Tajikistan fintech (2026)](https://www.cptsecure.com/2026/08/10/tajikistan-can-fintech-digitalise-a-remittance-economy/)

**Тренды и метрики**
- [Duck-Hub: restaurant technology statistics 2026](https://www.duck-hub.com/blog/restaurant-technology-statistics)
- [Servme: 12 restaurant tech trends 2026](https://www.servmeco.com/resources/restaurant-technology-trends)
- [StartUs Insights: restaurant industry trends 2026](https://www.startus-insights.com/innovators-guide/emerging-restaurant-industry-trends)
- [Toast Q4 2025 earnings call](https://www.fool.com/earnings/call-transcripts/2026/02/12/toast-tost-q4-2025-earnings-call-transcript)
- [Clouded Judgement: Toast S-1 benchmarks](https://cloudedjudgement.substack.com/p/toast-benchmarking-the-s-1-data)
- [SaaS Hero: restaurant tech customer acquisition 2026](https://www.saashero.net/strategy/restaurant-tech-customer-acquisition-2026/)

**Геймификация**
- [CIO: how Applebee's uses gamification](https://www.cio.com/article/242257/how-applebees-uses-gamification-to-retain-staff-boost-sales.html)
- [Foodics: gamification in restaurants](https://www.foodics.com/gamification-in-restaurants-boost-revenue/)
- [Gametize: Tealive case study](https://www.casestudies.com/company/gametize/case-study/using-gametize-tealive-made-employee-training-an-engaging-experience)
- [PayFacto: gamification at CARA](https://blog.payfacto.com/blog/gamification-improves-restaurant-sales-at-cara)
- [Pilla: how gamification works](https://yourpilla.com/how-it-works)
- [HME ZOOM Nitro](https://qsr.hme.com/zoom/gamification)
- [FSR Magazine: gamify work](https://www.fsrmagazine.com/expert-takes/how-gamify-work-improve-restaurant-performance)

**Multi-tenant SaaS**
- [MakerKit: Supabase RLS best practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [DEV: PostgreSQL RLS for multi-tenant SaaS](https://dev.to/endurance-softwares/postgresql-row-level-security-for-multi-tenant-saas-3gc1)
- [Next.js + Supabase multi-tenant architecture](https://www.iloveblogs.blog/guides/nextjs-supabase-multi-tenant-saas-architecture)
