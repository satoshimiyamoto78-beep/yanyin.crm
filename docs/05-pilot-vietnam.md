# Пилот: Вьетнам, Дананг

> Дата: 8 ноября 2026. Первая страна запуска (ADR-009: страна подключается как модуль, Вьетнам становится первым «пакетом страны»).

## Пилотные заведения

| Заведение | Формат | Гости | Что важно для системы |
|---|---|---|---|
| **Samarkand** (Дананг) | Ресторан узбекской / центральноазиатской кухни | В основном иностранцы | Большие столы и общие блюда (плов, шашлык, салаты на стол), общий счёт и сплит, меню на нескольких языках с фото и объяснением блюд, Table Battle и Food Roulette |
| **Zabey** (Дананг) | Кальянный лаунж | В основном иностранцы | Кальян как позиция с модификаторами (табак, микс, крепость, чаша), кнопка «Поменять угли» (вызов кальянщика), сессии по времени, напитки и закуски, ночной режим интерфейса, подтверждение возраста 18+ |

**Данных пока нет:** меню, число столов и сотрудников, текущая касса и оборудование. Собираем их на онбординге (см. «Что нужно собрать»).

## Что это значит для продукта

### Языки гостевого меню
Гости иностранцы, поэтому мультиязычность нужна с первого дня: **en, ru, ko, zh, vi**. Корейские туристы составляют крупнейший поток в Дананге. Перевод делает AI при добавлении блюда (ADR-007), менеджер проверяет.

### Валюта
Цены в **VND**. Опционально гость видит примерную сумму в своей валюте (USD, RUB, KRW) с пометкой «≈».

### Фискализация (Вьетнам)
- **Decree 70/2025/ND-CP** (с 1 июня 2025 года): общепит, рестораны и отели, продающие напрямую потребителям, обязаны выдавать **электронные счета-фактуры, сформированные кассой (POS)**, с передачей в налоговую (GDT) в реальном времени. Требование распространяется и на иностранные компании, и на домохозяйства с выручкой от 1 млрд VND в год.
- **Штрафы:** Decree 310/2025/ND-CP, действует с 16.01.2026.
- **⚠️ Проверить:** по одному источнику, с 1 июля 2026 года действуют **Decree 254/2026/ND-CP и Circular 91/2026/TT-BTC**, которые заменили Decree 70 и Circular 32. Подтвердить по официальному тексту или у местного налогового консультанта.
- **Как подключаемся:** через лицензированного провайдера e-invoice (во Вьетнаме это компании вроде MISA, Viettel, VNPT, BKAV и др.), по той же схеме, что и в ADR-004. Список и API провайдеров уточнить.
- **Вопрос к заведениям:** какой у них сейчас провайдер e-invoice и какая форма бизнеса (компания или домохозяйство).

### Платежи (Вьетнам)
| Способ | Как подключаем |
|---|---|
| **VietQR (NAPAS)** | Динамический QR на сумму счёта; деньги идут прямо на счёт заведения. Главный способ во Вьетнаме |
| **MoMo, ZaloPay, VNPay** | Merchant API: создаём заказ и получаем ссылку или QR. У ZaloPay есть подробная документация по VietQR-заказам |
| **Карты Visa / Mastercard** | Банковский терминал; иностранцы платят в основном картой |
| **Наличные** | Обязательно, с учётом кассовой смены |

## Конкуренты во Вьетнаме
**KiotViet** (от ~270 000 VND в месяц за филиал), **Sapo FnB**, **iPOS**. Рынок ПО для ресторанов оценивается в ~$150 млн. Это классические кассы на вьетнамском языке, ориентированные на местных владельцев. Наше окно: **заведения для иностранцев и экспатов**, где нужны мультиязычность, AI, игры и современный UX.

## Что нужно собрать у пилотов (онбординг)
- [ ] Меню: фото бумажного меню или список позиций с ценами → AI-импорт
- [ ] Число столов и залов (план зала можно сфотографировать)
- [ ] Сотрудники: роли и количество
- [ ] Текущая касса и провайдер e-invoice
- [ ] **Оборудование:** марки и модели принтеров чеков, кухонных принтеров, денежного ящика, POS-терминала, банковского терминала, планшетов (фото наклеек с моделью)
- [ ] Через какие кошельки и банк принимают оплату (VietQR, MoMo…)
- [ ] Форма бизнеса и налоговый номер (для e-invoice)

## Источники
- [Comarch: Decree 70/2025](https://www.comarch.com/trade-and-services/data-management/legal-regulation-changes/vietnam-issues-decree-70-2025-introducing-key-reforms-to-electronic-invoicing/)
- [Vietnam Briefing: Decree 70 amendments](https://www.vietnam-briefing.com/news/decree-70-key-amendments-to-invoice-regulations-in-vietnam.html/)
- [Vietnam Briefing: e-invoice compliance](https://www.vietnam-briefing.com/news/e-invoice-compliance-in-vietnam-regulations-requirements-and-best-practices.html)
- [Viet An Law: e-invoices from cash registers](https://vietanlaw.com/e-invoices-from-cash-registers-in-vietnam-from-2025/)
- [Viettonkin: POS e-invoice checklist](https://viettonkinconsulting.com/accounting-and-finance/vietnam-pos-e-invoice-compliance-checklist/)
- [Invoice Data Extraction: cash register e-invoice requirements (Decree 254/2026)](https://invoicedataextraction.com/blog/vietnam-cash-register-e-invoice-requirements)
- [Decree 70/2025 (PDF)](https://apolatlegal.com/wp-content/uploads/2025/06/Decree-70_2025_ND-CP.pdf)
- [ZaloPay: VietQR / EMVCo QR docs](https://docs.zalopay.vn/docs/guides/payment-acceptance/zalopay-emvco-qr/intro)
- [TransFi: payments in Vietnam](https://www.transfi.com/blog/how-to-accept-payments-in-vietnam-bank-transfer-wallets-and-vietqr)
- [Antom: popular payment methods in Vietnam](https://knowledge.antom.com/most-popular-payment-methods-in-vietnam)
- [Klikit: Vietnam restaurant POS guide](https://klikit.io/en/learn/vietnam-restaurant-pos-guide)
- [Ken Research: Vietnam restaurant software market](https://www.kenresearch.com/industry-reports/vietnam-restaurant-management-software-market)
- [Take.app: KiotViet alternatives (pricing)](https://www.take.app/alternatives/kiotviet)
