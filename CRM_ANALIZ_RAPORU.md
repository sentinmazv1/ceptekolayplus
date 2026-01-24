# CepteKolay+ CRM — Kapsamlı Analiz Raporu

> **Amaç:** Daha iyi, özgün tasarımlı ve hatasız bir CRM için mevcut projenin analizi.  
> **Not:** Bu raporda mevcut dosyalarda değişiklik yapılmamıştır.

---

## 1. Proje Özeti

| Alan | Değer |
|------|--------|
| **Proje adı** | fiyat_hesaplama_uygulamasi (içerik: CRM / Lead yönetim) |
| **Framework** | Next.js 16.1, App Router, TypeScript |
| **Veritabanı** | Supabase (PostgreSQL) |
| **Auth** | NextAuth (Credentials) |
| **Stil** | Tailwind CSS v4, Lucide, Framer Motion, Recharts |
| **Sayfa sayısı** | ~20+ dashboard sayfası |
| **API route** | 50+ endpoint |

---

## 2. Mimari ve Dosya Yapısı

### 2.1 Genel yapı
```
src/
├── app/          # Sayfalar + API (App Router)
├── components/   # UI bileşenleri (CustomerCard ~2400 satır)
├── lib/          # Auth, Supabase, leads, types, sms, vb.
└── scripts/     # Yardımcı scriptler
```

### 2.2 Tutarlılık sorunları
- **İsimlendirme:** `leads` vs `customers` — `/api/leads/`, `/api/customers/` ayrı ayrı kullanılıyor; tip adı `Customer`, tablo `leads`.
- **Yedek API:** `/api/backup` ve `/api/admin/backup` — hangisinin nerede kullanıldığı net değil.
- **Settings:** `/dashboard/settings` → `/dashboard/admin/settings` yönlendirmesi var; “Ayarlar” tek yerden yönetilmiyor izlenimi verebilir.
- **Ölü/backup dosya:** `CustomerCard.tsx.bak` — silinmemiş yedek.

---

## 3. Tasarım ve Görünüm

### 3.1 Renk ve tipografi
- **Renk:** Ağırlıklı indigo (600, 700), gri, kırmızı (tehlike/gecikme), amber, emerald.
- **Font:** `layout.tsx` Geist (sans + mono) kullanıyor; `globals.css` `body { font-family: Arial }` ile override — Geist devre dışı kalıyor.
- **Tema:** `globals.css` `prefers-color-scheme: dark` ile koyu arka plan tanımlı; bileşenlerde dark sınıfları yok, pratikte sadece aydınlık tema kullanılıyor.

### 3.2 Bileşen kütüphanesi
- **UI:** Sadece `Button`, `Input`, `Select` — Modal, Card, Tabs, Dropdown, Toast, Skeleton yok.
- **Modal/onay:** `confirm()`, `alert()` yaygın — kendi modal/uyarı sisteminiz yok.
- **Form:** React hook form, Zod vb. yok; manuel `useState` ile form yönetimi.

### 3.3 Animasyon
- **Kullanılan sınıflar:** `animate-in`, `fade-in`, `slide-in-from-left`, `zoom-in-95`, `duration-200`, `duration-300`, `duration-500`.
- **tailwindcss-animate:** `package.json`’da yok. Bu sınıflar büyük ihtimalle etkisiz; hata vermez, sadece animasyon çalışmaz.
- **Framer Motion:** Kurulu ama az kullanılıyor; animasyonlar ağırlıklı Tailwind sınıflarına dayanıyor.

