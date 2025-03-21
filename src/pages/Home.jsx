import React, { useState, useEffect } from 'react';
import { FiClock, FiUsers, FiCalendar, FiInfo, FiPhone, FiDollarSign, FiPackage } from 'react-icons/fi';
import { FaWhatsapp, FaLiraSign, FaCheck } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Masonry from 'react-masonry-css';
import { 
  ArrowPathIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

const Home = () => {
  const { t } = useLanguage();
  const [tomorrowEvents, setTomorrowEvents] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [expiringSoonPackages, setExpiringSoonPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [sentMessages, setSentMessages] = useState({});

  // LocalStorage'dan verileri yükle ve eski tarihleri temizle
  const cleanupOldData = () => {
    const savedMessages = JSON.parse(localStorage.getItem('sentWhatsAppMessages') || '{}');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatı
    
    // Bugünden önceki tüm tarihleri temizle
    const updatedMessages = {};
    for (const date in savedMessages) {
      if (date >= today) {
        updatedMessages[date] = savedMessages[date];
      }
    }
    
    localStorage.setItem('sentWhatsAppMessages', JSON.stringify(updatedMessages));
    return updatedMessages;
  };

  // Mesaj durumunu kontrol et
  const isMessageSent = (participantId) => {
    const today = new Date().toISOString().split('T')[0];
    return sentMessages[today]?.includes(participantId) || false;
  };

  // Mesaj durumunu değiştir
  const toggleMessageSent = (participantId, event) => {
    // Tıklama olayı olduğunda event parametresini durdurmamız gerekecek
    if (event) {
      event.preventDefault(); // Eğer event parametresi varsa, varsayılan davranışı engelle
      event.stopPropagation(); // Event yayılımını engelle
    }
    
    const today = new Date().toISOString().split('T')[0];
    const updatedMessages = {...sentMessages};
    
    if (!updatedMessages[today]) {
      updatedMessages[today] = [];
    }
    
    // Toggle işlemi - eğer varsa sil, yoksa ekle
    if (updatedMessages[today].includes(participantId)) {
      updatedMessages[today] = updatedMessages[today].filter(id => id !== participantId);
    } else {
      updatedMessages[today].push(participantId);
    }
    
    setSentMessages(updatedMessages);
    localStorage.setItem('sentWhatsAppMessages', JSON.stringify(updatedMessages));
  };

  // Yeni fonksiyon: Sadece mesaj gönderildi olarak işaretle (silme yapma)
  const addMessageSent = (participantId) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedMessages = {...sentMessages};
    
    if (!updatedMessages[today]) {
      updatedMessages[today] = [];
    }
    
    // Eğer zaten mesaj gönderilmişse, tekrar ekleme
    if (!updatedMessages[today].includes(participantId)) {
      updatedMessages[today].push(participantId);
      setSentMessages(updatedMessages);
      localStorage.setItem('sentWhatsAppMessages', JSON.stringify(updatedMessages));
    }
  };

  // Component mount olduğunda lokalden verileri yükle
  useEffect(() => {
    const currentMessages = cleanupOldData();
    setSentMessages(currentMessages);
  }, []);

  // Yarınki dersleri ve katılımcıları çeken fonksiyon
  const fetchTomorrowEvents = async () => {
    setIsLoading(true);
    
    // Yarının başlangıç ve bitiş tarihlerini hesapla
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);
    
    try {
      // Yarınki dersleri sorgula
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', tomorrowStart.toISOString())
        .lte('event_date', tomorrowEnd.toISOString())
        .eq('is_active', true)
        .order('event_date', { ascending: true });
      
      if (eventsError) throw eventsError;
      
      // Her ders için katılımcıları getir
      const eventsWithParticipants = await Promise.all(events.map(async (event) => {
        const { data: participants, error: participantsError } = await supabase
          .from('event_participants')
          .select(`
            *,
            registrations:registration_id (
              student_name,
              student_age,
              parent_name,
              parent_phone
            )
          `)
          .eq('event_id', event.id)
          .eq('status', 'scheduled')
          .order('created_at');
        
        if (participantsError) throw participantsError;
        
        return {
          ...event,
          participants: participants || []
        };
      }));
      
      setTomorrowEvents(eventsWithParticipants);
    } catch (error) {
      console.error('Yarınki dersler çekilirken hata oluştu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Ödemesi bekleyen kayıtları çeken fonksiyon
  const fetchPendingPayments = async () => {
    setIsLoadingPayments(true);
    
    try {
      // Ödemesi beklemede olan kayıtları çek
      const { data, error } = await supabase
        .from('registrations')
        .select('*, event_participants(event_id, events:event_id(event_date, age_group, event_type))')
        .eq('payment_status', 'beklemede')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPendingPayments(data || []);
    } catch (error) {
      console.error('Bekleyen ödemeler çekilirken hata oluştu:', error);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  // Yakında sona erecek paketleri çeken fonksiyon
  const fetchExpiringSoonPackages = async () => {
    setIsLoadingPackages(true);
    
    try {
      // Bitiş tarihine 7 gün kalan paketleri çek
      const today = new Date();
      const cutoffDate = new Date(today);
      cutoffDate.setDate(today.getDate() + 7); // Önümüzdeki 7 gün içinde bitecek olanlar
      
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .lte('package_end_date', cutoffDate.toISOString())
        .gte('package_end_date', today.toISOString()) // Bugün ve sonrası (zaten bitmiş olanları gösterme)
        .order('package_end_date', { ascending: true });
      
      if (error) throw error;
      
      setExpiringSoonPackages(data || []);
    } catch (error) {
      console.error('Bitiş tarihi yaklaşan paketler çekilirken hata oluştu:', error);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  useEffect(() => {
    fetchTomorrowEvents();
    fetchPendingPayments();
    fetchExpiringSoonPackages();
  }, []);

  // Etkinlik türüne göre renkler
  const eventTypeColors = {
    'ingilizce': 'bg-[#0071e3]/10 text-[#0071e3] ring-1 ring-[#0071e3]/20',
    'duyusal': 'bg-[#ac39ff]/10 text-[#ac39ff] ring-1 ring-[#ac39ff]/20',
    'ozel': 'bg-[#ff9500]/10 text-[#ff9500] ring-1 ring-[#ff9500]/20'
  };

  // Etkinlik türü Türkçe karşılıkları
  const eventTypeLabels = {
    'ingilizce': 'İngilizce',
    'duyusal': 'Duyusal',
    'ozel': 'Özel Etkinlik'
  };

  // Etkinlik türüne göre ikonlar
  const eventTypeIcons = {
    'ingilizce': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg>,
    'duyusal': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>,
    'ozel': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
  };

  // Yarın için tarih formatını hazırla
  const tomorrowDateString = format(
    new Date(new Date().setDate(new Date().getDate() + 1)),
    'd MMMM EEEE',
    { locale: tr }
  );

  // Masonry breakpoints
  const breakpointColumns = {
    default: 4,
    1536: 3,
    1280: 2,
    768: 1,
    640: 1
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between h-auto sm:h-16 px-6 border-b border-[#d2d2d7] dark:border-[#2a3241] py-4 sm:py-0 gap-4 sm:gap-0">
          <div>
            <h1 className="text-xl font-medium text-[#1d1d1f] dark:text-white">Anasayfa</h1>
          </div>
          <div className="flex items-center">
            <div className="text-sm text-[#6e6e73] dark:text-[#86868b]">
              Bugün: <span className="font-semibold text-[#1d1d1f] dark:text-white">{format(new Date(), 'd MMMM yyyy', { locale: tr })}</span>
            </div>
          </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Yarınki Dersler Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center self-start sm:self-center">
              <CalendarDaysIcon className="h-4 w-4 text-[#0071e3]" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center">
              <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">
                Yarınki Dersler
              </h2>
              <span className="text-sm text-[#6e6e73] dark:text-[#86868b] capitalize sm:ml-2">
                ({tomorrowDateString})
              </span>
            </div>
          </div>
          <button 
            onClick={fetchTomorrowEvents} 
            className="flex items-center gap-1.5 text-[#0071e3] hover:text-[#0077ED] text-sm font-medium"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>Yenile</span>
          </button>
        </div>

        {isLoading ? (
          // Loading State
          <Masonry
            breakpointCols={breakpointColumns}
            className="flex -ml-6 w-auto"
            columnClassName="pl-6"
          >
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="mb-6 bg-white dark:bg-[#121621] rounded-xl p-5 border border-[#d2d2d7] dark:border-[#2a3241] relative overflow-hidden"
              >
                {/* Kart Başlığı */}
                <div className="flex items-start justify-between pb-4 border-b border-[#d2d2d7] dark:border-[#2a3241]">
                  <div>
                    <div className="h-[18px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-32 relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                    </div>
                    <div className="h-[16px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-20 mt-1.5 relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                    </div>
                  </div>
                  <div className="h-[26px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-lg w-24 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                  </div>
                </div>

                {/* Placeholder İçerik */}
                <div className="mt-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                      <div className="flex-1 h-5 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Masonry>
        ) : tomorrowEvents.length === 0 ? (
          // Boş State
          <div className="text-center py-12 bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241]">
            <CalendarDaysIcon className="w-12 h-12 mx-auto text-[#86868b] mb-4" />
            <h3 className="text-lg font-medium text-[#1d1d1f] dark:text-white mb-1">
              Yarın için ders bulunmuyor
            </h3>
            <p className="text-sm text-[#6e6e73] dark:text-[#86868b] max-w-md mx-auto">
              Yarın için planlanmış herhangi bir ders bulunmuyor. Takvim sayfasından yeni ders ekleyebilirsiniz.
            </p>
          </div>
        ) : (
          // Dersler
          <Masonry
            breakpointCols={breakpointColumns}
            className="flex -ml-6 w-auto"
            columnClassName="pl-6"
          >
            {tomorrowEvents.map((event) => (
              <div
                key={event.id}
                className="mb-6 group bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] hover:shadow-lg dark:hover:shadow-[#0071e3]/10 transition-all duration-200 relative overflow-hidden"
              >
                <div className="p-5">
                  {/* Kart Başlığı */}
                  <div className="flex items-start justify-between pb-4 border-b border-[#d2d2d7] dark:border-[#2a3241]">
                    <div>
                      <h3 className="text-[15px] font-medium text-[#1d1d1f] dark:text-white flex items-center gap-2">
                        {format(new Date(event.event_date), 'HH:mm', { locale: tr })}
                        <span className="text-[#6e6e73] dark:text-[#86868b]">|</span>
                        {event.age_group}
                      </h3>
                      <p className="text-[13px] text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                        Kapasite: {event.current_capacity}/5
                      </p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium ${eventTypeColors[event.event_type]}`}>
                      {eventTypeIcons[event.event_type]}
                    </div>
                  </div>

                  {/* Açıklama (varsa) */}
                  {event.custom_description && (
                    <div className="mt-4 mb-4 text-[13px] text-[#424245] dark:text-[#86868b] bg-[#f5f5f7] dark:bg-[#1c1c1e]/40 p-3 rounded-lg">
                      <div className="flex gap-2">
                        <FiInfo className="w-[18px] h-[18px] shrink-0 text-[#0071e3]" />
                        <p>{event.custom_description}</p>
                      </div>
                    </div>
                  )}

                  {/* Katılımcılar */}
                  <div className="mt-4">
                    <h4 className="text-[13px] font-medium text-[#1d1d1f] dark:text-white flex items-center gap-1.5 mb-3">
                      <FiUsers className="w-4 h-4 text-[#0071e3]" />
                      Katılımcılar ({event.participants.length})
                    </h4>

                    {event.participants.length === 0 ? (
                      <p className="text-[13px] text-[#6e6e73] dark:text-[#86868b] italic">
                        Henüz katılımcı yok
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {event.participants.map((participant) => (
                          <div 
                            key={participant.id}
                            className="p-3 bg-[#f5f5f7] dark:bg-[#1c1c1e]/40 rounded-lg"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-[#0071e3]/10 flex items-center justify-center text-[#0071e3] text-xs font-medium">
                                    {participant.registrations.student_name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">
                                      {participant.registrations.student_name}
                                      <span className="ml-1.5 text-[11px] text-[#6e6e73] dark:text-[#86868b] font-normal">
                                        ({participant.registrations.student_age})
                                      </span>
                                    </p>
                                    <p className="text-[11px] text-[#6e6e73] dark:text-[#86868b]">
                                      Veli: {participant.registrations.parent_name}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Tik işareti sol tarafta ve sadece mesaj gönderildiğinde görünür */}
                                {isMessageSent(participant.id) && (
                                  <button 
                                    onClick={(e) => toggleMessageSent(participant.id, e)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center bg-[#0071e3]/10 text-[#0071e3] dark:bg-[#0071e3]/20 dark:text-[#0071e3] border border-[#0071e3]/30 hover:bg-[#0071e3]/20 dark:hover:bg-[#0071e3]/30 transition-colors cursor-pointer"
                                    title="Mesaj Gönderildi - Kaldırmak için tıklayın"
                                  >
                                    <FaCheck className="w-3 h-3" />
                                  </button>
                                )}
                                
                                <a 
                                  href={`https://wa.me/90${participant.registrations.parent_phone.replace(/\D/g, '').replace(/^0+/, '')}?text=${encodeURIComponent(`Merhaba ${participant.registrations.parent_name} Hanım 😊
                                          Çocuğunuzun etkinliğimizde bize katılacak olmasından büyük mutluluk duyuyoruz! İşte rezervasyonunuzla ilgili detaylar:
                                          * Etkinlik Tarihi: ${format(new Date(event.event_date), 'd MMMM yyyy', { locale: tr })} (Yarın)
                                          * Saat: ${format(new Date(event.event_date), 'HH:mm', { locale: tr })} 
                                          * Etkinlik: ${eventTypeLabels[event.event_type]} 
                                          * Yer: Ritim İstanbul B blok Kat:1 Ofis 237
                                          * Süre: 45-60 dk
                                          Etkinlik sırasında çocuklarınızı güvende tutmak için gerekli tüm önlemleri aldık. Lütfen çocuğunuzun rahat kıyafetlerle gelmesini sağlayın ve yanlarına bir su şişesi ve küçük bir atıştırmalık getirmeyi unutmayın. Yedek kıyafet yada aktivite önlüğü getirmenizi tavsiye ederiz.
                                          Rezervasyonunuzun iptali için lütfen bir gün önceden bizi bilgilendiriniz. Rezervasyonunuza saatinde gelmenizi rica ederiz. 
                                          Eğer herhangi bir sorunuz varsa, lütfen bize ulaşmaktan çekinmeyin.
                                          Sizleri ve çocuğunuzu atölyemizde görmek için sabırsızlanıyoruz!
                                          Sevgilerle,
                                          HelloKido Oyun Atölyesi 🌸`)}`}
                                  onClick={() => addMessageSent(participant.id)}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="w-8 h-8 rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] hover:bg-[#e5e5e5] dark:hover:bg-[#3a4251] flex items-center justify-center text-[#34c759] border border-[#d2d2d7] dark:border-[#2a3241] transition-colors"
                                  title="WhatsApp'tan Hatırlatma Mesajı Gönder"
                                >
                                  <FaWhatsapp className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </Masonry>
        )}

        {/* Dashboard Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          {/* Bekleyen Ödemeler Bölümü */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center">
                  <FaLiraSign className="h-4 w-4 text-[#0071e3]" />
                </div>
                <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">
                  Bekleyen Ödemeler
                </h2>
              </div>
              <button 
                onClick={fetchPendingPayments} 
                className="flex items-center gap-1.5 text-[#0071e3] hover:text-[#0077ED] text-sm font-medium"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <span>Yenile</span>
              </button>
            </div>

            {isLoadingPayments ? (
              // Loading State
              <div className="bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241]">
                <div className="p-5 border-b border-[#d2d2d7] dark:border-[#2a3241]">
                  <div className="h-[18px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-48 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                  </div>
                </div>

                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-5 flex items-center justify-between border-b border-[#d2d2d7] dark:border-[#2a3241] last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
              </div>
              <div>
                        <div className="h-5 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-40 mb-1.5 relative overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                        </div>
                        <div className="h-4 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-24 relative overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-full w-8 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingPayments.length === 0 ? (
              // Boş State
              <div className="text-center py-12 bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241]">
                <FaLiraSign className="w-12 h-12 mx-auto text-[#86868b] mb-4" />
                <h3 className="text-lg font-medium text-[#1d1d1f] dark:text-white mb-1">
                  Bekleyen ödeme bulunmuyor
                </h3>
                <p className="text-sm text-[#6e6e73] dark:text-[#86868b] max-w-md mx-auto">
                  Tüm kayıtların ödemeleri tamamlanmış görünüyor.
                </p>
              </div>
            ) : (
              // Bekleyen Ödemeler Listesi
              <div className="bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] overflow-hidden">
                <div className="p-4 sm:px-6 border-b border-[#d2d2d7] dark:border-[#2a3241] bg-[#f5f5f7] dark:bg-[#1c1c1e]/40">
                  <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                    Toplam {pendingPayments.length} bekleyen ödeme
                  </h3>
                </div>
                
                {pendingPayments.map((registration) => (
                  <div 
                    key={registration.id}
                    className="p-4 sm:px-6 py-4 flex items-center justify-between border-b border-[#d2d2d7] dark:border-[#2a3241] last:border-b-0 hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c1e]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#ff9500]/10 flex items-center justify-center text-[#ff9500] text-sm font-medium">
                        {registration.student_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white flex items-center gap-2">
                          {registration.student_name}
                          <span className="text-[13px] text-[#6e6e73] dark:text-[#86868b] font-normal">
                            ({registration.student_age})
                          </span>
                        </p>
                        <p className="text-[13px] text-[#6e6e73] dark:text-[#86868b]">
                          Veli: {registration.parent_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a 
                        href={`https://wa.me/90${registration.parent_phone.replace(/\D/g, '').replace(/^0+/, '')}?text=${encodeURIComponent(`Merhabalar ${registration.parent_name}. ${registration.student_name} için ödeme beklemekteyiz. Bilginize sunarız.`)}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] hover:bg-[#e5e5e5] dark:hover:bg-[#3a4251] flex items-center justify-center text-[#34c759] border border-[#d2d2d7] dark:border-[#2a3241] transition-colors"
                        title="WhatsApp'tan Ödeme Hatırlatma Mesajı Gönder"
                      >
                        <FaWhatsapp className="w-4 h-4" />
                      </a>
            </div>
          </div>
        ))}
              </div>
            )}
      </div>

          {/* Paket Süresi Bitmeye Yaklaşanlar Bölümü */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ac39ff]/10 border border-[#ac39ff]/20 flex items-center justify-center">
                  <FiPackage className="h-4 w-4 text-[#ac39ff]" />
                </div>
                <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">
                  Paket Süresi Bitmeye Yaklaşanlar
        </h2>
              </div>
              <button 
                onClick={fetchExpiringSoonPackages} 
                className="flex items-center gap-1.5 text-[#ac39ff] hover:text-[#b54aff] text-sm font-medium"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <span>Yenile</span>
              </button>
            </div>

            {isLoadingPackages ? (
              // Loading State
              <div className="bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241]">
                <div className="p-5 border-b border-[#d2d2d7] dark:border-[#2a3241]">
                  <div className="h-[18px] bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-48 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                  </div>
                </div>
                
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-5 flex items-center justify-between border-b border-[#d2d2d7] dark:border-[#2a3241] last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                      <div>
                        <div className="h-5 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-40 mb-1.5 relative overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                        </div>
                        <div className="h-4 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-24 relative overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-full w-8 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : expiringSoonPackages.length === 0 ? (
              // Boş State
              <div className="text-center py-12 bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241]">
                <FiPackage className="w-12 h-12 mx-auto text-[#86868b] mb-4" />
                <h3 className="text-lg font-medium text-[#1d1d1f] dark:text-white mb-1">
                  Önümüzdeki 7 gün içinde bitecek paket bulunmuyor
                </h3>
                <p className="text-sm text-[#6e6e73] dark:text-[#86868b] max-w-md mx-auto">
                  Önümüzdeki 7 gün içinde bitecek paket bulunmuyor.
                </p>
              </div>
            ) : (
              // Yakında Bitecek Paketler Listesi
              <div className="bg-white dark:bg-[#121621] rounded-xl border border-[#d2d2d7] dark:border-[#2a3241] overflow-hidden">
                <div className="p-4 sm:px-6 border-b border-[#d2d2d7] dark:border-[#2a3241] bg-[#f5f5f7] dark:bg-[#1c1c1e]/40">
                  <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                    Toplam {expiringSoonPackages.length} yaklaşan paket bitişi
                  </h3>
                </div>
                
                {expiringSoonPackages.map((registration) => {
                  // Kalan gün sayısını hesapla
                  const endDate = new Date(registration.package_end_date);
                  const today = new Date();
                  const diffTime = Math.abs(endDate - today);
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  // Aciliyet seviyesine göre renk belirle
                  let urgencyColor = "text-[#34c759]"; // Yeşil (daha çok zaman var)
                  if (diffDays <= 3) {
                    urgencyColor = "text-[#ff3b30]"; // Kırmızı (çok az zaman kaldı)
                  } else if (diffDays <= 7) {
                    urgencyColor = "text-[#ff9500]"; // Turuncu (az zaman kaldı)
                  }
                  
                  return (
                    <div 
                      key={registration.id}
                      className="p-4 sm:px-6 py-4 flex items-center justify-between border-b border-[#d2d2d7] dark:border-[#2a3241] last:border-b-0 hover:bg-[#f5f5f7] dark:hover:bg-[#1c1c1e]/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#ac39ff]/10 flex items-center justify-center text-[#ac39ff] text-sm font-medium">
                          {registration.student_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white flex items-center gap-2">
                            {registration.student_name}
                            <span className="text-[13px] text-[#6e6e73] dark:text-[#86868b] font-normal">
                              ({registration.student_age})
                            </span>
                          </p>
                          <div className="flex items-center gap-2">
                            <p className={`text-[13px] ${urgencyColor} font-medium`}>
                              {diffDays} gün kaldı
                            </p>
                            <span className="text-[11px] text-[#6e6e73] dark:text-[#86868b]">
                              ({format(endDate, 'd MMMM yyyy', { locale: tr })})
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a 
                          href={`https://wa.me/90${registration.parent_phone.replace(/\D/g, '').replace(/^0+/, '')}?text=${encodeURIComponent(`Merhabalar ${registration.parent_name}. ${registration.student_name} adlı öğrencinizin paket süresi ${format(endDate, 'd MMMM yyyy', { locale: tr })} tarihinde sona erecektir. Bilginize sunarız.`)}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-[#f5f5f7] dark:bg-[#2a3241] hover:bg-[#e5e5e5] dark:hover:bg-[#3a4251] flex items-center justify-center text-[#34c759] border border-[#d2d2d7] dark:border-[#2a3241] transition-colors"
                          title="WhatsApp'tan Paket Bitiş Bilgisi Gönder"
                        >
                          <FaWhatsapp className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 