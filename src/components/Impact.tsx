import { useState, useEffect, useRef } from 'react';
import { Users, Heart, Clock, TrendingUp } from 'lucide-react';
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
    
    const currentRef = elementRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }
    
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);
  
  return { elementRef, isVisible };
};

interface AchievementCardProps {
  achievement: {
    icon: React.ElementType;
    title: string;
    value: number;
    suffix: string;
    description: string;
    color: string;
  };
  index: number;
  isVisible: boolean;
  getColorClasses: (color: string) => string;
  getValueColor: (color: string) => string;
}

const AchievementCard = ({ achievement, index, isVisible, getColorClasses, getValueColor }: AchievementCardProps) => {
  const animatedValue = useCountUp(achievement.value, 0, 2000 + index * 200, isVisible);
  
  return (
    <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${getColorClasses(achievement.color)}`}>
        <achievement.icon className="h-8 w-8" />
      </div>
      
      <h3 className={`text-4xl font-bold mb-2 ${getValueColor(achievement.color)} font-mono`}>
        {animatedValue.toLocaleString()}{achievement.suffix}
      </h3>
      
      <h4 className="text-xl font-semibold text-gray-900 mb-3">
        {achievement.title}
      </h4>
      
      <p className="text-gray-600 leading-relaxed">
        {achievement.description}
      </p>
    </div>
  );
};

interface VisionStatCardProps {
  stat: {
    value: number;
    suffix: string;
    label: string;
    description: string;
  };
  index: number;
  visionVisible: boolean;
}

const VisionStatCard = ({ stat, index, visionVisible }: VisionStatCardProps) => {
  const animatedValue = useCountUp(stat.value, 0, 2500 + index * 300, visionVisible);
  
  return (
    <div className="text-center">
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/30 transition-all duration-300">
        <h4 className="text-4xl lg:text-5xl font-bold mb-2 text-white font-mono">
          {animatedValue.toLocaleString()}{stat.suffix}
        </h4>
        <h5 className="text-xl font-semibold mb-3 text-blue-100">
          {stat.label}
        </h5>
        <p className="text-blue-200 leading-relaxed">
          {stat.description}
        </p>
      </div>
    </div>
  );
};

export default function Impact() {
  const { t } = useLanguage();
  const { elementRef, isVisible } = useIntersectionObserver(0.2);
  
  const achievements = [
    {
      icon: Users,
      title: t('impact.achievement1.title'),
      value: 5000,
      suffix: "+",
      description: t('impact.achievement1.description'),
      color: "blue"
    },
    {
      icon: Heart,
      title: t('impact.achievement2.title'), 
      value: 95,
      suffix: "%",
      description: t('impact.achievement2.description'),
      color: "green"
    },
    {
      icon: Clock,
      title: t('impact.achievement3.title'),
      value: 70,
      suffix: "%",
      description: t('impact.achievement3.description'),
      color: "purple"
    },
    {
      icon: TrendingUp,
      title: t('impact.achievement4.title'),
      value: 60,
      suffix: "%",
      description: t('impact.achievement4.description'),
      color: "gray"
    }
  ];

  const visionStats = [
    {
      value: 500,
      suffix: "+",
      label: t('impact.vision.stat1.label'),
      description: t('impact.vision.stat1.description')
    },
    {
      value: 50,
      suffix: "K+",
      label: t('impact.vision.stat2.label'), 
      description: t('impact.vision.stat2.description')
    },
    {
      value: 80,
      suffix: "%",
      label: t('impact.vision.stat3.label'),
      description: t('impact.vision.stat3.description')
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-100 text-blue-600';
      case 'green':
        return 'bg-green-100 text-green-600';
      case 'purple':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getValueColor = (color: string) => {
    switch (color) {
      case 'blue':
        return 'text-blue-600';
      case 'green':
        return 'text-green-600';
      case 'purple':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <section id="impact" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            <span className="text-blue-600">{t('impact.title')}</span>{' '}
            <span className="text-teal-600">{t('impact.titleAnd')}</span>{' '}
            <span className="text-gray-900">{t('impact.titleAchievements')}</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            {t('impact.description')}
          </p>
        </div>

        {/* Achievement Cards */}
        <div ref={elementRef} className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {achievements.map((achievement, index) => (
            <AchievementCard 
              key={index}
              achievement={achievement}
              index={index}
              isVisible={isVisible}
              getColorClasses={getColorClasses}
              getValueColor={getValueColor}
            />
          ))}
        </div>

        {/* Vision for 2025 Section */}
        <VisionSection visionStats={visionStats} t={t} />
      </div>
    </section>
  );
}

// Separate Vision Section Component for better organization
function VisionSection({ visionStats, t }: { visionStats: { value: number; suffix: string; label: string; description: string; }[], t: (key: string) => string }) {
  const { elementRef: visionRef, isVisible: visionVisible } = useIntersectionObserver(0.2);
  
  return (
    <div ref={visionRef} className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 rounded-3xl p-12 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 right-20 w-32 h-32 border-2 border-white rounded-full"></div>
        <div className="absolute bottom-16 left-16 w-24 h-24 border-2 border-white rounded-full"></div>
        <div className="absolute top-1/2 left-1/3 w-16 h-16 border-2 border-white rounded-full"></div>
      </div>

      <div className="relative">
        {/* Vision Header */}
        <div className="text-center mb-12">
          <h3 className="text-3xl lg:text-4xl font-bold mb-4 text-yellow-300">
            {t('impact.vision.title')}
          </h3>
          <p className="text-lg text-blue-100 max-w-4xl mx-auto leading-relaxed">
            {t('impact.vision.description')}
          </p>
        </div>

        {/* Vision Stats */}
        <div className="grid md:grid-cols-3 gap-8">
          {visionStats.map((stat, index) => (
            <VisionStatCard
              key={index}
              stat={stat}
              index={index}
              visionVisible={visionVisible}
            />
          ))}
        </div>
      </div>
    </div>
  );
}