import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import trLocale from '@fullcalendar/core/locales/tr';
import enLocale from '@fullcalendar/core/locales/en-gb';
import { PlusIcon, UserGroupIcon, ClockIcon, AcademicCapIcon, DocumentDuplicateIcon, CalendarDaysIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import CreateEvent from '../components/CreateEvent';
import UpdateEventSheet from '../components/UpdateEventSheet';
import CopyWeekModal from '../components/CopyWeekModal';
import { supabase } from '../lib/supabase';
import Toast from '../components/ui/Toast';
import '../styles/calendar.css';
import { addDays, format, isSameDay, parseISO } from 'date-fns';
import tr from 'date-fns/locale/tr';
import enUS from 'date-fns/locale/en-US';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import ActionNotification from '../components/ActionNotification';
import { useLanguage } from '../context/LanguageContext';

// Custom hook to monitor screen width
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    // Update state when screen size changes
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Remove event listener when component unmounts
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

const Calendar = () => {
  const { language } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateSheetOpen, setIsUpdateSheetOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState({
    hour: '00',
    minute: '00'
  });
  const [events, setEvents] = useState([]);
  const [groupedEvents, setGroupedEvents] = useState([]);
  const [toast, setToast] = useState({
    message: '',
    type: 'success',
    isVisible: false
  });
  const [currentWeekRange, setCurrentWeekRange] = useState(null);
  const calendarRef = useRef(null);
  
  // States for Copy Week Modal
  const [isCopyWeekModalOpen, setIsCopyWeekModalOpen] = useState(false);
  const [hasConflictsInTargetWeek, setHasConflictsInTargetWeek] = useState(false);
  const [copyWeekLoading, setCopyWeekLoading] = useState(false);
  const [currentWeekEvents, setCurrentWeekEvents] = useState([]);
  
  // Action notification state variables
  const [isActionNotificationVisible, setIsActionNotificationVisible] = useState(false);
  const [actionNotificationMessage, setActionNotificationMessage] = useState('');
  const [targetWeekForNavigation, setTargetWeekForNavigation] = useState(null);
  
  // Get screen width
  const { width } = useWindowSize();
  
  // Helper function to format age group text
  const formatAgeGroup = (ageGroup) => {
    // If screen width is less than 1700px or zoomed
    if (width < 1700) {
      // Remove "Aylık" or "Yaş" words for Turkish, "Month" or "Year" for English
      if (language === 'tr') {
        return ageGroup
          .replace('Aylık', '')
          .replace('Yaş', '')
          .trim();
      } else {
        return ageGroup
          .replace('Month', '')
          .replace('Year', '')
          .trim();
      }
    }
    
    // Normal view
    return ageGroup;
  };

  // Format date with the correct locale
  const formatDate = (date, formatStr) => {
    return format(new Date(date), formatStr || 'dd.MM.yyyy', { locale: language === 'tr' ? tr : enUS });
  };

  // Determine color and icon based on event type
  const getEventTypeDetails = (type) => {
    switch (type) {
      case 'ingilizce':
        return {
          color: '#8b5cf6', // Violet color (Tailwind violet-500)
          icon: '🇬🇧',
          label: language === 'tr' ? 'İngilizce' : 'English'
        };
      case 'duyusal':
        return {
          color: '#f97316', // Orange color (Tailwind orange-500)
          icon: '🎨',
          label: language === 'tr' ? 'Duyusal' : 'Sensory'
        };
      case 'ozel':
        return {
          color: '#059669',
          icon: '⭐',
          label: language === 'tr' ? 'Özel' : 'Special'
        };
      default:
        return {
          color: '#6b7280',
          icon: '📅',
          label: type
        };
    }
  };

  // Fetch events
  const fetchEvents = async () => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*, event_participants(registration_id)')
        .eq('is_active', true)
        .order('event_date', { ascending: true });

      if (eventsError) throw eventsError;

      // Get registered students
      const registrationIds = eventsData
        .flatMap(event => event.event_participants)
        .map(participant => participant.registration_id);

      const { data: studentsData, error: studentsError } = await supabase
        .from('registrations')
        .select('id, student_name')
        .in('id', registrationIds);

      if (studentsError) throw studentsError;

      // Match student names with IDs
      const studentMap = Object.fromEntries(
        studentsData.map(student => [student.id, student.student_name])
      );

      // Convert events to FullCalendar format
      const formattedEvents = eventsData.map(event => {
        const typeDetails = getEventTypeDetails(event.event_type);
        const students = event.event_participants
          .map(participant => studentMap[participant.registration_id])
          .filter(Boolean);

        return {
          id: event.id,
          title: event.event_type,
          start: event.event_date,
          end: new Date(new Date(event.event_date).getTime() + 60 * 60 * 1000),
          backgroundColor: typeDetails.color,
          borderColor: typeDetails.color,
          extendedProps: {
            ageGroup: event.age_group,
            description: event.custom_description,
            eventType: event.event_type,
            currentCapacity: students.length,
            maxCapacity: event.max_capacity,
            typeDetails,
            students,
            originalEvent: event // Store original event data for copying
          }
        };
      });

      setEvents(formattedEvents);
      
      // Group events by day and type
      groupEventsByDayAndType(formattedEvents);
    } catch (error) {
      console.error(language === 'tr' ? 'Etkinlikler getirilirken hata:' : 'Error fetching events:', error);
    }
  };

  // Group events by day and type
  const groupEventsByDayAndType = (events) => {
    // Group events by day and type
    const groupedByDayAndType = {};
    
    events.forEach(event => {
      const date = new Date(event.start);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const eventType = event.extendedProps.eventType;
      
      if (!groupedByDayAndType[dateKey]) {
        groupedByDayAndType[dateKey] = {};
      }
      
      if (!groupedByDayAndType[dateKey][eventType]) {
        groupedByDayAndType[dateKey][eventType] = {
          count: 0,
          events: [],
          typeDetails: event.extendedProps.typeDetails,
          color: event.backgroundColor
        };
      }
      
      groupedByDayAndType[dateKey][eventType].count += 1;
      groupedByDayAndType[dateKey][eventType].events.push(event);
    });
    
    // Convert groups to FullCalendar format
    const groupedEvents = [];
    
    Object.keys(groupedByDayAndType).forEach(dateKey => {
      const [year, month, day] = dateKey.split('-').map(Number);
      
      Object.keys(groupedByDayAndType[dateKey]).forEach(eventType => {
        const group = groupedByDayAndType[dateKey][eventType];
        
        // Group all event types (even if count is 1)
        const date = new Date(year, month, day);
        
        groupedEvents.push({
          id: `group-${dateKey}-${eventType}`,
          title: `${group.count} ${group.typeDetails.label}`,
          start: date,
          backgroundColor: group.color,
          borderColor: group.color,
          display: 'block',
          extendedProps: {
            isGrouped: true,
            count: group.count,
            eventType,
            typeDetails: group.typeDetails,
            originalEvents: group.events
          }
        });
      });
    });
    
    setGroupedEvents(groupedEvents);
  };

  // Load events when component mounts and when new events are added
  useEffect(() => {
    fetchEvents();
  }, []);

  // Render event content
  const renderEventContent = (eventInfo) => {
    const { typeDetails, currentCapacity, maxCapacity, ageGroup, students, description, isGrouped, count } = eventInfo.event.extendedProps;
    
    // Ay görünümünde ve gruplandırılmış etkinlik ise
    if (eventInfo.view.type === 'dayGridMonth' && isGrouped) {
      return (
        <div className="grouped-event-card w-full h-full flex items-center justify-center text-white font-medium">
          <span className="text-sm">{count} {typeDetails.label}</span>
        </div>
      );
    }
    
    // Normal etkinlik görünümü
    return (
      <div className="event-card w-full h-full flex flex-row text-white overflow-hidden">
        {/* Dikey Başlık - Sol Üstte */}
        <div className="event-title">
          {typeDetails.label}
        </div>
        
        {/* İçerik Alanı */}
        <div className="event-content">
          {/* Bilgiler */}
          <div className="flex flex-col gap-1.5 text-xs">
            {/* Saat */}
            <div className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-md shadow-sm w-fit">
              <ClockIcon className="w-3 h-3 text-white/70" />
              <span className="font-medium">
                {new Date(eventInfo.event.start).toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            
            {/* Yaş Grubu */}
            <div className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-md shadow-sm w-fit">
              <AcademicCapIcon className="w-3 h-3 text-white/70" />
              <span className="font-medium">{formatAgeGroup(ageGroup)}</span>
            </div>
            
            {/* Kapasite */}
            <div className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-md shadow-sm w-fit">
              <UserGroupIcon className="w-3 h-3 text-white/70" />
              <span className="font-medium">{currentCapacity}/5</span>
            </div>
          </div>

          {/* Açıklama (Özel etkinlik için) */}
          {description && (
            <div className="mt-1 text-xs italic opacity-90 line-clamp-1">
              {description}
            </div>
          )}

          {/* Öğrenci Listesi - Hover durumunda görünecek */}
          {students && students.length > 0 && (
            <div className="student-list mt-1 pt-1 border-t border-white/20 text-xs">
              <div className="student-list-items space-y-0.5 max-h-20 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/30">
                {students.map((student, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
                    <span className="truncate">{student}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Tarih seçildiğinde
  const handleDateSelect = (selectInfo) => {
    // Seçilen tarih ve saati al
    const selectedDateTime = new Date(selectInfo.startStr);
    const selectedHour = selectedDateTime.getHours().toString().padStart(2, '0');
    const selectedMinute = selectedDateTime.getMinutes().toString().padStart(2, '0');
    
    // Seçilen dakikayı en yakın 15'in katına yuvarla (00, 15, 30, 45)
    const roundedMinute = Math.round(selectedMinute / 15) * 15;
    const formattedMinute = (roundedMinute === 60 ? 0 : roundedMinute).toString().padStart(2, '0');
    
    setSelectedDate(selectInfo.startStr);
    
    // Ay görünümünde (dayGridMonth) ise dakika seçilmesin
    const isMonthView = selectInfo.view.type === 'dayGridMonth';
    
    // Seçilen saat bilgisini de sakla
    setSelectedTime({
      hour: selectedHour,
      minute: isMonthView ? '' : formattedMinute
    });
    
    setIsModalOpen(true);
  };

  // Modal'ı kapat
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
    setSelectedTime({
      hour: '00',
      minute: '00'
    });
  };

  // Toast gösterme fonksiyonu
  const showToast = (message, type = 'success') => {
    setToast({
      message,
      type,
      isVisible: true
    });
  };

  // Toast kapatma fonksiyonu
  const closeToast = () => {
    setToast(prev => ({
      ...prev,
      isVisible: false
    }));
  };

  // Etkinlik oluşturulduğunda
  const handleCreateEvent = async (formData) => {
    try {
      if (!formData || !formData.date) {
        throw new Error(language === 'tr' ? 'Geçersiz form verisi' : 'Invalid form data');
      }

      // Tarih ve saat bilgisini birleştir
      const eventDateTime = new Date(formData.date);
      if (isNaN(eventDateTime.getTime())) {
        throw new Error(language === 'tr' ? 'Geçersiz tarih formatı' : 'Invalid date format');
      }

      eventDateTime.setHours(parseInt(formData.time.hour) || 0);
      eventDateTime.setMinutes(parseInt(formData.time.minute) || 0);

      // Aynı saatte başka etkinlik var mı kontrol et
      const { data: existingEvents, error: checkError } = await supabase
        .from('events')
        .select('id, event_date')
        .eq('is_active', true);

      if (checkError) throw checkError;

      // Aynı tarih ve saatte etkinlik var mı kontrol et
      const conflictingEvent = existingEvents.find(event => {
        const existingDate = new Date(event.event_date);
        return (
          existingDate.getFullYear() === eventDateTime.getFullYear() &&
          existingDate.getMonth() === eventDateTime.getMonth() &&
          existingDate.getDate() === eventDateTime.getDate() &&
          existingDate.getHours() === eventDateTime.getHours() &&
          existingDate.getMinutes() === eventDateTime.getMinutes()
        );
      });

      if (conflictingEvent) {
        throw new Error(
          language === 'tr' 
            ? 'Bu tarih ve saatte başka bir etkinlik zaten mevcut. Lütfen farklı bir saat seçin.' 
            : 'There is already another event at this date and time. Please select a different time.'
        );
      }

      // Form verilerini kontrol et
      const eventData = {
        event_date: eventDateTime.toISOString(),
        age_group: formData.ageGroup || '',
        event_type: formData.eventType || '',
        custom_description: formData.eventType === 'ozel' ? formData.customDescription : null,
        max_capacity: 10,
        current_capacity: 0 // Başlangıçta 0 olmalı, trigger katılımcılar eklendiğinde bu değeri arttıracak
      };

      // Zorunlu alanları kontrol et
      if (!eventData.age_group || !eventData.event_type) {
        throw new Error(language === 'tr' ? 'Zorunlu alanlar eksik' : 'Required fields are missing');
      }

      // Supabase'e etkinlik kaydetme işlemi
      const { data: eventResult, error: eventError } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (eventError) throw eventError;

      if (!eventResult) {
        throw new Error(language === 'tr' ? 'Etkinlik oluşturma başarısız' : 'Event creation failed');
      }

      // Katılımcıları ekle
      if (Array.isArray(formData.students) && formData.students.length > 0) {
        const participantInserts = formData.students.map(student => ({
          event_id: eventResult.id,
          registration_id: student.value
        }));

        const { error: participantError } = await supabase
          .from('event_participants')
          .insert(participantInserts);

        if (participantError) throw participantError;
      }

      // Başarı mesajı göster
      showToast(
        language === 'tr' ? 'Etkinlik başarıyla oluşturuldu' : 'Event created successfully', 
        'success'
      );

      // Etkinlikleri yeniden yükle
      await fetchEvents();
      handleCloseModal();
    } catch (error) {
      console.error(language === 'tr' ? 'Etkinlik oluşturulurken hata:' : 'Error creating event:', error);
      showToast(error.message, 'error');
    }
  };

  // Etkinliğe tıklandığında
  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    
    // Gruplandırılmış etkinlik ise ve ay görünümündeyse, hafta görünümüne geç
    if (event.extendedProps.isGrouped && clickInfo.view.type === 'dayGridMonth') {
      const calendarApi = clickInfo.view.calendar;
      calendarApi.changeView('timeGridWeek', event.start);
      return;
    }
    
    // Gruplandırılmış değilse etkinlik düzenleme sheet'ini aç
    if (!event.extendedProps.isGrouped) {
      setSelectedEvent(event.id);
      setIsUpdateSheetOpen(true);
    }
  };

  // Görünüm değiştiğinde
  const handleViewDidMount = (viewInfo) => {
    const calendar = viewInfo.view.calendar;
    
    // Mevcut görünümün başlangıç tarihini sakla (hafta kopyalama için)
    setCurrentWeekRange(viewInfo.view.currentStart);
    
    // Ay görünümünde gruplandırılmış etkinlikleri göster ve sürüklemeyi devre dışı bırak
    if (viewInfo.view.type === 'dayGridMonth') {
      calendar.removeAllEventSources();
      calendar.addEventSource(groupedEvents);
      calendar.setOption('editable', false);
    } else {
      // Diğer görünümlerde normal etkinlikleri göster ve sürüklemeyi etkinleştir
      calendar.removeAllEventSources();
      calendar.addEventSource(events);
      calendar.setOption('editable', true);
    }
    
    // Mevcut görünümdeki etkinlikleri sakla (hafta kopyalama için)
    if (viewInfo.view.type === 'timeGridWeek') {
      const start = viewInfo.view.currentStart;
      const end = viewInfo.view.currentEnd;
      
      // Geçerli hafta içindeki etkinlikleri filtrele - düzeltilmiş sürüm
      const eventsInCurrentWeek = events.filter(event => {
        const eventDate = new Date(event.start);
        
        // Date.getTime() kullanarak milisaniye cinsinden karşılaştırma
        return eventDate.getTime() >= start.getTime() && 
               eventDate.getTime() < end.getTime();
      });
      
      setCurrentWeekEvents(eventsInCurrentWeek);
    }
  };

  // Etkinlik sürüklendiğinde
  const handleEventDrop = async (dropInfo) => {
    try {
      const event = dropInfo.event;
      const newDate = event.start;

      // Update event in Supabase
      const { error } = await supabase
        .from('events')
        .update({ event_date: newDate.toISOString() })
        .eq('id', event.id);

      if (error) {
        dropInfo.revert();
        throw error;
      }

      // Show success message
      showToast(
        language === 'tr' ? 'Etkinlik başarıyla taşındı' : 'Event moved successfully', 
        'success'
      );

      // Reload events
      await fetchEvents();
    } catch (error) {
      console.error(
        language === 'tr' ? 'Etkinlik taşınırken hata:' : 'Error moving event:', 
        error
      );
      showToast(
        language === 'tr' ? 'Etkinlik taşınırken bir hata oluştu' : 'An error occurred while moving the event', 
        'error'
      );
      dropInfo.revert();
    }
  };

  // Haftayı kopyalama işlevi
  const handleCopyWeekClick = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const view = calendarApi.view;
      
      // Hafta görünümünde değilse, hafta görünümüne geç
      if (view.type !== 'timeGridWeek') {
        calendarApi.changeView('timeGridWeek');
        
        // Görünüm değiştikten sonra modalı açmak için kısa bir gecikme ekle
        setTimeout(() => {
          
          // Gecikme sonrası yeni görünümdeki etkinlikleri kontrol et
          const updatedView = calendarApi.view;
          const start = updatedView.currentStart;
          const end = updatedView.currentEnd;
          
          // Geçerli hafta içindeki etkinlikleri filtrele - düzeltilmiş sürüm
          const updatedCurrentWeekEvents = events.filter(event => {
            const eventDate = new Date(event.start);
            
            // Date.getTime() kullanarak milisaniye cinsinden karşılaştırma
            return eventDate.getTime() >= start.getTime() && 
                   eventDate.getTime() < end.getTime();
          });
          
          console.log(`Kopyalanacak etkinlikler: ${updatedCurrentWeekEvents.length} adet`);
          setCurrentWeekEvents(updatedCurrentWeekEvents);
          setCurrentWeekRange(start);
          setIsCopyWeekModalOpen(true);
        }, 500); // 300 yerine 500ms daha güvenli olabilir
        return;
      }
      
      // Güncellenen mevcut hafta etkinliklerini kontrol et - düzeltilmiş sürüm
      const start = view.currentStart;
      const end = view.currentEnd;
      
      const updatedCurrentWeekEvents = events.filter(event => {
        const eventDate = new Date(event.start);
        
        // Date.getTime() kullanarak milisaniye cinsinden karşılaştırma
        return eventDate.getTime() >= start.getTime() && 
               eventDate.getTime() < end.getTime();
      });
      
      console.log(`Kopyalanacak etkinlikler: ${updatedCurrentWeekEvents.length} adet. Hafta: ${format(start, 'yyyy-MM-dd')} - ${format(end, 'yyyy-MM-dd')}`);
      
      // events dizisinin boş olup olmadığını kontrol et
      if (events.length === 0) {
        console.warn('DİKKAT: Genel etkinlik listesi boş!');
      }
      
      // Debug: Tüm etkinliklerin tarihlerini kontrol et
      if (updatedCurrentWeekEvents.length === 0 && events.length > 0) {
        console.log('Neden etkinlik bulunamadı? Tüm etkinlik tarihleri:');
        events.forEach((event, index) => {
          console.log(`Etkinlik ${index}: ${new Date(event.start).toISOString()} (${event.extendedProps.eventType})`);
        });
        
        console.log(`Aranan tarih aralığı: ${start.toISOString()} - ${end.toISOString()}`);
      }
      
      setCurrentWeekEvents(updatedCurrentWeekEvents);
      setCurrentWeekRange(start);
      setIsCopyWeekModalOpen(true);
    }
  };

  // Kopya modalını kapat
  const handleCloseCopyWeekModal = () => {
    setIsCopyWeekModalOpen(false);
    setHasConflictsInTargetWeek(false);
  };

  // Haftayı kopyalama işlemini gerçekleştir
  const handleCopyWeek = async (targetWeekStart) => {
    try {
      setCopyWeekLoading(true);
      
      console.log(`Kopyalama başlıyor. Etkinlik sayısı: ${currentWeekEvents.length}`);
      console.log(`Mevcut hafta: ${currentWeekRange ? new Date(currentWeekRange).toISOString() : 'undefined'}`);
      console.log(`Hedef hafta: ${targetWeekStart.toISOString()}`);
      
      // Kopyalanacak hafta boşsa, komple events'tan kontrol edelim
      if (!currentWeekEvents || currentWeekEvents.length === 0) {
        // Son bir kurtarma denemesi - mevcut takvim görünümünü manuel olarak kontrol et
        if (calendarRef.current) {
          const calendarApi = calendarRef.current.getApi();
          const view = calendarApi.view;
          
          if (view.type === 'timeGridWeek') {
            const start = view.currentStart;
            const end = view.currentEnd;
            
            // Geçerli hafta içindeki etkinlikleri filtrele - son deneme
            const rescueEvents = events.filter(event => {
              const eventDate = new Date(event.start);
              
              // Sadece gün, ay, yıl karşılaştırması yapalım
              const eventDay = eventDate.getDate();
              const eventMonth = eventDate.getMonth();
              const eventYear = eventDate.getFullYear();
              
              // Tarih aralığındaki günleri kontrol et
              for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                if (d.getDate() === eventDay && 
                    d.getMonth() === eventMonth && 
                    d.getFullYear() === eventYear) {
                  return true;
                }
              }
              return false;
            });
            
            console.log(`Son deneme kurtarma: ${rescueEvents.length} etkinlik bulundu`);
            
            if (rescueEvents.length > 0) {
              // Kurtarma başarılı, bu etkinlikleri kullan
              setCurrentWeekEvents(rescueEvents);
              
              // Bu değişkeni kullanarak devam et
              const currentWeekEventsToUse = rescueEvents;
              
              // Hedef haftanın bitiş tarihini hesapla
              const targetWeekEnd = addDays(new Date(targetWeekStart), 7);
              
              // Hedef haftadaki mevcut etkinlikleri getir
              const { data: existingEventsInTargetWeek, error: existingEventsError } = await supabase
                .from('events')
                .select('event_date')
                .eq('is_active', true)
                .gte('event_date', targetWeekStart.toISOString())
                .lt('event_date', targetWeekEnd.toISOString());
                
              if (existingEventsError) throw existingEventsError;
              
              // Günlerin farkını hesapla (bir hafta sonra olacak)
              const daysDiff = Math.round((targetWeekStart - new Date(currentWeekRange)) / (1000 * 60 * 60 * 24));
              
              // Başarıyla kopyalanan etkinlik sayacı
              let successCount = 0;
              let conflictCount = 0;
              
              // Her etkinlik için kopyalama işlemi
              for (const event of currentWeekEventsToUse) {
                // Etkinliğin yeni tarihini hesapla
                const eventDate = new Date(event.start);
                const newEventDate = addDays(eventDate, daysDiff);
                
                // Hedef tarihte zaten etkinlik var mı kontrol et (saat ve dakika bazında)
                const hasConflict = existingEventsInTargetWeek.some(existingEvent => {
                  const existingEventDate = new Date(existingEvent.event_date);
                  return (
                    existingEventDate.getFullYear() === newEventDate.getFullYear() &&
                    existingEventDate.getMonth() === newEventDate.getMonth() &&
                    existingEventDate.getDate() === newEventDate.getDate() &&
                    existingEventDate.getHours() === newEventDate.getHours() &&
                    existingEventDate.getMinutes() === newEventDate.getMinutes()
                  );
                });
                
                // Çakışma varsa bu etkinliği atla
                if (hasConflict) {
                  conflictCount++;
                  continue;
                }
                
                // Orijinal etkinlik verisini al
                const originalEvent = event.extendedProps.originalEvent;
                
                if (!originalEvent) continue;
                
                // Yeni etkinlik verisi oluştur
                const newEventData = {
                  event_date: newEventDate.toISOString(),
                  age_group: originalEvent.age_group,
                  event_type: originalEvent.event_type,
                  custom_description: originalEvent.custom_description,
                  max_capacity: originalEvent.max_capacity,
                  current_capacity: 0 // Başlangıçta 0 olmalı, trigger katılımcılar eklendiğinde bu değeri arttıracak
                };
                
                // Etkinliği veritabanına ekle
                const { data: newEvent, error: newEventError } = await supabase
                  .from('events')
                  .insert([newEventData])
                  .select()
                  .single();
                  
                if (newEventError) throw newEventError;
                
                // Katılımcıları kopyala
                if (originalEvent.event_participants && originalEvent.event_participants.length > 0) {
                  const participantInserts = originalEvent.event_participants.map(participant => ({
                    event_id: newEvent.id,
                    registration_id: participant.registration_id
                  }));
                  
                  const { error: participantError } = await supabase
                    .from('event_participants')
                    .insert(participantInserts);
                    
                  if (participantError) throw participantError;
                }
                
                successCount++;
              }
              
              // Tüm etkinlikler kopyalandı
              setCopyWeekLoading(false);
              setIsCopyWeekModalOpen(false);
              
              // Başarı mesajı göster
              if (successCount > 0) {
                let message = `${successCount} etkinlik başarıyla kopyalandı`;
                if (conflictCount > 0) {
                  message += `, ${conflictCount} etkinlik çakışma nedeniyle atlandı`;
                }
                setToast({
                  message,
                  type: 'success',
                  isVisible: true
                });
                
                // Etkinlikleri yeniden yükle
                await fetchEvents();
                
                // Takvim görünümünü kopyalanan haftaya çevirme işlemi yerine bildirim göster
                setTargetWeekForNavigation(targetWeekStart);
                setActionNotificationMessage(`Etkinlikler ${format(targetWeekStart, 'dd MMMM yyyy', { locale: tr })} - ${format(addDays(targetWeekStart, 6), 'dd MMMM yyyy', { locale: tr })} tarihlerine kopyalandı.`);
                setIsActionNotificationVisible(true);
              } else if (conflictCount > 0) {
                setToast({
                  message: `Kopyalama tamamlandı, ancak ${conflictCount} etkinlik çakışma nedeniyle kopyalanamadı`,
                  type: 'warning',
                  isVisible: true
                });
              } else {
                setToast({
                  message: 'Kopyalanacak etkinlik bulunamadı',
                  type: 'error',
                  isVisible: true
                });
              }
              
              return; // Kurtarma başarılı, işlemi tamamla ve çık
            }
          }
        }
        
        showToast('Bu haftada kopyalanacak etkinlik bulunamadı', 'error');
        setCopyWeekLoading(false);
        setIsCopyWeekModalOpen(false);
        return;
      }
      
      // Hedef haftanın bitiş tarihini hesapla
      const targetWeekEnd = addDays(new Date(targetWeekStart), 7);
      
      // Hedef haftadaki mevcut etkinlikleri getir
      const { data: existingEventsInTargetWeek, error: existingEventsError } = await supabase
        .from('events')
        .select('event_date')
        .eq('is_active', true)
        .gte('event_date', targetWeekStart.toISOString())
        .lt('event_date', targetWeekEnd.toISOString());
        
      if (existingEventsError) throw existingEventsError;
      
      // Günlerin farkını hesapla (bir hafta sonra olacak)
      const daysDiff = Math.round((targetWeekStart - new Date(currentWeekRange)) / (1000 * 60 * 60 * 24));
      
      // Başarıyla kopyalanan etkinlik sayacı
      let successCount = 0;
      let conflictCount = 0;
      
      // Her etkinlik için kopyalama işlemi
      for (const event of currentWeekEvents) {
        // Etkinliğin yeni tarihini hesapla
        const eventDate = new Date(event.start);
        const newEventDate = addDays(eventDate, daysDiff);
        
        // Hedef tarihte zaten etkinlik var mı kontrol et (saat ve dakika bazında)
        const hasConflict = existingEventsInTargetWeek.some(existingEvent => {
          const existingEventDate = new Date(existingEvent.event_date);
          return (
            existingEventDate.getFullYear() === newEventDate.getFullYear() &&
            existingEventDate.getMonth() === newEventDate.getMonth() &&
            existingEventDate.getDate() === newEventDate.getDate() &&
            existingEventDate.getHours() === newEventDate.getHours() &&
            existingEventDate.getMinutes() === newEventDate.getMinutes()
          );
        });
        
        // Çakışma varsa bu etkinliği atla
        if (hasConflict) {
          conflictCount++;
          continue;
        }
        
        // Orijinal etkinlik verisini al
        const originalEvent = event.extendedProps.originalEvent;
        
        if (!originalEvent) continue;
        
        // Yeni etkinlik verisi oluştur
        const newEventData = {
          event_date: newEventDate.toISOString(),
          age_group: originalEvent.age_group,
          event_type: originalEvent.event_type,
          custom_description: originalEvent.custom_description,
          max_capacity: originalEvent.max_capacity,
          current_capacity: 0 // Başlangıçta 0 olmalı, trigger katılımcılar eklendiğinde bu değeri arttıracak
        };
        
        // Etkinliği veritabanına ekle
        const { data: newEvent, error: newEventError } = await supabase
          .from('events')
          .insert([newEventData])
          .select()
          .single();
          
        if (newEventError) throw newEventError;
        
        // Katılımcıları kopyala
        if (originalEvent.event_participants && originalEvent.event_participants.length > 0) {
          const participantInserts = originalEvent.event_participants.map(participant => ({
            event_id: newEvent.id,
            registration_id: participant.registration_id
          }));
          
          const { error: participantError } = await supabase
            .from('event_participants')
            .insert(participantInserts);
            
          if (participantError) throw participantError;
        }
        
        successCount++;
      }
      
      // Tüm etkinlikler kopyalandı
      setCopyWeekLoading(false);
      setIsCopyWeekModalOpen(false);
      
      // Başarı mesajı göster
      if (successCount > 0) {
        let message = `${successCount} etkinlik başarıyla kopyalandı`;
        if (conflictCount > 0) {
          message += `, ${conflictCount} etkinlik çakışma nedeniyle atlandı`;
        }
        setToast({
          message,
          type: 'success',
          isVisible: true
        });
        
        // Etkinlikleri yeniden yükle
        await fetchEvents();
        
        // Takvim görünümünü kopyalanan haftaya çevirme işlemi yerine bildirim göster
        setTargetWeekForNavigation(targetWeekStart);
        setActionNotificationMessage(`Etkinlikler ${format(targetWeekStart, 'dd MMMM yyyy', { locale: tr })} - ${format(addDays(targetWeekStart, 6), 'dd MMMM yyyy', { locale: tr })} tarihlerine kopyalandı.`);
        setIsActionNotificationVisible(true);
      } else if (conflictCount > 0) {
        setToast({
          message: `Kopyalama tamamlandı, ancak ${conflictCount} etkinlik çakışma nedeniyle kopyalanamadı`,
          type: 'warning',
          isVisible: true
        });
      } else {
        setToast({
          message: 'Kopyalanacak etkinlik bulunamadı',
          type: 'error',
          isVisible: true
        });
      }
    } catch (error) {
      console.error('Hafta kopyalanırken hata:', error);
      setCopyWeekLoading(false);
      setIsCopyWeekModalOpen(false);
      showToast('Hafta kopyalanırken bir hata oluştu: ' + error.message, 'error');
    }
  };

  // Hedef haftaya gitme işlemi
  const navigateToTargetWeek = () => {
    if (targetWeekForNavigation && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(targetWeekForNavigation);
    }
  };

  // Hafta görünümündeyken ve takvim yüklendikten sonra "Bu Haftayı Kopyala" ikonunu ekle
  useEffect(() => {
    const addCopyWeekButton = () => {
      if (!calendarRef.current) return;
      
      // Takvim başlığını içeren elementi bul
      const titleElement = document.querySelector('.fc-toolbar-title');
      if (!titleElement) return;

      // Eğer daha önce eklenmiş bir ikon varsa kaldır
      const existingIcon = document.getElementById('copy-week-icon');
      if (existingIcon) existingIcon.remove();

      // Yeni ikon oluştur
      const iconContainer = document.createElement('div');
      iconContainer.classList.add('relative', 'inline-flex', 'ml-2', 'items-center');
      iconContainer.id = 'copy-week-icon';
      
      // İkon elementi
      const iconElement = document.createElement('button');
      iconElement.classList.add(
        'inline-flex', 'items-center', 'justify-center', 
        'w-7', 'h-7', 'bg-white', 'dark:bg-[#121621]', 
        'border', 'border-[#d2d2d7]', 'dark:border-[#2a3241]', 
        'rounded-full', 'text-[#6e6e73]', 'dark:text-[#86868b]',
        'hover:text-[#1d1d1f]', 'dark:hover:text-white',
        'hover:border-[#0071e3]', 'dark:hover:border-[#0071e3]',
        'transition-all', 'duration-200', 'cursor-pointer',
        'group'
      );
      
      // SVG ikonu
      iconElement.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z" />
        </svg>
      `;
      
      // Tooltip ekle
      const tooltip = document.createElement('div');
      tooltip.classList.add(
        'absolute', 'bottom-full', 'left-1/2', 'transform', '-translate-x-1/2', 'mb-2',
        'px-2', 'py-1', 'bg-gray-800', 'dark:bg-gray-700', 'text-white', 'text-xs',
        'rounded', 'opacity-0', 'group-hover:opacity-100', 'transition-opacity',
        'duration-200', 'whitespace-nowrap', 'pointer-events-none', 'z-10'
      );
      tooltip.textContent = 'Bu Haftayı Kopyala';
      
      // İkon tıklama işlevi
      iconElement.addEventListener('click', handleCopyWeekClick);
      
      // Elementleri birleştir
      iconContainer.appendChild(iconElement);
      iconContainer.appendChild(tooltip);
      
      // Başlık elementinin yanına ekle
      titleElement.appendChild(iconContainer);
    };
    
    // İlk yükleme ve görünüm değişikliklerinde ikonu ekle
    addCopyWeekButton();
    
    // FullCalendar görünümü değiştiğinde de ikonu tekrar ekle
    const handleViewChange = () => {
      setTimeout(addCopyWeekButton, 100);
    };
    
    window.addEventListener('resize', handleViewChange);
    document.addEventListener('visibilitychange', handleViewChange);
    
    // Temizleme
    return () => {
      window.removeEventListener('resize', handleViewChange);
      document.removeEventListener('visibilitychange', handleViewChange);
    };
  }, []);

  return (
    <div className="min-h-screen text-[#1d1d1f] dark:text-[#f5f5f7]">
      {/* Header */}
      <div className="flex flex-wrap sm:flex-row items-start sm:items-center justify-between h-auto sm:h-16 px-6 border-b border-[#d2d2d7] dark:border-[#2a3241] py-4 sm:py-0 gap-4 sm:gap-0 bg-white dark:bg-[#1a1f2e] mb-6 rounded-t-xl">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium text-[#1d1d1f] dark:text-white">
            {language === 'tr' ? 'Takvim' : 'Calendar'}
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          <a 
            href="/hellokido/#/takvim" 
            target="_blank" 
            rel="noopener noreferrer"
            className="h-10 sm:h-8 px-3 bg-purple-100 dark:bg-purple-800/20 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/30 focus:outline-none transition-all duration-200 flex items-center justify-center gap-1.5 w-full sm:w-auto transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <CalendarDaysIcon className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'Herkese Açık Takvim' : 'Public Calendar'}</span>
            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
          </a>
          <button
            onClick={() => {
              setSelectedTime({
                hour: '',
                minute: ''
              });
              setIsModalOpen(true);
            }}
            className="h-10 sm:h-8 px-4 bg-[#1d1d1f] dark:bg-[#0071e3] text-white text-sm font-medium rounded-lg hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{language === 'tr' ? 'Yeni Etkinlik' : 'New Event'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          buttonText={{
            today: language === 'tr' ? 'Bugün' : 'Today',
            month: language === 'tr' ? 'Ay' : 'Month',
            week: language === 'tr' ? 'Hafta' : 'Week',
            day: language === 'tr' ? 'Gün' : 'Day'
          }}
          buttonClassNames="h-9 px-4 rounded-lg text-sm font-medium bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] transition-colors whitespace-nowrap"
          locale={language === 'tr' ? trLocale : enLocale}
          selectable={true}
          select={handleDateSelect}
          events={events}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          viewDidMount={handleViewDidMount}
          editable={true} // Required for drag-and-drop
          eventDrop={handleEventDrop} // Drag-and-drop handler
          dragScroll={true} // Auto-scroll during dragging
          snapDuration="00:15:00" // Place at 15-minute intervals
          eventDragStart={(info) => info.el.classList.add('event-dragging')} // Add class when dragging starts
          eventDragStop={(info) => info.el.classList.remove('event-dragging')} // Remove class when dragging ends
          droppable={true} // For external dragging (can be used in the future)
          dropAccept=".fc-event" // Accept only events
          height="auto"
          contentHeight="auto"
          aspectRatio={1.8}
          firstDay={1}
          slotMinTime="09:00:00"
          slotMaxTime="19:00:00"
          expandRows={true}
          stickyHeaderDates={true}
          dayMaxEvents={3}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          allDaySlot={false}
          slotDuration="00:30:00"
          slotLabelInterval="01:00"
          eventClassNames="overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow"
        />
      </div>

      {/* Create Event Modal */}
      <CreateEvent
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleCreateEvent}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
      />

      {/* Etkinlik Düzenleme Sheet */}
      <UpdateEventSheet
        isOpen={isUpdateSheetOpen}
        onClose={() => setIsUpdateSheetOpen(false)}
        onSuccess={(message, type = 'success') => {
          setToast({
            message,
            type,
            isVisible: true
          });
          fetchEvents();
        }}
        eventId={selectedEvent}
      />

      {/* Hafta Kopyalama Modal */}
      <CopyWeekModal 
        isOpen={isCopyWeekModalOpen}
        onClose={handleCloseCopyWeekModal}
        onConfirm={handleCopyWeek}
        currentWeekStart={currentWeekRange}
        hasConflicts={hasConflictsInTargetWeek}
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={closeToast}
      />

      {/* Action Notification */}
      <ActionNotification 
        isVisible={isActionNotificationVisible}
        message={actionNotificationMessage}
        actionText={language === 'tr' ? "Kopyalanan Haftaya Git" : "Go to Copied Week"}
        onAction={navigateToTargetWeek}
        onClose={() => setIsActionNotificationVisible(false)}
      />
    </div>
  );
};

export default Calendar; 