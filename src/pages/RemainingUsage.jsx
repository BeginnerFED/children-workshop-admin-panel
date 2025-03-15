import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, XMarkIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';

const RemainingUsage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [packageFilter, setPackageFilter] = useState('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('student_usage_summary')
        .select('*')
        .eq('is_active', true)
        .order('student_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDetailClick = (student) => {
    setSelectedStudent(student);
    setShowDetailView(true);
  };

  const handleCloseDetail = () => {
    setShowDetailView(false);
    setSelectedStudent(null);
  };

  const handleFilterClick = () => {
    if (showDetailView) {
      setShowDetailView(false);
      setSelectedStudent(null);
    }
    setIsFilterSheetOpen(true);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.parent_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPackage = packageFilter === 'all' || student.package_type === packageFilter;
    
    return matchesSearch && matchesPackage;
  });

  return (
    <div className={`flex flex-col ${showDetailView ? 'lg:mr-96' : ''} transition-all duration-300`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between h-auto sm:h-16 px-6 border-b border-[#d2d2d7] dark:border-[#2a3241] py-4 sm:py-0 gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium text-[#1d1d1f] dark:text-white">
            Kalan Kullanım
            <span className="ml-2 text-sm font-normal text-[#6e6e73] dark:text-[#86868b]">
              ({filteredStudents.length})
            </span>
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          {/* Arama */}
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
            <input
              type="text"
              placeholder="Öğrenci veya veli ismi ara"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 sm:h-8 pl-9 pr-4 rounded-lg text-sm border border-[#d2d2d7] dark:border-[#2a3241] bg-white/80 dark:bg-[#121621] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:ring-0 focus:border-[#0071e3] dark:focus:border-[#0071e3] transition-colors"
            />
          </div>

          {/* Filtre Butonu */}
          <button
            onClick={handleFilterClick}
            className="h-10 sm:h-8 px-3 bg-white dark:bg-[#121621] text-[#424245] dark:text-[#86868b] text-sm font-medium rounded-lg border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3] focus:outline-none transition-colors flex items-center justify-center gap-2 relative"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
            {packageFilter !== 'all' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#0071e3] rounded-full ring-2 ring-white dark:ring-[#121621]" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Tablo */}
        <div className="bg-white dark:bg-[#161b2c] rounded-2xl shadow-lg overflow-hidden border border-[#d2d2d7] dark:border-[#2a3241]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#d2d2d7] dark:border-[#2a3241]">
                  <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                        Öğrenci
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b] opacity-75">
                        Veli
                      </span>
                    </div>
                  </th>
                  <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                      Paket Türü
                    </span>
                  </th>
                  <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                      Kayıt Tarihi
                    </span>
                  </th>
                  <th className="py-4 px-6 text-left bg-[#f5f5f7]/50 dark:bg-[#161922]">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                      Bitiş Tarihi
                    </span>
                  </th>
                  <th className="py-4 px-6 text-center bg-[#f5f5f7]/50 dark:bg-[#161922]">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                      Kalan Ders
                    </span>
                  </th>
                  <th className="py-4 px-6 text-center bg-[#f5f5f7]/50 dark:bg-[#161922]">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                      Ödeme Durumu
                    </span>
                  </th>
                  <th className="py-4 px-6 text-right bg-[#f5f5f7]/50 dark:bg-[#161922] w-[100px]">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#6e6e73] dark:text-[#86868b]">
                      İşlemler
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d2d2d7] dark:divide-[#2a3241]">
                {loading ? (
                  // Skeleton Loading
                  [...Array(5)].map((_, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                          <div className="h-4 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-32 relative overflow-hidden">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                          </div>
                          <div className="h-3 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-24 relative overflow-hidden">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-7 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-lg w-24 relative overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-24 relative overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-md w-24 relative overflow-hidden">
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex justify-center">
                          <div className="h-6 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-full w-8 relative overflow-hidden">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex justify-center">
                          <div className="h-6 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-full w-20 relative overflow-hidden">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex justify-end">
                          <div className="h-8 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-lg w-16 relative overflow-hidden">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-[#f5f5f7] dark:bg-[#2a3241] rounded-full flex items-center justify-center mb-3">
                          <MagnifyingGlassIcon className="w-8 h-8 text-[#6e6e73] dark:text-[#86868b]" />
                        </div>
                        <p className="text-[#1d1d1f] dark:text-white font-medium mb-1">
                          Kayıt Bulunamadı
                        </p>
                        <p className="text-sm text-[#6e6e73] dark:text-[#86868b]">
                          {searchTerm ? 'Arama kriterlerinize uygun kayıt bulunamadı.' : 'Henüz kayıt eklenmemiş.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr 
                      key={student.registration_id} 
                      className="group hover:bg-[#f5f5f7] dark:hover:bg-[#161922]"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                            {student.student_name}
                          </span>
                          <span className="text-xs text-[#6e6e73] dark:text-[#86868b]">
                            {student.parent_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-[#0071e3]/5 to-[#34d399]/5 dark:from-[#0071e3]/10 dark:to-[#34d399]/10 text-[#0071e3] group-hover:from-[#0071e3]/10 group-hover:to-[#34d399]/10 dark:group-hover:from-[#0071e3]/20 dark:group-hover:to-[#34d399]/20 transition-all">
                          {student.package_type === 'hafta-1' ? 'Haftada 1'
                            : student.package_type === 'hafta-2' ? 'Haftada 2'
                            : student.package_type === 'hafta-3' ? 'Haftada 3'
                            : student.package_type === 'hafta-4' ? 'Haftada 4'
                            : 'Tek Seferlik'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#424245] dark:text-[#86868b]">
                          {format(new Date(student.package_start_date), 'dd.MM.yyyy', { locale: tr })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#424245] dark:text-[#86868b]">
                          {format(new Date(student.package_end_date), 'dd.MM.yyyy', { locale: tr })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-3 py-1.5 rounded-lg text-xs font-medium ring-1 ring-inset ${
                          student.remaining_lessons <= 0 
                            ? 'bg-red-400/10 text-red-700 ring-red-500/20 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20'
                            : student.remaining_lessons <= 2
                            ? 'bg-amber-400/10 text-amber-700 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20'
                            : 'bg-emerald-400/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20'
                        }`}>
                          {student.remaining_lessons}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-medium ring-1 ring-inset ${
                          student.payment_status === 'odendi'
                            ? 'bg-emerald-400/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20'
                            : 'bg-amber-400/10 text-amber-700 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20'
                        }`}>
                          {student.payment_status === 'odendi' ? 'Ödendi' : 'Beklemede'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDetailClick(student)}
                          className="inline-flex items-center justify-center h-8 px-4 text-xs font-medium rounded-lg bg-white dark:bg-[#121621] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:bg-[#1d1d1f] dark:hover:bg-[#0071e3] hover:text-white dark:hover:text-white hover:border-[#1d1d1f] dark:hover:border-[#0071e3] focus:outline-none transition-all duration-200"
                        >
                          Detay
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Filter Sheet */}
      <div className={`
        fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-[#121621] shadow-xl transform transition-transform duration-300 ease-in-out z-50
        ${isFilterSheetOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Sheet Header */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-[#d2d2d7] dark:border-[#2a3241] shrink-0">
            <h2 className="text-lg font-medium text-[#1d1d1f] dark:text-white">
              Filtreler
            </h2>
            <button
              onClick={() => setIsFilterSheetOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241]"
            >
              <XMarkIcon className="w-5 h-5 text-[#424245] dark:text-[#86868b]" />
            </button>
          </div>

          {/* Sheet Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Paket Türü */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white">
                Paket Türü
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPackageFilter('hafta-1')}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium
                    ${packageFilter === 'hafta-1'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  Haftada 1
                </button>
                <button
                  onClick={() => setPackageFilter('hafta-2')}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium
                    ${packageFilter === 'hafta-2'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  Haftada 2
                </button>
                <button
                  onClick={() => setPackageFilter('hafta-3')}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium 
                    ${packageFilter === 'hafta-3'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  Haftada 3
                </button>
                <button
                  onClick={() => setPackageFilter('hafta-4')}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium 
                    ${packageFilter === 'hafta-4'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  Haftada 4
                </button>
                <button
                  onClick={() => setPackageFilter('tek-seferlik')}
                  className={`
                    h-9 px-4 rounded-lg text-sm font-medium 
                    ${packageFilter === 'tek-seferlik'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white border border-[#d2d2d7] dark:border-[#2a3241] hover:border-[#0071e3] dark:hover:border-[#0071e3]'
                    }
                  `}
                >
                  Tek Seferlik
                </button>
              </div>
            </div>
          </div>

          {/* Sheet Footer */}
          <div className="px-6 py-4 border-t border-[#d2d2d7] dark:border-[#2a3241] shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setPackageFilter('all');
                  setIsFilterSheetOpen(false);
                }}
                className="flex-1 h-10 bg-gray-100 dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a3241] focus:outline-none"
              >
                Filtreleri Temizle
              </button>
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-1 h-10 bg-[#1d1d1f] dark:bg-[#0071e3] text-white font-medium rounded-xl hover:bg-black dark:hover:bg-[#0077ed] focus:outline-none "
              >
                Uygula
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isFilterSheetOpen && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40"
          onClick={() => setIsFilterSheetOpen(false)}
        />
      )}

      {/* Detail Panel */}
      <div className={`
        fixed inset-y-0 right-0 w-full lg:w-96 bg-white dark:bg-[#121621] shadow-xl transform transition-transform duration-300 ease-in-out z-50
        border-l border-[#d2d2d7] dark:border-[#2a3241]
        ${showDetailView ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Panel Header */}
          <div className="flex items-center gap-3 px-6 h-16 border-b border-[#d2d2d7] dark:border-[#2a3241] shrink-0">
            <button
              onClick={handleCloseDetail}
              className="lg:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241]"
            >
              <ChevronLeftIcon className="w-5 h-5 text-[#424245] dark:text-[#86868b]" />
            </button>
            <h2 className="text-lg font-medium text-[#1d1d1f] dark:text-white">
              Öğrenci Detayı
            </h2>
            <button
              onClick={handleCloseDetail}
              className="hidden lg:block ml-auto p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3241]"
            >
              <XMarkIcon className="w-5 h-5 text-[#424245] dark:text-[#86868b]" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedStudent && (
              <div className="space-y-6">
                {/* Temel Bilgiler */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white uppercase tracking-wider">
                    Temel Bilgiler
                  </h3>
                  <div className="grid grid-cols-1 gap-4 bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                    <div>
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        Öğrenci Adı
                      </label>
                      <span className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                        {selectedStudent.student_name}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        Veli Adı
                      </label>
                      <span className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                        {selectedStudent.parent_name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Paket Bilgileri */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white uppercase tracking-wider">
                    Paket Bilgileri
                  </h3>
                  <div className="grid grid-cols-1 gap-4 bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                    <div>
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        Paket Türü
                      </label>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-[#0071e3]/5 to-[#34d399]/5 dark:from-[#0071e3]/10 dark:to-[#34d399]/10 text-[#0071e3]">
                        {selectedStudent.package_type === 'hafta-1' ? 'Haftada 1'
                          : selectedStudent.package_type === 'hafta-2' ? 'Haftada 2'
                          : selectedStudent.package_type === 'hafta-3' ? 'Haftada 3'
                          : selectedStudent.package_type === 'hafta-4' ? 'Haftada 4'
                          : 'Tek Seferlik'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        Başlangıç Tarihi
                      </label>
                      <span className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                        {format(new Date(selectedStudent.package_start_date), 'dd MMMM yyyy', { locale: tr })}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        Bitiş Tarihi
                      </label>
                      <span className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                        {format(new Date(selectedStudent.package_end_date), 'dd MMMM yyyy', { locale: tr })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Katıldığı Dersler */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white uppercase tracking-wider">
                      Katıldığı Dersler
                    </h3>
                    <span className="text-xs text-[#6e6e73] dark:text-[#86868b]">
                      Son 30 gün
                    </span>
                  </div>
                  <div className="space-y-2">
                    {/* Dummy Veri */}
                    <div className="bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                            İngilizce Oyun Dersi
                          </span>
                          <span className="block text-xs text-[#6e6e73] dark:text-[#86868b]">
                            15 Mart 2024, 14:30
                          </span>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20 dark:ring-emerald-400/20">
                          Katıldı
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                            İngilizce Oyun Dersi
                          </span>
                          <span className="block text-xs text-[#6e6e73] dark:text-[#86868b]">
                            8 Mart 2024, 14:30
                          </span>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-400/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20 dark:ring-amber-400/20">
                          İptal Edildi
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="block text-sm font-medium text-[#1d1d1f] dark:text-white">
                            İngilizce Oyun Dersi (Telafi)
                          </span>
                          <span className="block text-xs text-[#6e6e73] dark:text-[#86868b]">
                            1 Mart 2024, 15:30
                          </span>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#0071e3]/10 text-[#0071e3] dark:text-[#0071e3] ring-1 ring-inset ring-[#0071e3]/20">
                          Telafi
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kullanım Durumu */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white uppercase tracking-wider">
                    Kullanım Durumu
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        Kalan Ders
                      </label>
                      <span className={`text-2xl font-medium ${
                        selectedStudent.remaining_lessons <= 0 
                          ? 'text-red-700 dark:text-red-400'
                          : selectedStudent.remaining_lessons <= 2
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}>
                        {selectedStudent.remaining_lessons}
                      </span>
                    </div>
                    <div className="bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        Katılım Oranı
                      </label>
                      <span className="text-2xl font-medium text-[#1d1d1f] dark:text-white">
                        {Math.round((selectedStudent.attended_lessons / (selectedStudent.attended_lessons + selectedStudent.remaining_lessons)) * 100)}%
                      </span>
                    </div>
                    <div className="col-span-2 bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl flex items-center justify-between">
                          <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                            Ödeme Durumu
                          </label>
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium ${
                            selectedStudent.payment_status === 'odendi'
                              ? 'bg-emerald-400/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20'
                              : 'bg-amber-400/10 text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20'
                          }`}>
                            {selectedStudent.payment_status === 'odendi' ? 'Ödendi' : 'Beklemede'}
                          </span>
                    </div>
                  </div>
                </div>

                {/* İstatistikler */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-white uppercase tracking-wider">
                    İstatistikler
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        Katıldığı Dersler
                      </label>
                      <span className="text-2xl font-medium text-[#1d1d1f] dark:text-white">
                        {selectedStudent.attended_lessons}
                      </span>
                    </div>
                    <div className="bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        İptal Edilen
                      </label>
                      <span className="text-2xl font-medium text-[#1d1d1f] dark:text-white">
                        {selectedStudent.cancelled_lessons}
                      </span>
                    </div>
                    <div className="bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        Telafi Dersleri
                      </label>
                      <span className="text-2xl font-medium text-[#1d1d1f] dark:text-white">
                        {selectedStudent.makeup_completed}
                      </span>
                    </div>
                    <div className="bg-[#f5f5f7] dark:bg-[#161922] p-4 rounded-xl">
                      <label className="block text-xs text-[#6e6e73] dark:text-[#86868b] uppercase tracking-wider mb-1">
                        Bekleyen Telafi
                      </label>
                      <span className="text-2xl font-medium text-[#1d1d1f] dark:text-white">
                        {selectedStudent.pending_makeup}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {showDetailView && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/25 backdrop-blur-sm z-40"
          onClick={handleCloseDetail}
        />
      )}
    </div>
  );
};

export default RemainingUsage; 