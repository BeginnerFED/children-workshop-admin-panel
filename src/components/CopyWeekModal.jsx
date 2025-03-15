import React, { useState, useEffect } from 'react'
import { 
  XMarkIcon, 
  CalendarDaysIcon,
  ExclamationCircleIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'
import DatePicker, { registerLocale } from 'react-datepicker'
import { tr } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import { format, addWeeks, startOfWeek } from 'date-fns'

// Türkçe lokalizasyonu kaydet
registerLocale('tr', tr)

export default function CopyWeekModal({
  isOpen,
  onClose,
  onConfirm,
  currentWeekStart,
  hasConflicts = false
}) {
  // Tarih seçeneği: 1 hafta sonra, 2 hafta sonra, özel tarih
  const [targetOption, setTargetOption] = useState('next-week')
  const [customDate, setCustomDate] = useState(addWeeks(new Date(currentWeekStart), 1))
  const [isLoading, setIsLoading] = useState(false)
  
  // Seçilen hedef tarihi hesapla
  const getTargetWeekStart = () => {
    if (targetOption === 'next-week') {
      return addWeeks(new Date(currentWeekStart), 1)
    } else if (targetOption === 'after-next-week') {
      return addWeeks(new Date(currentWeekStart), 2)
    } else {
      // Özel tarih seçildiğinde, o haftanın başlangıcını döndür
      return startOfWeek(new Date(customDate), { weekStartsOn: 1 }) // Pazartesi başlangıç
    }
  }
  
  // Tarih formatlama
  const formatDate = (date) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: tr })
  }
  
  // Modal kapandığında formu sıfırla
  useEffect(() => {
    if (!isOpen) {
      setTargetOption('next-week')
      setCustomDate(addWeeks(new Date(currentWeekStart), 1))
      setIsLoading(false)
    }
  }, [isOpen, currentWeekStart])
  
  // Onaylama işlemi
  const handleConfirm = () => {
    setIsLoading(true)
    
    // Hedef haftanın başlangıç tarihini hesapla
    const targetDate = getTargetWeekStart()
    
    // Onaylama işlemini başlat
    onConfirm(targetDate)
  }
  
  // Overlay içeriği
  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-40 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-white dark:bg-[#121621] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#d2d2d7] dark:border-[#2a3241]">
            <div className="flex items-center gap-3">
              <DocumentDuplicateIcon className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
              <h2 className="font-medium text-lg text-[#1d1d1f] dark:text-white">
                Bu Haftayı Kopyala
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#86868b] dark:hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {/* Kaynak Hafta Bilgisi */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-[#1d2535] rounded-xl">
              <div className="text-sm font-medium text-[#6e6e73] dark:text-[#86868b] mb-1">
                Kopyalanacak Hafta
              </div>
              <div className="text-base font-medium text-[#1d1d1f] dark:text-white">
                {formatDate(currentWeekStart)} haftası
              </div>
            </div>
            
            {/* Radyo Grup */}
            <div className="mb-6">
              <div className="text-sm font-medium text-[#6e6e73] dark:text-[#86868b] mb-3">
                Kopyalama Hedefi
              </div>
              
              {/* Sonraki Hafta */}
              <label className="block mb-3 cursor-pointer">
                <div className={`
                  flex items-center p-4 border rounded-xl transition-colors
                  ${targetOption === 'next-week' 
                    ? 'border-[#0071e3] dark:border-[#0071e3] bg-blue-50/30 dark:bg-[#0071e3]/5' 
                    : 'border-[#d2d2d7] dark:border-[#2a3241] hover:bg-gray-50 dark:hover:bg-[#1d2535]/50'}
                `}>
                  <input
                    type="radio"
                    name="target-option"
                    value="next-week"
                    checked={targetOption === 'next-week'}
                    onChange={() => setTargetOption('next-week')}
                    className="sr-only"
                  />
                  <div className={`
                    w-5 h-5 rounded-full flex items-center justify-center border-2 mr-3
                    ${targetOption === 'next-week' 
                      ? 'border-[#0071e3] dark:border-[#0071e3]' 
                      : 'border-[#d2d2d7] dark:border-[#2a3241]'}
                  `}>
                    {targetOption === 'next-week' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#0071e3] dark:bg-[#0071e3]"></div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                      Sonraki Hafta
                    </div>
                    <div className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                      {formatDate(addWeeks(new Date(currentWeekStart), 1))} haftası
                    </div>
                  </div>
                </div>
              </label>
              
              {/* 2 Hafta Sonra */}
              <label className="block mb-3 cursor-pointer">
                <div className={`
                  flex items-center p-4 border rounded-xl transition-colors
                  ${targetOption === 'after-next-week' 
                    ? 'border-[#0071e3] dark:border-[#0071e3] bg-blue-50/30 dark:bg-[#0071e3]/5' 
                    : 'border-[#d2d2d7] dark:border-[#2a3241] hover:bg-gray-50 dark:hover:bg-[#1d2535]/50'}
                `}>
                  <input
                    type="radio"
                    name="target-option"
                    value="after-next-week"
                    checked={targetOption === 'after-next-week'}
                    onChange={() => setTargetOption('after-next-week')}
                    className="sr-only"
                  />
                  <div className={`
                    w-5 h-5 rounded-full flex items-center justify-center border-2 mr-3
                    ${targetOption === 'after-next-week' 
                      ? 'border-[#0071e3] dark:border-[#0071e3]' 
                      : 'border-[#d2d2d7] dark:border-[#2a3241]'}
                  `}>
                    {targetOption === 'after-next-week' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#0071e3] dark:bg-[#0071e3]"></div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                      2 Hafta Sonra
                    </div>
                    <div className="text-xs text-[#6e6e73] dark:text-[#86868b] mt-0.5">
                      {formatDate(addWeeks(new Date(currentWeekStart), 2))} haftası
                    </div>
                  </div>
                </div>
              </label>
              
              {/* Özel Tarih */}
              <label className="block cursor-pointer">
                <div className={`
                  p-4 border rounded-xl transition-colors
                  ${targetOption === 'custom-date' 
                    ? 'border-[#0071e3] dark:border-[#0071e3] bg-blue-50/30 dark:bg-[#0071e3]/5' 
                    : 'border-[#d2d2d7] dark:border-[#2a3241] hover:bg-gray-50 dark:hover:bg-[#1d2535]/50'}
                `}>
                  <div className="flex items-center mb-3">
                    <input
                      type="radio"
                      name="target-option"
                      value="custom-date"
                      checked={targetOption === 'custom-date'}
                      onChange={() => setTargetOption('custom-date')}
                      className="sr-only"
                    />
                    <div className={`
                      w-5 h-5 rounded-full flex items-center justify-center border-2 mr-3
                      ${targetOption === 'custom-date' 
                        ? 'border-[#0071e3] dark:border-[#0071e3]' 
                        : 'border-[#d2d2d7] dark:border-[#2a3241]'}
                    `}>
                      {targetOption === 'custom-date' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0071e3] dark:bg-[#0071e3]"></div>
                      )}
                    </div>
                    <div className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                      Özel Tarih
                    </div>
                  </div>
                  
                  {/* Tarih Seçici */}
                  <div className="relative">
                    <CalendarDaysIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6e6e73] dark:text-[#86868b] z-10 pointer-events-none" />
                    <DatePicker
                      selected={customDate}
                      onChange={date => setCustomDate(date)}
                      dateFormat="d MMMM yyyy"
                      locale="tr"
                      minDate={new Date()}
                      className={`
                        w-full h-10 pl-12 pr-4 rounded-xl border 
                        border-[#d2d2d7] dark:border-[#2a3241] 
                        bg-white dark:bg-[#121621] 
                        text-[#1d1d1f] dark:text-white 
                        focus:ring-2 focus:ring-[#0071e3] focus:border-transparent 
                        transition-all text-sm cursor-pointer
                        ${targetOption !== 'custom-date' ? 'opacity-50' : ''}
                      `}
                      disabled={targetOption !== 'custom-date'}
                      onFocus={() => setTargetOption('custom-date')}
                    />
                  </div>
                </div>
              </label>
            </div>
            
            {/* Çakışma Uyarısı */}
            {hasConflicts && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800/30">
                <div className="flex items-start gap-3">
                  <ExclamationCircleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      Çakışma Uyarısı
                    </div>
                    <div className="text-xs text-yellow-700 dark:text-yellow-300/80">
                      Seçtiğiniz haftada zaten etkinlikler mevcut. Etkinlikler kopyalanırken mevcut etkinliklerle çakışmalar kontrol edilecek. Çakışma durumunda, ilgili etkinlikler kopyalanmayacak.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#d2d2d7] dark:border-[#2a3241] flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-[#1d1d1f] dark:text-white bg-transparent border border-[#d2d2d7] dark:border-[#2a3241] text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-[#1d2535]/70 focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              İptal
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`px-4 py-2 bg-[#1d1d1f] dark:bg-[#0071e3] text-white text-sm font-medium rounded-lg hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none transition-all duration-200 flex items-center gap-2 disabled:cursor-not-allowed ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Kopyalanıyor...</span>
                </>
              ) : (
                <span>Haftayı Kopyala</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
} 