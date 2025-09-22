import { Heart, Mail, Phone, MapPin, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t('header.title')}</h1>
                <p className="text-sm text-gray-400">{t('footer.subtitle')}</p>
              </div>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              {t('footer.description')}
            </p>
            <div className="flex space-x-4">
              <div className="bg-gray-800 p-2 rounded-lg">
                <Globe className="h-5 w-5 text-blue-400" />
              </div>
              <div className="bg-gray-800 p-2 rounded-lg">
                <Mail className="h-5 w-5 text-green-400" />
              </div>
              <div className="bg-gray-800 p-2 rounded-lg">
                <Phone className="h-5 w-5 text-yellow-400" />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2">
              <li><a href="#problem" className="text-gray-400 hover:text-white transition-colors">{t('footer.linkProblem')}</a></li>
              <li><a href="#solution" className="text-gray-400 hover:text-white transition-colors">{t('footer.linkSolution')}</a></li>
              <li><a href="#impact" className="text-gray-400 hover:text-white transition-colors">{t('footer.linkImpact')}</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">{t('footer.contactInfo')}</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">{t('footer.address')}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <span className="text-gray-400">{t('footer.phone')}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <span className="text-gray-400">{t('footer.email')}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              {t('footer.copyright')}
            </p>
            <p className="text-gray-400 text-sm mt-4 md:mt-0">
              {t('footer.madeWith')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}