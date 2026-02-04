import { useState, useEffect, useRef } from 'react';
import { Video, MapPin, Users } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

// Counter animation hook
const useCountUp = (end: number, start = 0, duration = 2000, shouldStart = false) => {
  const [count, setCount] = useState(start);
  
  useEffect(() => {
    if (!shouldStart) return;
    
    let startTimestamp: number;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeOutExpo * (end - start) + start));
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [end, start, duration, shouldStart]);
  
  return count;
};

// Intersection observer hook
const useIntersectionObserver = (threshold = 0.3) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold }
    );
    
    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }
    
    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [threshold]);
  
  return { elementRef, isVisible };
};

interface Stat {
  icon: React.ElementType;
  value: number;
  suffix: string;
  label: string;
  color: string;
}

const StatItem = ({ stat, index, isVisible, getStatColor, getIconColor }: { 
  stat: Stat; 
  index: number; 
  isVisible: boolean;
  getStatColor: (c: string) => string;
  getIconColor: (c: string) => string;
}) => {
  const animatedValue = useCountUp(stat.value, 0, 2000 + index * 300, isVisible);
  
  return (
    <div className="text-center">
      <div className={`${getStatColor(stat.color)} p-4 rounded-lg mb-3 inline-block`}>
        <stat.icon className={`h-8 w-8 ${getIconColor(stat.color)}`} />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 font-mono">
        {animatedValue}{stat.suffix}
      </h3>
      <p className="text-gray-600">{stat.label}</p>
    </div>
  );
};

const StatValue = ({ value, duration, isVisible, suffix }: { value: number, duration: number, isVisible: boolean, suffix: string }) => {
  const count = useCountUp(value, 0, duration, isVisible);
  return (
    <h3 className="text-2xl font-bold text-gray-900 font-mono">
      {count}{suffix}
    </h3>
  );
};

export default function Hero() {
  const { t } = useLanguage();
  const { elementRef, isVisible } = useIntersectionObserver(0.2);
  
  const stats = [
    {
      icon: Users,
      value: 173,
      suffix: "",
      label: t('hero.villagesServed'),
      color: "blue"
    },
    {
      icon: Video,
      value: 24,
      suffix: "/7",
      label: t('hero.teleconsultation'),
      color: "green"
    },
    {
      icon: MapPin,
      value: 50,
      suffix: "%",
      label: t('hero.reductionTravelTime'),
      color: "amber"
    }
  ];

  const getStatColor = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-100';
      case 'green':
        return 'bg-green-100';
      case 'amber':
        return 'bg-amber-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getIconColor = (color: string) => {
    switch (color) {
      case 'blue':
        return 'text-blue-600';
      case 'green':
        return 'text-green-600';
      case 'amber':
        return 'text-amber-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <section id="home" className="bg-gradient-to-br from-blue-50 to-green-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <MapPin className="h-5 w-5 text-blue-600" />
              <span className="text-blue-600 font-medium">{t('hero.location')}</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {t('hero.title')}
              <span className="text-blue-600 block">{t('hero.subtitle')}</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              {t('hero.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                {t('hero.learnMore')}
              </button>
              <button className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                {t('hero.contactUs')}
              </button>
            </div>
          </div>
          
          <div className="lg:pl-8">
            <div ref={elementRef} className="bg-white rounded-2xl shadow-xl p-8">
              <div className="grid grid-cols-2 gap-6">
                {stats.slice(0, 2).map((stat, index) => (
                  <StatItem 
                    key={index} 
                    stat={stat} 
                    index={index} 
                    isVisible={isVisible}
                    getStatColor={getStatColor}
                    getIconColor={getIconColor}
                  />
                ))}
                <div className="text-center col-span-2">
                  <div className={`${getStatColor(stats[2].color)} p-4 rounded-lg mb-3 inline-block`}>
                    {(() => {
                      const IconComponent = stats[2].icon;
                      return <IconComponent className={`h-8 w-8 ${getIconColor(stats[2].color)}`} />;
                    })()}
                  </div>
                  <StatValue 
                    value={stats[2].value} 
                    duration={2500} 
                    isVisible={isVisible} 
                    suffix={stats[2].suffix} 
                  />
                  <p className="text-gray-600">{stats[2].label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}