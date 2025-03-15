import React from 'react';
import { FiCalendar, FiUserPlus, FiUsers } from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';

const Home = () => {
  const { t } = useLanguage();

  const quickStats = [
    {
      icon: FiCalendar,
      title: "Bugünkü Randevular",
      value: "5",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-600/20"
    },
    {
      icon: FiUserPlus,
      title: "Yeni Kayıtlar",
      value: "12",
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-600/20"
    },
    {
      icon: FiUsers,
      title: "Aktif Öğrenciler",
      value: "48",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-600/20"
    }
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">Anasayfa</h1>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {quickStats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-[#161b2c] rounded-lg p-6 shadow-lg">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {stat.title}
                </h3>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Welcome Message */}
      <div className="bg-white dark:bg-[#161b2c] rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          Hoş Geldiniz!
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Yönetim panelinizden tüm işlemlerinizi kolayca gerçekleştirebilirsiniz. 
          Soldaki menüden istediğiniz bölüme hızlıca erişebilirsiniz.
        </p>
      </div>
    </div>
  );
};

export default Home; 