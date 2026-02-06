import { useState, useEffect, useCallback } from 'react';
import { Video, Smartphone, Pill, Brain, Wifi, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Solution() {
  const { t } = useLanguage();
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    {
      icon: Wifi,
      title: t('solution.feature1.title'),
      description: t('solution.feature1.description'),
      details: [
        t('solution.feature1.detail1'),
        t('solution.feature1.detail2'),
        t('solution.feature1.detail3')
      ]
    },
    {
      icon: Video,
      title: t('solution.feature2.title'),
      description: t('solution.feature2.description'),
      details: [
        t('solution.feature2.detail1'),
        t('solution.feature2.detail2'),
        t('solution.feature2.detail3')
      ]
    },
    {
      icon: Smartphone,
      title: t('solution.feature3.title'),
      description: t('solution.feature3.description'),
      details: [
        t('solution.feature3.detail1'),
        t('solution.feature3.detail2'),
        t('solution.feature3.detail3')
      ]
    },
    {
      icon: Pill,
      title: t('solution.feature4.title'),
      description: t('solution.feature4.description'),
      details: [
        t('solution.feature4.detail1'),
        t('solution.feature4.detail2'),
        t('solution.feature4.detail3')
      ]
    },
    {
      icon: Brain,
      title: t('solution.feature5.title'),
      description: t('solution.feature5.description'),
      details: [
        t('solution.feature5.detail1'),
        t('solution.feature5.detail2'),
        t('solution.feature5.detail3')
      ]
    },
    {
      icon: Globe,
      title: t('solution.feature6.title'),
      description: t('solution.feature6.description'),
      details: [
        t('solution.feature6.detail1'),
        t('solution.feature6.detail2'),
        t('solution.feature6.detail3')
      ]
    }
  ];

  const nextFeature = useCallback(() => {
    setCurrentFeature((prev) => (prev + 1) % features.length);
  }, [features.length]);

  const prevFeature = useCallback(() => {
    setCurrentFeature((prev) => (prev - 1 + features.length) % features.length);
  }, [features.length]);

  useEffect(() => {
    const interval = setInterval(nextFeature, 5000);
    return () => clearInterval(interval);
  }, [nextFeature]);

  return (
    <section id="solution" className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            {t('solution.title')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600">
              {t('solution.titleHighlight')}
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            {t('solution.description')}
          </p>
        </div>

        {/* Featured Solution Carousel */}
        <div className="relative bg-white rounded-3xl shadow-2xl p-8 lg:p-12 mb-16 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 right-10 w-32 h-32 border-2 border-blue-300 rounded-full"></div>
            <div className="absolute bottom-10 left-10 w-24 h-24 border-2 border-teal-300 rounded-full"></div>
            <div className="absolute top-1/2 left-1/4 w-16 h-16 border-2 border-purple-300 rounded-full"></div>
          </div>

          <div className="relative grid lg:grid-cols-2 gap-12 items-center">
            {/* Feature Content */}
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-r from-blue-500 to-teal-500 p-4 rounded-2xl shadow-lg">
                  {(() => {
                    const IconComponent = features[currentFeature].icon;
                    return <IconComponent className="h-8 w-8 text-white" />;
                  })()}
                </div>
                <div className="flex-1">
                  <h3 className="text-3xl font-bold text-gray-900">
                    {features[currentFeature].title}
                  </h3>
                </div>
              </div>

              <p className="text-lg text-gray-600 leading-relaxed">
                {features[currentFeature].description}
              </p>

              <div className="space-y-3">
                {features[currentFeature].details.map((detail, idx) => (
                  <div key={idx} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-700 font-medium">{detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Element */}
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-100 to-teal-100 rounded-2xl p-8 h-80 flex items-center justify-center">
                {(() => {
                  const IconComponent = features[currentFeature].icon;
                  return <IconComponent className="h-32 w-32 text-blue-500 opacity-20" />;
                })()}
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevFeature}
            aria-label={t('solution.previousFeature')}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          
          <button
            onClick={nextFeature}
            aria-label={t('solution.nextFeature')}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          >
            <ChevronRight className="h-6 w-6 text-gray-600" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center space-x-2 mt-8">
            {features.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentFeature(idx)}
                aria-label={`Go to feature ${idx + 1}`}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  idx === currentFeature
                    ? 'bg-gradient-to-r from-blue-500 to-teal-500 scale-125'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-3xl p-8 text-white text-center">
          <h3 className="text-3xl font-bold mb-4">{t('solution.cta.title')}</h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto text-lg">
            {t('solution.cta.description')}
          </p>
          <button className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl">
            {t('solution.cta.button')}
          </button>
        </div>
      </div>
    </section>
  );
}