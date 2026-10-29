# dsh-deepseek-peak-badge

[English](#english) | Русский

Значок в нижней части поля ввода DeepSeek Harness, который показывает, действует ли сейчас **пиковый тариф DeepSeek**.

| Цвет | Когда |
| --- | --- |
| 🔴 красный | сейчас пиковые часы |
| 🟡 жёлтый | до начала пиковых часов меньше 30 минут |
| 🟢 зелёный | офф-пик; в подсказке — время следующего пика |

Значок виден только при выбранном источнике DeepSeek (DeepSeek API по ключу или DeepSeek Account); при любом другом провайдере он скрыт.

## Расписание

Пиковые часы по официальному тарифу DeepSeek: **пн–пт 09:00–12:00 и 14:00–18:00 по Пекину (UTC+8)**, без учёта государственных праздников КНР; всё остальное время, включая выходные, — офф-пик (цена вдвое ниже). В Москве это **04:00–07:00 и 09:00–13:00**.

Время берётся с часов компьютера и пересчитывается на Пекин, а моменты границ показываются в местном часовом поясе. Список праздников КНР зашит на 2026 год (`HOLIDAY_RANGES` в `client.js`) — его нужно продлевать раз в год.

## Установка

```sh
dsh plugin --profile <profile> add github:YurinKonstantin/dsh-deepseek-peak-badge
```

Затем перезапустить DSH. Плагин объявляет `dsh.bundle` и поэтому ставится как обычный бандл; браузерная часть подключается автоматически.

## Настройка

Отдельного экрана настроек нет; правится `client.js`:

- `PEAK_WINDOWS` — окна пика в минутах от полуночи по Пекину;
- `WARN_MINUTES` — за сколько минут включать жёлтый;
- `HOLIDAY_RANGES` — праздники КНР;
- `DEEPSEEK_API_PROVIDERS` — провайдеры, для которых значок показывается (`deepseek-official`, `deepseek-account`).

## Разработка

```sh
node test/schedule.test.mjs   # 14 граничных случаев расписания
```

Тест извлекает блок между маркерами `peak-schedule-start` / `peak-schedule-end` из `client.js` и проверяет пик, паузу, выходные, праздники и жёлтую зону.

## Ограничения

- Праздники КНР зашиты на 2026 год.
- Значок не учитывает переключение модели в момент запроса — только текущий выбор провайдера в сессии.
- Это индикатор, а не биллинг: он не считает потраченные токены и не знает о скидках аккаунта.

## Лицензия

MIT — см. [LICENSE](LICENSE).

---

## English

A composer-dock badge for DeepSeek Harness showing whether **DeepSeek peak pricing** is active. It appears only when the session's selected provider is a DeepSeek route (official API key or DeepSeek account) and hides for every other provider.

- 🔴 red — peak hours now;
- 🟡 yellow — a peak window starts within 30 minutes;
- 🟢 green — off-peak (half price until the next peak).

Peak hours follow the official DeepSeek pricing schedule: **Mon–Fri 09:00–12:00 and 14:00–18:00 Beijing time (UTC+8)**, excluding Chinese statutory holidays; weekends and everything else are off-peak. Boundaries are displayed in your local time zone; the clock comes from your computer.

The Chinese holiday list is a 2026 constant (`HOLIDAY_RANGES` in `client.js`) and needs a yearly refresh. Install with:

```sh
dsh plugin --profile <profile> add github:YurinKonstantin/dsh-deepseek-peak-badge
```

MIT license.
