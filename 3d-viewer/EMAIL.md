# Розсилка 3D-перегляду на пошту — план і реалізація

## Головний принцип (підтверджено дослідженням ринку)
**3D не працює всередині листа.** Так роблять усі (Tesla, Geberit, Villeroy & Boch):
лист = **гарне зображення + короткий опис + велика кнопка** на живий 3D + (опційно) AR.
Не намагаємось вбудувати інтерактив у сам лист — це ламається у 95% поштових клієнтів.

## Що отримує клієнт
```
┌───────────────────────────────────────────┐
│  ▣ BUDZIRKA                                 │  ← брендова шапка (петроль)
│                                             │
│  Ваш проєкт готовий 🎉                       │
│  ┌─────────────────────────────────────┐    │
│  │  [hero-зображення кабіни у студії]   │    │  ← поки банер; далі — рендер конфіга
│  └─────────────────────────────────────┘    │
│  MAX Standart · 3 двері · декор 0085 White  │  ← короткий опис
│  4000×2100 мм · 2 713 €                       │
│                                             │
│  [ Переглянути у 3D → ]                      │  ← головна CTA (на /3d#cfg=…)
│  Відкрити в AR у вашому приміщенні (телефон) │  ← вторинне посилання
│                                             │
│  № КП-2026/1043 · менеджер зв'яжеться        │
│  budzirka.com.ua · тел …                     │
└───────────────────────────────────────────┘
```

## Архітектура
```
Клієнт формує КП → лід у Supabase (+ viewer_url уже зберігається)
        │  (клієнт-виклик або DB-webhook)
        ▼
Supabase Edge Function «send-quote»  ──Resend API──►  лист клієнту (і копія менеджеру)
```

**Чому Resend:** сучасний транзакційний email-сервіс, безкоштовний тариф (3 000 листів/міс),
простий API, гарна доставність. Альтернативи: SendGrid, Postmark, Mailgun — функція майже та сама.

## Що потрібно від вас (один раз, ~15 хв)
1. Зареєструватись на **resend.com** (безкоштовно).
2. Підтвердити домен **budzirka.com.ua** (додати 3 DNS-записи — Resend їх покаже). Або для тесту
   слати з `onboarding@resend.dev`.
3. Отримати **API-ключ** і дати його мені — я додам у секрети Supabase і задеплою функцію.

## Edge Function (готова до деплою)
`supabase/functions/send-quote/index.ts`:
```ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = "BUDZIRKA <kp@budzirka.com.ua>";       // після верифікації домену
const MANAGER = "sales@budzirka.com.ua";            // копія менеджеру

serve(async (req) => {
  const l = await req.json();                         // дані ліда
  const eur = (l.total_eur || 0).toLocaleString("uk-UA");
  const uah = Math.round((l.total_eur || 0) * 52.06).toLocaleString("uk-UA");
  const items = (l.estimate || []).map((i: any) =>
    `${i.qty > 1 ? i.qty + "× " : ""}${i.title}`).join(" · ");

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#152420">
    <div style="background:#274C4F;color:#fff;padding:22px 26px;border-radius:14px 14px 0 0;border-bottom:4px solid #456A6D">
      <b style="font-size:22px;letter-spacing:.5px">BUDZIRKA</b>
      <div style="font-size:12px;color:#cfe0e1">Постачаємо, оброблюємо та монтуємо</div>
    </div>
    <div style="border:1px solid #dbe6e6;border-top:none;border-radius:0 0 14px 14px;padding:26px">
      <h2 style="margin:0 0 6px">Ваш проєкт готовий 🎉</h2>
      <p style="color:#3c4a46;font-size:14px;margin:0 0 18px">
        ${l.name || ""}, дякуємо за розрахунок. Ось ваша конфігурація:</p>
      <div style="background:#EEF4F5;border-radius:11px;padding:14px 16px;font-size:14px;margin-bottom:20px">
        <div style="font-weight:700">${items}</div>
        <div style="color:#3c4a46;margin-top:4px">${l.price_cat || ""} · № ${l.quote_number || ""}</div>
        <div style="font-size:20px;font-weight:800;margin-top:8px">${eur} € <span style="font-size:13px;color:#5f6f6a;font-weight:400">≈ ${uah} грн</span></div>
      </div>
      ${l.viewer_url ? `
      <a href="${l.viewer_url}" style="display:block;text-align:center;background:#274C4F;color:#fff;
        text-decoration:none;padding:15px;border-radius:100px;font-weight:600;font-size:15px">
        🧊 Переглянути проєкт у 3D →</a>
      <p style="text-align:center;font-size:13px;color:#5f6f6a;margin:10px 0 0">
        Відкрийте посилання на телефоні, щоб побачити кабіну в AR — у вашому приміщенні.</p>` : ""}
      <hr style="border:none;border-top:1px solid #E2EDEF;margin:22px 0">
      <p style="font-size:13px;color:#5f6f6a;margin:0">
        Менеджер зв'яжеться з вами найближчим часом${l.no_call ? " (ви просили не телефонувати — напишемо)" : ""}.<br>
        budzirka.com.ua · Пропозиція дійсна 14 днів.</p>
    </div>
  </div>`;

  const send = (to: string, subject: string) => fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });

  if (l.email) await send(l.email, "Ваш проєкт BUDZIRKA — 3D-перегляд");
  await send(MANAGER, `Нова заявка: ${l.name || ""} · ${eur} €`);   // менеджеру завжди
  return new Response("ok", { status: 200 });
});
```

## Тригер (як викликати функцію)
**Варіант А (рекомендований, простий):** конфігуратор після `submitLead()` додатково викликає функцію:
```js
fetch('https://eymmfzpcuuibufondxfv.supabase.co/functions/v1/send-quote',
  { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer <ANON_KEY>'},
    body: JSON.stringify(leadObject) });
```
**Варіант Б:** Supabase Database Webhook на `INSERT` у `budzirka_leads` → автоматично смикає функцію
(нічого не міняти в конфігураторі). Налаштовується в дашборді Supabase.

## Фази
- **Зараз:** лист зі спекою + кнопкою на живий 3D + AR-посилання. Менеджеру — завжди копія.
- **Далі (за бажанням):** замість банера — **hero-рендер саме цієї конфігурації** (через headless-скрін
  переглядача або серверний рендер) + PDF-КП у вкладенні.

**Готовий під'єднати:** як буде Resend API-ключ — додам секрет у Supabase, задеплою функцію
(`supabase functions deploy send-quote`) і ввімкну тригер. ~10 хвилин.
