# Git Workflow Rehberi - CepteKolay+ Projesi

## 🚀 Hızlı Başlangıç

Bu proje **GitHub**, **Vercel** ve **Supabase** entegrasyonu ile çalışmaktadır.

### Mevcut Entegrasyonlar
- ✅ **GitHub**: Kod deposu
- ✅ **Vercel**: Otomatik deployment (GitHub push → Vercel deploy)
- ✅ **Supabase**: Veritabanı ve backend servisleri

---

## 📋 Çalışma Akışı

### 1. Değişiklik Yapma Süreci

```
1. Kod değişiklikleri yapılır
2. Git'e commit edilir
3. GitHub'a push edilir
4. Vercel otomatik olarak deploy eder
5. Supabase değişiklikleri manuel veya migration ile uygulanır
```

### 2. Versiyon Yönetimi

Mevcut versiyon: **0.1.1** (package.json)

Versiyon artırma:
- **Patch** (0.1.1 → 0.1.2): Küçük düzeltmeler
- **Minor** (0.1.1 → 0.2.0): Yeni özellikler
- **Major** (0.1.1 → 1.0.0): Büyük değişiklikler

---

## 🔧 Git Komutları

### Temel İşlemler

```bash
# Durum kontrolü
git status

# Değişiklikleri görmek
git diff

# Tüm değişiklikleri ekle
git add .

# Belirli dosyaları ekle
git add src/app/dashboard/page.tsx

# Commit oluştur
git commit -m "feat: yeni özellik eklendi"

# GitHub'a push
git push origin main
# veya
git push origin master
```

### Branch Yönetimi (İsteğe Bağlı)

```bash
# Yeni branch oluştur
git checkout -b feature/yeni-ozellik

# Branch'e geç
git checkout feature/yeni-ozellik

# Main'e geri dön
git checkout main

# Branch'i birleştir
git merge feature/yeni-ozellik
```

---

## 📝 Commit Mesaj Formatı

### Önerilen Format

```
<type>: <kısa açıklama>

<detaylı açıklama (opsiyonel)>
```

### Commit Tipleri

- `feat`: Yeni özellik
- `fix`: Hata düzeltme
- `docs`: Dokümantasyon
- `style`: Kod formatı (işlevsellik değişmez)
- `refactor`: Kod yeniden yapılandırma
- `perf`: Performans iyileştirme
- `test`: Test ekleme/düzeltme
- `chore`: Build, config değişiklikleri

### Örnekler

```bash
git commit -m "feat: müşteri çekme öncelik sistemi eklendi"
git commit -m "fix: stok güncelleme hatası düzeltildi"
git commit -m "refactor: API route'ları optimize edildi"
git commit -m "chore: package.json versiyonu 0.1.2'ye güncellendi"
```

---

## 🔄 Vercel Deployment

### Otomatik Deployment
- Her `git push` işleminde Vercel otomatik deploy yapar
- Production branch: `main` veya `master`
- Preview deployments: Diğer branch'ler için

### Manuel Deployment
Vercel dashboard'dan manuel deploy da yapılabilir.

---

## 🗄️ Supabase Migration

### Veritabanı Değişiklikleri

SQL migration dosyaları projede mevcut:
- `supabase_schema.sql` - Ana şema
- `fix_*.sql` - Düzeltme migration'ları
- `add_*.sql` - Yeni kolon ekleme

### Migration Uygulama

1. Supabase Dashboard → SQL Editor
2. Migration SQL'ini çalıştır
3. Veya `run_migration.js` script'i kullan

---

## ⚠️ Önemli Notlar

### Commit Edilmemesi Gerekenler (.gitignore)
- `.env*` dosyaları
- `node_modules/`
- `.next/` build klasörü
- `.vercel/` klasörü
- Hassas bilgiler (API keys, secrets)

### Environment Variables
Vercel'de environment variables ayarlanmalı:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- Diğer API keys

---

## 🎯 Önerilen Çalışma Akışı

1. **Değişiklik Yap**
   - Kod düzenlemeleri
   - Yeni özellikler
   - Bug fix'ler

2. **Test Et**
   - Local'de `npm run dev` ile test
   - Hataları kontrol et

3. **Commit Et**
   ```bash
   git add .
   git commit -m "feat: açıklama"
   ```

4. **Push Et**
   ```bash
   git push origin main
   ```

5. **Vercel Kontrol**
   - Vercel dashboard'da deployment'ı kontrol et
   - Hata varsa logları incele

6. **Supabase Migration** (Gerekirse)
   - SQL migration'ları Supabase'de çalıştır

---

## 📊 Versiyon Güncelleme Örneği

```bash
# package.json'da versiyonu güncelle (0.1.1 → 0.1.2)
# Sonra:
git add package.json
git commit -m "chore: versiyon 0.1.2'ye güncellendi"
git push origin main
```

---

## 🆘 Sorun Giderme

### Push Hatası
```bash
# Önce pull yap
git pull origin main

# Conflict varsa çöz, sonra push
git push origin main
```

### Vercel Build Hatası
- Vercel dashboard → Deployments → Logs kontrol et
- Environment variables eksik olabilir
- Build script'leri kontrol et

### Supabase Bağlantı Hatası
- Environment variables kontrol et
- Supabase project durumunu kontrol et
- Network/firewall ayarlarını kontrol et

---

## 📞 Destek

Sorun yaşarsanız:
1. Git loglarını kontrol edin
2. Vercel deployment loglarını inceleyin
3. Supabase dashboard'u kontrol edin
