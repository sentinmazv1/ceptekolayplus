export type Role = 'ADMIN' | 'SALES_REP';

export interface User {
  email: string;
  name: string;
  role: Role;
}

export type LeadStatus =
  | 'Yeni'
  | 'Aranacak'
  | 'Ulaşılamadı'
  | 'Meşgul/Hattı kapalı'
  | 'Yanlış numara'
  | 'Daha sonra aranmak istiyor'
  | "WhatsApp'tan bilgi istiyor"
  | 'E-Devlet paylaşmak istemedi'
  | 'Başvuru alındı'
  | 'Eksik evrak bekleniyor'
  | 'Satış yapıldı/Tamamlandı'
  | 'Reddetti'
  | 'Uygun değil'
  | 'İptal/Vazgeçti'
  | 'Mağazaya davet edildi'
  | 'Kefil bekleniyor'
  | 'Teslim edildi'
  | 'Cevap Yok'
  | 'Onaylandı';

export interface Customer {
  id: string;
  created_at: string;
  created_by: string;
  ad_soyad: string;
  telefon: string;
  tc_kimlik?: string;
  winner_musteri_no?: string;
  dogum_tarihi?: string;
  sehir?: string;
  ilce?: string;
  meslek_is?: string;
  mulkiyet_durumu?: string;
  durum: LeadStatus;
  sahip?: string; // Email of the sales rep
  cekilme_zamani?: string;
  son_arama_zamani?: string;
  sonraki_arama_zamani?: string;
  arama_not_kisa?: string;
  aciklama_uzun?: string;
  e_devlet_sifre?: string;
  psikoteknik_varmi?: 'Evet' | 'Hayır';
  psikoteknik_notu?: string;
  ikametgah_varmi?: 'Evet' | 'Hayır';
  hizmet_dokumu_varmi?: 'Evet' | 'Hayır';
  ayni_isyerinde_sure_ay?: string;
  son_yatan_maas?: string;
  dava_dosyasi_varmi?: 'Evet' | 'Hayır';
  acik_icra_varmi?: 'Evet' | 'Hayır';
  kapali_icra_varmi?: 'Evet' | 'Hayır';
  kapali_icra_kapanis_sekli?: string;
  gizli_dosya_varmi?: 'Evet' | 'Hayır';
  arac_varmi?: 'Evet' | 'Hayır';
  tapu_varmi?: 'Evet' | 'Hayır';
  avukat_sorgu_durumu?: string;
  avukat_sorgu_sonuc?: string;
  gorsel_1_url?: string;
  gorsel_2_url?: string;
  updated_at?: string;
  updated_by?: string;
  kilitli_mi?: boolean; // stored as "TRUE"/"FALSE" in sheets
  kilit_sahibi?: string;
  kilit_zamani?: string;
  talep_edilen_urun?: string;
  talep_edilen_tutar?: number;
  basvuru_kanali?: string; // Sosyal Medya, Whatsapp, Sabit Hat, Mağaza

  // Guarantor (Kefil) Fields
  kefil_ad_soyad?: string;
  kefil_telefon?: string;
  kefil_tc_kimlik?: string;
  kefil_meslek_is?: string;
  kefil_son_yatan_maas?: string; // string mainly for input flexibility, convert to number for stats
  kefil_ayni_isyerinde_sure_ay?: string;
  kefil_e_devlet_sifre?: string;
  kefil_ikametgah_varmi?: string; // Evet/Hayır
  kefil_hizmet_dokumu_varmi?: string; // Evet/Hayır
  kefil_dava_dosyasi_varmi?: string;
  kefil_dava_detay?: string;
  kefil_acik_icra_varmi?: string;
  kefil_acik_icra_detay?: string;
  kefil_kapali_icra_varmi?: string;
  kefil_kapali_icra_kapanis_sekli?: string;
  kefil_mulkiyet_durumu?: string;
  kefil_arac_varmi?: string;
  kefil_tapu_varmi?: string;
  kefil_notlar?: string;

  // Approval workflow fields
  onay_durumu?: 'Beklemede' | 'Onaylandı' | 'Reddedildi' | 'Kefil İstendi';
  kredi_limiti?: string;
  admin_notu?: string;
  onay_tarihi?: string;
  onaylayan_admin?: string;

  // Delivery tracking fields
  urun_seri_no?: string;
  urun_imei?: string;
  teslim_tarihi?: string;
  teslim_eden?: string;

  // New detail fields
  arac_detay?: string;
  tapu_detay?: string;
  dava_detay?: string;
  gizli_dosya_detay?: string;
  acik_icra_detay?: string;
  email?: string;
  iptal_nedeni?: string;
  satilan_urunler?: string; // JSON string of SoldItem[]
}

export interface SoldItem {
  imei: string;
  seri_no: string;
  marka: string;
  model: string;
  satis_tarihi: string;
  fiyat?: number;
  garanti_baslangic?: string;
}

export interface LogEntry {
  log_id: string;
  timestamp: string;
  user_email: string;
  customer_id: string;
  action: 'PULL_LEAD' | 'UPDATE_STATUS' | 'UPDATE_FIELDS' | 'UPLOAD_IMAGE_1' | 'UPLOAD_IMAGE_2' | 'SET_NEXT_CALL' | 'SEND_SMS' | 'SEND_WHATSAPP' | 'CUSTOM_ACTION';
  old_value?: string;
  new_value?: string;
  note?: string;
}

export type InventoryStatus = 'STOKTA' | 'SATILDI';

export interface InventoryItem {
  id: string;
  marka: string;
  model: string;
  seri_no: string;
  imei: string;
  durum: InventoryStatus;
  giris_tarihi: string;
  cikis_tarihi?: string;
  musteri_id?: string; // Linked customer ID when sold
  ekleyen?: string;
}
