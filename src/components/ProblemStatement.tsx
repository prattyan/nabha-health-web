import { AlertTriangle, TrendingDown, DollarSign, Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function ProblemStatement() {
  const { t } = useLanguage();
  
  const problems = [
    {
      icon: TrendingDown,
      title: t('problem.staffShortage.title'),
      description: t('problem.staffShortage.description'),
      stat: t('problem.staffShortage.stat')
    },
    {
      icon: Clock,
      title: t('problem.travelTime.title'),
      description: t('problem.travelTime.description'),
      stat: t('problem.travelTime.stat')
    },
    {
      icon: AlertTriangle,
      title: t('problem.medicineShortage.title'),
      description: t('problem.medicineShortage.description'),
      stat: t('problem.medicineShortage.stat')
    },
    {
      icon: DollarSign,
      title: t('problem.financialBurden.title'),
      description: t('problem.financialBurden.description'),
      stat: t('problem.financialBurden.stat')
    }
  ];

  return (
    <section id="problem" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {t('problem.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('problem.description')}
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {problems.map((problem, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-red-100 p-3 rounded-lg mb-4 inline-block">
                <problem.icon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{problem.title}</h3>
              <p className="text-gray-600 mb-4">{problem.description}</p>
              <div className="text-2xl font-bold text-red-600">{problem.stat}</div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 bg-white rounded-2xl p-8 shadow-xl">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('problem.impact.title')}</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{t('problem.impact.item1')}</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{t('problem.impact.item2')}</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{t('problem.impact.item3')}</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{t('problem.impact.item4')}</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-xl">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('problem.statistics.title')}</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('problem.statistics.internetAccess')}</span>
                  <span className="font-semibold text-orange-600">31%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('problem.statistics.villagesServed')}</span>
                  <span className="font-semibold text-orange-600">173</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('problem.statistics.doctorShortage')}</span>
                  <span className="font-semibold text-red-600">52%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}