### 3.4 Tasarım tutarsızlıkları
- **Spacing:** `p-4`, `p-6`, `p-8`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl` karışık.
- **Gölge:** `shadow-sm`, `shadow-xl`, `shadow-2xl` farklı sayfalarda farklı.
- **Buton stili:** `Button` bileşeni var; bazı sayfalar `className` ile `bg-indigo-600` gibi doğrudan Tailwind kullanıyor, variant’lar ile çakışma riski.
- **Responsive:** `md:`, `xl:` kullanılıyor; mobil sidebar var, ancak “Müşterilerim” / “Ekle” masaüstü üst menüde yok (sadece mobil + ActionCenter).

---

## 4. Güvenlik

### 4.1 Kritik
- **Supabase anahtarları:** `src/lib/supabase.ts` içinde `HARDCODED_URL`, `HARDCODED_ANON`, `HARDCODED_SERVICE` — repo’ya girmiş. Prod için kabul edilemez.
- **Şifre:** `lib/auth.ts` — “WARNING: Currently storing/checking plaintext”. Hash/bcrypt yok.
- **RLS:** `supabase_schema.sql` — `using (true)` ile tüm kullanıcılara okuma/yazma; RLS fiilen kapalı.

### 4.2 Orta
- **Admin kontrolü:**  
  - `dashboard/page.tsx`: `isAdmin = email === 'ibrahimsentinmaz@gmail.com' || email === 'admin'` — rol değil, sabit email.  
  - `layout.tsx`: `['ADMIN','Admin'].includes(session?.user?.role)`  
  - `CustomerCard`: `['Yönetici','admin','Admin','yonetici']` veya `['ibrahimsentinmaz@gmail.com']`  
  - API’ler: `session.user.role !== 'ADMIN'` veya `['ADMIN','Yönetici','admin','yonetici'].includes(role)`
- **Sonuç:** Rol/ yetki tek merkezde ve tutarlı değil; büyük/küçük harf ve “Yönetici”/“admin” karışımı var. Yeni admin eklemek için birden fazla yerde kod değişikliği gerekebilir.

### 4.3 Küçük
- **GoogleProvider:** `auth.ts`’te import var, `providers` listesinde yok — kullanılmayan kod.
- **`html lang="en"`:** Uygulama Türkçe; `lang="tr"` daha uygun.

---

## 5. Hatalar ve Riskler

### 5.1 Muhtemel hatalar
- **`CustomerCard` useEffect bağımlılığı:**  
  `useEffect(..., [initialData])` ve içeride `initialData.sehir` kullanımı — `initialData` obje referansı değişince tetiklenir; bazen gereksiz veya eksik güncelleme yapabilir.
- **`handleDelete` (settings benzeri):** Başka bir yerde `if (!confirm(...)) return;` sonrası `try { ... }` bloğu `{` ile kapatılmış, `handleDelete` imzası `async (id: string) =>` şeklindeyse, sözdizimi hatası olabilir (ayarlar sayfası değişmiş olabilir; mevcut `settings` sadece redirect).
- **`STATUS_OPTIONS` vs API’den gelen statuses:** CustomerCard sabit `STATUS_OPTIONS` + `statusOptions` (API) birlikte; hangisinin esas alındığı ve senkronizasyon net değil.
- **`session?.user?.role`:** Bazı API’lerde `session.user.role` (optional değil) — `session` kontrolü var, `user` veya `role` yoksa runtime hatası olası.

### 5.2 Tip / şema uyumsuzlukları
- **Customer vs `leads` tablosu:** `types.ts`’teki `Customer` 100+ alan; `supabase_schema.sql`’deki `leads` az sayıda. Geri kalan kolonlar `add_*.sql` ile eklenmiş; tam şema tek yerde değil.
- **`LeadStatus`:** Sabit union; API’den gelen `statuses` tablosu ile tam uyum kontrol edilmiyor.

### 5.3 UX
- **Masaüstü navigasyon:** “Müşterilerim” ve “Ekle” sadece mobil sidebar ve Panel’deki ActionCenter’da. Diğer sayfalardayken (Raporlar, Stok, Onay vb.) masaüstünde bu sayfalara doğrudan link yok.
- **ActionCenter:** Sadece `/dashboard` ana sayfada. My-leads, Add, Search, Reports’ta yok; davranış tutarsız.
- **Loading:** Çoğu yerde `<Loader2 className="animate-spin" />`; ortak bir Skeleton/loading komponenti yok.
- **Hata/geri bildirim:** `alert()`, `confirm()`; toast veya inline mesaj sistemi yok.
- **Empty state:** Bazı listelerde “Henüz veri yok” benzeri metin var, tasarım ve metin her yerde aynı değil.

---

## 6. Kod Kalitesi ve Bakım

### 6.1 Monolitik bileşen
- **CustomerCard.tsx:** ~2400 satır, çok sayıda `useState` / `useEffect`, birçok sekme ve form.  
  - Bölünebilir: `CustomerDetails`, `CustomerLegal`, `CustomerKefil`, `CustomerStock`, `CustomerHistory`, `CustomerSms/WhatsApp` vb.
- **admin/settings/page.tsx:** Çok büyük; `StatusManager`, `SmsTemplateManager`, `UserManager`, `ImportManager`, `SyncManager`, `BackupManager`, `DuplicateManager`, `SystemHealthDashboard`, `MigrationManager` vb. hepsi aynı dosyada. Sekmeler ve mantık ayrı modüllere ayrılabilir.

### 6.2 Tekrarlar
- `cn()` (clsx + twMerge) birkaç yerde yeniden yazılmış; ortak `utils/cn` olabilir.
- Admin kontrolü: `['ADMIN','Admin'].includes(...)` veya `role === 'ADMIN'` birçok yerde; `isAdmin(session)` / `useIsAdmin()` gibi tek noktadan türetilebilir.
- `fetch(/api/...).then(res=>res.json()).then(...).catch(...)` benzeri bloklar çoğu sayfada; ortak `api` katmanı veya `useQuery` benzeri bir yapı azaltır.

### 6.3 Eksik / belirsiz
- **Error boundary:** Projede görünmüyor; beklenmedik hatalar kullanıcıya nasıl gösteriliyor net değil.
- **404 / not-found:** `not-found.tsx` vb. kontrol edilmedi; varsayılan Next.js davranışı kullanılıyor olabilir.
- **Validation:** Form ve API’de Zod/Yup vb. yok; `reason`/`email` gibi alanlarda sadece `if (!x) return` seviyesinde kontrol.
- **Test:** `package.json`’da test script’i yok; `__tests__` / `*.test.*` yapısı görülmedi.

---

## 7. Veritabanı ve API

### 7.1 Şema
- **Ana tablolar:** `leads`, `activity_logs`, `products` (supabase_schema.sql).
- **Ek tablolar (migration’lardan):** `users`, `cancellation_reasons`, `sms_templates`, `quick_notes`, `customer_statuses`, `inventory`, `collection_*`, `customer_classes` vb. — tam listesi tek SQL dosyasında toplanmamış.
- **Migration sayısı:** 20+ `*.sql`; sıra ve bağımlılık takibi zor.

### 7.2 API özeti
- **Auth:** `getServerSession(authOptions)`; bazı route’larda session kontrolü unutulmuş olabilir.
- **Hata biçimi:** `NextResponse.json({ success: false, message: '...' }, { status: 4xx })` ve `{ error: ... }` karışık; frontend’de tek bir `handleApiError` ile toparlanmalı.
- **Supabase:** Neredeyse her yerde `supabaseAdmin`; RLS `true` olduğu için anon client ile de çalışırdı, ancak yetki yönetimi uygulama katmanına kalmış.

---

## 8. Özet: Güçlü Yönler

- İşlev zenginliği: Lead çekme, onay, stok, tahsilat, rapor, SMS/WhatsApp, Sheets, toplu işlemler, sözleşme, takvim.
- Supabase + Next.js App Router kullanımı; modüler API route yapısı.
- `turkey-neighbourhoods` ile il/ilçe; `date-fns`; Recharts ile grafik; XLSX ile Excel; iş akışına uygun alanlar.
- Mobil sidebar, ActionCenter, TickerFeed gibi akıllıca ayrılmış bölümler.

---

## 9. Özet: Zayıf Yönler ve Öncelik

| Öncelik | Konu |
|---------|------|
| **P0** | Hardcoded Supabase anahtarları, düz metin şifre, RLS `using (true)` |
| **P0** | Admin / yetki mantığının tekrarlı ve tutarsız (email/rol karışımı) |
| **P1** | CustomerCard ve admin/settings’in parçalara ayrılması |
| **P1** | `lang="tr"`, font (Geist vs Arial) netleştirme, tasarım token’ları (spacing, radius, gölge) |
| **P1** | Masaüstünde Müşterilerim / Ekle erişimi; ActionCenter’ın hangi sayfalarda olacağı |
| **P2** | Modal/Toast, form kütüphanesi, `tailwindcss-animate` veya Framer’e geçiş |
| **P2** | `leads`/`customers` isimlendirme, `/api/backup` vs `/api/admin/backup` netleştirme |
| **P2** | Migration’ların tek şema/migration setinde toplanması |

---

## 10. Yeni / Daha İyi CRM İçin Nasıl Yardımcı Olabilirim?

1. **Sıfırdan tasarım**
   - Tasarım sistemi: renk, tipografi, spacing, radius, bileşenler (Button, Input, Modal, Card, Tabs, Toast).
   - `globals.css` ve Tailwind teması; dark/light seçeneği istenirse.
   - `animate-in` vb. için ya `tailwindcss-animate` eklenmesi ya da Framer Motion ile tutarlı animasyon seti.

2. **Mimari ve güvenlik**
   - `lib/supabase`: sadece `process.env`; hardcoded key kaldırma.
   - Auth: bcrypt/Argon2 + `users` tablosu; isteğe bağlı GoogleProvider.
   - RLS: `auth.role()` / `auth.email()` ile gerçek kullanıcı bazlı politikalar.
   - Tek `isAdmin(session)` / `requireAdmin()` ve tüm sayfa/API’lerin buna göre güncellenmesi.

3. **Bileşen ve sayfa yapısı**
   - CustomerCard’ı 6–10 mantıksal bileşene bölme; her biri `< 300` satır hedefi.
   - Admin ayarlarının sekme bazlı ayrı sayfalara veya route’lara bölünmesi.
   - Ortak: Modal, Toast, Skeleton, Empty, ErrorMessage, form bileşenleri.

4. **Veri ve API**
   - `Customer` ↔ `leads` şema eşlemesinin tek yerde (ör. `lib/mappers` veya `lib/db/leads`) toplanması.
   - API response formatının `{ success, data?, error? }` gibi standartlaştırılması.
   - Migration’ların `supabase/migrations` altında sıralı ve isimlendirilmiş hale getirilmesi.

5. **UX ve navigasyon**
   - Masaüstü: Müşterilerim, Ekle, Ara’nın header’da veya her zaman görünen bir bar’da olması.
   - ActionCenter: Sadece Panel’de mi kalacak, yoksa layout’ta (ör. dashboard layout) mı olacak — net kurallar.
   - Loading, empty, error durumları için ortak bileşenler ve metinler.

6. **Adım adım plan**
   - Önce: P0 güvenlik (env, şifre, RLS, admin kontrolü).
   - Sonra: Tasarım token’ları + 3–5 temel bileşen (Button, Input, Modal, Card, Select).
   - Ardından: CustomerCard ve Settings parçalara ayrılması.
   - En sonda: Migration birleştirme, test altyapısı, dokümantasyon.

İstersen bir sonraki adımda “önce güvenlik” veya “önce tasarım sistemi” ile başlayacak somut patch/plan çıkarabiliriz; hangi alandan başlamak istediğini söylemen yeterli.

---

*Rapor tarihi: Proje dizini ve `CRM_ANALIZ_RAPORU.md` konumuna göre oluşturuldu. Mevcut dosyalarda değişiklik yapılmamıştır.*
