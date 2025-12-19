// Espirili & Motivasyonel Mesaj Şablonları

export const ACTIVITY_MESSAGES = {
    // 🎉 BAŞARI MESAJLARI (Confetti ile!)
    approvals: [
        "🎉 {count} müşteri onaylandı! Şampanya patlatma vakti! 🍾",
        "✨ Bugün {count} onay! Sihirli dokunuşunuz devam ediyor! 🪄",
        "🏆 {count} onay! Siz bir efsane misiniz yoksa? 💪",
        "🎊 SÜPER! {count} müşteri mutlu! Siz de mutlusunuz değil mi? 😎",
        "🌟 {count} onay geldi! Yıldızlar sizinle! ⭐",
        "💯 Perfect! {count} onay! Bu hızla NASA'ya girersiniz! 🚀",
        "🎯 Hedef tam 12'den! {count} onay ile devam! 🔥",
    ],

    // 📞 ARAMA AKTİVİTELERİ
    calls: [
        "📞 Bugün {count} arama! Telefonlar ateş ediyor! 🔥",
        "☎️ {count} arama tamamlandı! Kulağınız yanmıyor mu? 😄",
        "📱 {count} görüşme! Call center'mıza taş çıkarttınız! 💪",
        "🎤 {count} arama! Radyo DJ'i gibisiniz! 🎧",
        "📞 {count} arama yapıldı! Sosyal bir kelebek! 🦋",
        "☎️ Vay be! {count} arama! Parmaklar yoruldu mu? 😅",
    ],

    // 🆕 YENİ MÜŞTERILER
    newCustomers: [
        "🆕 {count} yeni müşteri bekliyor! Aç kurt gibi! 🐺",
        "😊 {count} kişi sizi bekliyor! Popülersiniz! ⭐",
        "🎁 {count} yeni müşteri geldi! Hediye paketi gibi! 🎀",
        "🌊 {count} müşteri dalgası! Sörf zamanı! 🏄",
        "🎲 {count} yeni şans! Hadi bakalım! 🍀",
        "🚀 {count} yeni misyon! Astronot hazır mısınız? 👨‍🚀",
    ],

    // 💰 PARA & KREDİ
    creditApproved: [
        "💰 Bugün {amount}₺ kredi onayı! Para basıyorsunuz! 💸",
        "🤑 {amount}₺ onay! Banka müdürü sizi arıyor! 📞",
        "💵 {amount}₺ aktif! ATM gibi çalışıyorsunuz! 🏧",
        "💎 {amount}₺ değerinde iş! Elmas madeni bulmuşsunuz! ✨",
        "🎰 JACKPOT! {amount}₺ onay! 🎊",
    ],

    // 🏆 PERFORMANS & REKORLAR
    topPerformer: [
        "👑 Haftanın Kralı: {name} - {count} satış! Taç takma zamanı! 👸",
        "🥇 {name} altın madalyayı aldı! {count} satış! Olimpiyat ruhu! 🏅",
        "⚡ {name} şimşek gibi! {count} satış! Hızlı ve öfkeli! 🏎️",
        "🦸 Süper Kahraman {name}: {count} satış! POW! 💥",
        "🌟 {name} parlıyor! {count} satış! Göz kamaştırıcı! ✨",
    ],

    // 📊 KARŞILAŞTIRMALAR (Eğlenceli)
    channelWar: [
        "📱 WhatsApp {wa} - {store} Mağaza! WhatsApp önde! Dijital çağ! 🚀",
        "🏪 Mağaza {store} - {wa} WhatsApp! Klasik kazandı! 🎩",
        "⚔️ Kanal savaşları! WhatsApp vs Mağaza: {wa}-{store}! Kim kazanacak? 🥊",
        "🎯 Bu hafta: WhatsApp {wa}, Mağaza {store}! Yarış heyecanlı! 🏁",
    ],

    // 😔 REDDETMELERconst (Motivasyonel)
    rejections: [
        "😔 {count} müşteri reddetti... Ama vazgeçmiyoruz! 💪",
        "🤔 {count} hayır aldık... Daha fazla evet için hazırız! 🔥",
        "😅 {count} ret... Her hayır bir evete daha yakın! 🎯",
        "💔 {count} red... Ama kalpler kırılmaz, devam! ❤️",
        "🎭 {count} ret oyuncusu... Ama finalde biz kazanacağız! 🏆",
    ],

    // ⏰ ZAMANLAMALAR
    schedule: [
        "⏰ {count} müşteri randevu bekliyor! Takvim dolu! 📅",
        "🕐 {count} kişi sonraki aramayı bekliyor! Alarm kuruldu! ⏰",
        "📅 {count} randevu! Meşgul bir arı! 🐝",
        "⌛ {count} zaman yolcusu! Saat tik-tak! ⏳",
    ],

    // 🎯 HEDEFLER & MOTİVASYON
    goals: [
        "🎯 Hedefin %{percent}'sine ulaştın! Neredeyse orada! 🚀",
        "🔥 %{percent} tamamlandı! Yangın gibi gidiyorsun! 🌡️",
        "⚡ %{percent} hedef! Şimşek hızında! Devam! ⭐",
        "🏃 Haftalık hedefin %{percent}'i! Sprint zamanı! 💨",
        "🎊 %{percent} başarı! Konfeti yakında! 🎉",
    ],

    // 🏙️ ŞEHİR & DEMOGRAFİ (Eğlenceli)
    topCity: [
        "🏙️ {city} bugün en aktif! Başkent burası! 👑",
        "🌆 {city} lider! Metropol enerjisi! ⚡",
        "🏛️ {city} zirveye oturdu! Şehir efsanesi! 🦅",
        "🗼 {city}'den {count} başvuru! Kule kadar yüksek! 📈",
    ],

    // ☕ SAAT & ZAMAN DİLİMLERİ
    peakHour: [
        "☕ Saat {hour}:00 - En çok aranan saat! Kahve molası mı? 😄",
        "🕐 {hour}:00'da patlama! Sihirli saat! ✨",
        "⏰ {hour}:00 golden hour! Fotoğraf çekme zamanı! 📸",
        "🎯 {hour}:00'da rekor! Zaman yolculuğu! ⌚",
    ],

    // 🎂 ÖZEL GÜNLER
    birthdays: [
        "🎂 Bu hafta {count} müşterinin doğum günü! Pasta zamanı! 🎈",
        "🎉 {count} doğum günü! Pastalar yolda! 🍰",
        "🎁 {count} özel gün! Hediye hazır mı? 🎀",
        "🎊 Mutlu {count} müşteri! Yaş günü şenlikleri! 🎵",
    ],

    // 🔥 STREAK & SERİLER
    streaks: [
        "🔥 {days} gün üst üste hedef aşıldı! Ateş topusunuz! 💥",
        "⚡ {days} günlük seri! Durmak yok! 🏃",
        "🌟 {days} gün parlıyorsunuz! Yıldız yolu! ✨",
        "💪 {days} günün şampiyonu! Kas gücü! 🏆",
    ],

    // 🎮 OYUNLAŞTIRMA & ROZETLER
    achievements: [
        "🏅 YENİ ROZET: İlk 10 Arama! Toplayıcı mısınız? 🎯",
        "🥉 BAŞARI: İlk Onay! Pirinç madalya! 🎖️",
        "🥈 LEVEL UP: 50 Müşteriye Ulaştınız! Gümüş lig! ⬆️",
        "🥇 EFSANE: 100 Müşteri! Altın çağ! 👑",
        "💎 MASTER: 500 Arama! Elmas lige hoş geldin! 👑",
        "🦸 SÜPER GÜÇLER AKTIF! 5 onay üst üste! POW! 💥",
    ],

    // 🌅 GÜNÜN SAATİNE GÖRE (Sabah, Öğle, Akşam)
    morning: [
        "☀️ Günaydın! {count} müşteri sizi bekliyor! Kahve hazır mı? ☕",
        "🌅 Sabah enerjisi! {count} yeni fırsat! Güne başlayalım! 💪",
        "🐓 Erken kuş! {count} müşteri erken kalkmış! 🐦",
    ],

    noon: [
        "🌞 Öğle arası! {count} arama tamamlandı! Öğle yemeği hak ettiniz! 🍽️",
        "☀️ Yarı yolda! {count} müşteri! Öğleden sonra süper olacak! 🚀",
        "🏃 Öğle sprintinde {count} arama! Tempo harika! 💨",
    ],

    evening: [
        "🌆 Akşam raporu: {count} onay, {calls} arama! Muhteşem gün! 🎉",
        "🌙 Gün sonu: {count} başarı! Eve gururla gidebilirsiniz! 🏠",
        "⭐ Akşam yıldızı! {count} tamamlandı! Dinlenmeyi hak ettiniz! 😴",
    ],

    // 🎪 ÖZEL DURUMLAR & SÜRPRІЗLER
    special: [
        "🎰 MEGA BONUS! {count} müşteri tek seferde! Jackpot! 💰",
        "🚨 REKOR KIRILIYOR! {count} arama 1 saatte! Alarm! 🔔",
        "🎪 KARNAVAL! Her kanaldan başvuru var! Sirk şehirde! 🎡",
        "🌈 GÖKKUŞAĞı GUNU! Her renkten başarı! 🦄",
        "🎭 PLOTgetwİST! Beklenmeyen {count} onay! Sürpriz! 😱",
        "🦄 UNICORN MOMENT! Mükemmel gün! Efsane! ✨",
    ],

    // 😴 DÜŞÜKakt​іVİTE (Motіvasyon)
    slowDay: [
        "🐢 Yavaş bir gün... Hızlanalım mı? 🏃",
        "😴 Sessiz sakin... Fırtına öncesi durgunluk! ⛈️",
        "🌙 Sakin... Ama fırsat dolu! Avlanma zamanı! 🦅",
        "☕ Bir kahve molası? Sonra gaza basalım! 🚗",
    ],

    // 🎊 MİLESTONE'LAR (Büyük başarılar)
    milestones: [
        "🎊 100. MÜŞTERİ! Yüzlük kulübüne hoş geldin! 💯",
        "🏆 500. ARAMA! Konuşkan kuş ödülü! 🐦",
        "💎 1000. BAŞARI! Elmas lige yükseldin! 👑",
        "🚀 İLK AYINIZ! Roket gibi başladınız! 🌟",
    ],

    // 🎯 REKabet & LİDERLİK
    competition: [
        "⚔️ {name1} vs {name2}! {score1}-{score2}! Kim kazanacak? 🥊",
        "🏁 Yarışta {name} önde! Kovalayın! 🏎️",
        "👑 Lider {name}! Tahtı sallayabilir misiniz? 💪",
        "🎯 {name} hedefi geçti! Sıra kimde? 🔥",
    ],

    // 💡 İPUCU & TAVSİYELER (Eğlenceli)
    tips: [
        "💡 İPUCU: Sabah aramaları daha başarılı! Kuş misali erken kalk! 🐦",
        "🎯 TAVSİYE: Gülümseyin, telefonda belli oluyor! 😊",
        "⚡ HIZLI İPUCU: WhatsApp'tan gelen daha hızlı dönüyor! 📱",
        "🧠 AKIL: Öğle arası daha sessiz, fırsat! 🌮",
    ],
};

// Mesaj seçme fonksiyonu
export function getRandomMessage(category: keyof typeof ACTIVITY_MESSAGES): string {
    const messages = ACTIVITY_MESSAGES[category];
    return messages[Math.floor(Math.random() * messages.length)];
}

// Değişken replace fonksiyonu
export function formatMessage(template: string, vars: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}
