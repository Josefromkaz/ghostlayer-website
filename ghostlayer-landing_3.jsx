import React, { useState, useEffect } from 'react';
import { Shield, Lock, Zap, Brain, Eye, EyeOff, Copy, Download, CheckCircle, ChevronRight, Globe, Server, Cpu, FileText, Users, Briefcase, Scale, Heart, Columns } from 'lucide-react';

// Animated counter component
const AnimatedNumber = ({ value, suffix = '' }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span>{count}{suffix}</span>;
};

// Typing animation for hero
const TypeWriter = ({ words }) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  
  useEffect(() => {
    if (subIndex === words[index].length + 1 && !reverse) {
      setTimeout(() => setReverse(true), 2000);
      return;
    }
    
    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }
    
    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, reverse ? 50 : 100);
    
    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, words]);
  
  return (
    <span className="text-emerald-400">
      {words[index].substring(0, subIndex)}
      <span className="animate-pulse">|</span>
    </span>
  );
};

// Floating particles background
const ParticleField = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-emerald-500/20 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${10 + Math.random() * 20}s linear infinite`,
            animationDelay: `${Math.random() * 10}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(100px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// Demo anonymization component
const AnonymizationDemo = () => {
  const [showOriginal, setShowOriginal] = useState(true);
  
  const original = `Договор аренды №2847
  
Арендодатель: ООО "Альфа-Инвест"
ИНН: 7701234567
Контактное лицо: Иванов Сергей Петрович
Телефон: +7 (495) 123-45-67
Email: ivanov@alpha-invest.ru

Банковские реквизиты:
Р/с 40817810099910004567
БИК 044525225`;

  const anonymized = `Договор аренды №[DOC_ID]
  
Арендодатель: [COMPANY_1]
ИНН: [INN_1]
Контактное лицо: [PERSON_1]
Телефон: [PHONE_1]
Email: [EMAIL_1]

Банковские реквизиты:
Р/с [ACCOUNT_1]
БИК [BIK_1]`;

  return (
    <div className="relative">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowOriginal(true)}
          className={`px-4 py-2 rounded-lg font-mono text-sm transition-all ${
            showOriginal 
              ? 'bg-red-500/20 text-red-400 border border-red-500/50' 
              : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700'
          }`}
        >
          <Eye className="w-4 h-4 inline mr-2" />
          Оригинал
        </button>
        <button
          onClick={() => setShowOriginal(false)}
          className={`px-4 py-2 rounded-lg font-mono text-sm transition-all ${
            !showOriginal 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
              : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700'
          }`}
        >
          <EyeOff className="w-4 h-4 inline mr-2" />
          Анонимизировано
        </button>
      </div>
      
      <div className="relative bg-zinc-900/80 rounded-xl border border-zinc-800 p-6 font-mono text-sm overflow-hidden">
        <div className="absolute top-3 right-3 flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        
        <pre className={`whitespace-pre-wrap transition-all duration-500 ${
          showOriginal ? 'text-red-400/90' : 'text-emerald-400/90'
        }`}>
          {showOriginal ? original : anonymized}
        </pre>
        
        {!showOriginal && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button className="p-2 bg-emerald-500/20 rounded-lg hover:bg-emerald-500/30 transition-colors">
              <Copy className="w-4 h-4 text-emerald-400" />
            </button>
            <button className="p-2 bg-emerald-500/20 rounded-lg hover:bg-emerald-500/30 transition-colors">
              <Download className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Feature card component
const FeatureCard = ({ icon: Icon, title, description, highlight }) => (
  <div className="group relative bg-gradient-to-br from-zinc-900/90 to-zinc-900/50 rounded-2xl p-6 border border-zinc-800 hover:border-emerald-500/50 transition-all duration-300 hover:transform hover:scale-[1.02]">
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
    
    <div className="relative">
      <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
        <Icon className="w-6 h-6 text-emerald-400" />
      </div>
      
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 leading-relaxed">{description}</p>
      
      {highlight && (
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-emerald-400 text-sm font-medium">{highlight}</span>
        </div>
      )}
    </div>
  </div>
);

// Pricing card component
const PricingCard = ({ name, price, originalPrice, period, features, popular, cta }) => (
  <div className={`relative bg-gradient-to-br from-zinc-900/90 to-zinc-900/50 rounded-2xl p-8 border ${
    popular ? 'border-emerald-500/50' : 'border-zinc-800'
  } transition-all hover:transform hover:scale-[1.02]`}>
    {popular && (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 rounded-full text-black text-sm font-semibold">
        🔥 Скидка 50%
      </div>
    )}
    
    <h3 className="text-2xl font-bold text-white mb-2">{name}</h3>
    <div className="flex items-baseline gap-2 mb-6">
      {originalPrice && (
        <span className="text-2xl text-zinc-500 line-through">{originalPrice}</span>
      )}
      <span className="text-4xl font-bold text-white">{price}</span>
      {period && <span className="text-zinc-500">{period}</span>}
    </div>
    
    <ul className="space-y-3 mb-8">
      {features.map((feature, i) => (
        <li key={i} className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span className="text-zinc-300">{feature}</span>
        </li>
      ))}
    </ul>
    
    <button className={`w-full py-3 rounded-xl font-semibold transition-all ${
      popular 
        ? 'bg-emerald-500 text-black hover:bg-emerald-400' 
        : 'bg-zinc-800 text-white hover:bg-zinc-700'
    }`}>
      {cta}
    </button>
  </div>
);

// Industry card
const IndustryCard = ({ icon: Icon, title, pain }) => (
  <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800 hover:border-zinc-700 transition-colors">
    <Icon className="w-8 h-8 text-emerald-400 mb-3" />
    <h4 className="text-white font-semibold mb-2">{title}</h4>
    <p className="text-zinc-500 text-sm">{pain}</p>
  </div>
);

// Main landing page component
export default function GhostLayerLanding() {
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-800' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-black" />
            </div>
            <span className="text-xl font-bold tracking-tight">GhostLayer</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-zinc-400 hover:text-white transition-colors">Возможности</a>
            <a href="#security" className="text-zinc-400 hover:text-white transition-colors">Безопасность</a>
            <a href="#pricing" className="text-zinc-400 hover:text-white transition-colors">Цены</a>
          </div>
          
          <button className="px-5 py-2.5 bg-emerald-500 text-black font-semibold rounded-xl hover:bg-emerald-400 transition-colors flex items-center gap-2">
            Скачать бесплатно
            <Download className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        <ParticleField />
        
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px]" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-8">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-400 text-sm font-medium">100% Offline • Ваши данные остаются у вас</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
                Используйте AI
                <br />
                <span className="text-zinc-500">без утечки</span>
                <br />
                <TypeWriter words={['имён клиентов', 'паспортных данных', 'номеров телефонов', 'банковских счетов', 'коммерческой тайны']} />
              </h1>
              
              <p className="text-xl text-zinc-400 mb-8 max-w-lg leading-relaxed">
                GhostLayer автоматически скрывает конфиденциальные данные в документах перед отправкой в ИИ-сервисы. 
                Полностью локально. Никаких серверов.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="px-8 py-4 bg-emerald-500 text-black font-semibold rounded-xl hover:bg-emerald-400 transition-all hover:transform hover:scale-105 flex items-center justify-center gap-2 text-lg">
                  Скачать для Windows
                  <Download className="w-5 h-5" />
                </button>
                <button className="px-8 py-4 bg-zinc-800 text-white font-semibold rounded-xl hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2 text-lg border border-zinc-700">
                  Смотреть демо
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-8 mt-10 pt-10 border-t border-zinc-800">
                <div>
                  <div className="text-3xl font-bold text-white"><AnimatedNumber value={58} /></div>
                  <div className="text-zinc-500 text-sm">паттернов PII</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">&lt;2<span className="text-emerald-400">сек</span></div>
                  <div className="text-zinc-500 text-sm">запуск приложения</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">0</div>
                  <div className="text-zinc-500 text-sm">сетевых соединений</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <AnonymizationDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="relative py-24 bg-gradient-to-b from-zinc-950 to-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-red-400">Shadow AI</span> — тихая угроза
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              83% юристов и 66% HR-специалистов уже используют ИИ на работе. 
              Большинство — без разрешения и без защиты данных.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-red-500/5 rounded-2xl p-8 border border-red-500/20">
              <div className="text-6xl font-bold text-red-400 mb-4">$4.88M</div>
              <div className="text-white font-semibold mb-2">Средняя стоимость утечки</div>
              <div className="text-zinc-500">IBM Cost of Data Breach Report 2025</div>
            </div>
            
            <div className="bg-red-500/5 rounded-2xl p-8 border border-red-500/20">
              <div className="text-6xl font-bold text-red-400 mb-4">15%</div>
              <div className="text-white font-semibold mb-2">Копируют PII в чат-боты</div>
              <div className="text-zinc-500">LayerX Security Research</div>
            </div>
            
            <div className="bg-red-500/5 rounded-2xl p-8 border border-red-500/20">
              <div className="text-6xl font-bold text-red-400 mb-4">86%</div>
              <div className="text-white font-semibold mb-2">Компаний «слепы» к AI-потокам</div>
              <div className="text-zinc-500">Shadow AI Report 2024</div>
            </div>
          </div>
        </div>
      </section>

      {/* For Who Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Для профессионалов с <span className="text-emerald-400">ответственностью</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <IndustryCard 
              icon={Scale} 
              title="Юристы" 
              pain="Адвокатская тайна и риск дисциплинарки — один промпт может стоить лицензии" 
            />
            <IndustryCard 
              icon={Briefcase} 
              title="Финансисты" 
              pain="SEC штрафует за off-channel коммуникации — AI-чаты попадают под запрет" 
            />
            <IndustryCard 
              icon={Users} 
              title="HR-специалисты" 
              pain="GDPR и право на забвение — резюме с PII нельзя отправлять в облако" 
            />
            <IndustryCard 
              icon={Heart} 
              title="Медики" 
              pain="HIPAA требует BAA — бесплатные ИИ-сервисы не подходят для PHI" 
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-b from-zinc-900/50 to-zinc-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Три уровня защиты <span className="text-emerald-400">в одном клике</span>
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              GhostLayer комбинирует ваши правила, 58 regex-паттернов и NLP-модели 
              для достижения 99% точности распознавания
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Brain}
              title="Learning System"
              description="Один клик по слову — и оно скрывается навсегда. GhostLayer учится на ваших правках и становится умнее с каждым документом."
              highlight="Killer Feature"
            />
            <FeatureCard
              icon={Zap}
              title="Мгновенная обработка"
              description="Трёхступенчатый пайплайн: сначала ваши правила, затем regex-паттерны, затем NLP. Всё локально, без задержек сети."
            />
            <FeatureCard
              icon={Eye}
              title="Entity Inspector"
              description="Полный контроль: просматривайте все найденные сущности и решайте сами, что скрывать, а что оставить для контекста."
            />
            <FeatureCard
              icon={FileText}
              title="Поддержка форматов"
              description="Работает с PDF, DOCX и TXT файлами. Загрузите документ и получите анонимизированную версию за секунды."
            />
            <FeatureCard
              icon={Copy}
              title="Prompt Library"
              description="Сохраняйте шаблоны промптов и копируйте анонимизированный текст вместе с инструкцией одной кнопкой."
            />
            <FeatureCard
              icon={Columns}
              title="Side-by-Side сравнение"
              description="Оригинал и анонимизированная версия рядом. Синхронная прокрутка и подсветка замен для полного контроля."
            />
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-6">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">Zero-Trust Architecture</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Безопасность — <span className="text-emerald-400">не опция</span>
              </h2>
              
              <p className="text-xl text-zinc-400 mb-8">
                GhostLayer спроектирован так, что утечка данных физически невозможна. 
                Ваши документы никогда не покидают оперативную память.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: Server, text: '100% Offline — нет сетевых соединений' },
                  { icon: Cpu, text: 'Документы только в RAM — никогда на диске' },
                  { icon: Lock, text: 'AES-256-GCM шифрование правил' },
                  { icon: Shield, text: 'Machine-bound ключи — база бесполезна на другом ПК' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="text-white">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                    <Shield className="w-12 h-12 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Данные под защитой</h3>
                  <div className="space-y-3 text-left w-full max-w-sm">
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span className="text-zinc-300">Документы обрабатываются локально</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span className="text-zinc-300">Не сохраняются на диск</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span className="text-zinc-300">Удаляются после закрытия</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Compliance badges */}
              <div className="flex gap-4 mt-6 justify-center">
                <div className="px-4 py-2 bg-zinc-800 rounded-lg text-zinc-400 text-sm">GDPR ✓</div>
                <div className="px-4 py-2 bg-zinc-800 rounded-lg text-zinc-400 text-sm">152-ФЗ ✓</div>
                <div className="px-4 py-2 bg-zinc-800 rounded-lg text-zinc-400 text-sm">HIPAA Ready</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-gradient-to-b from-zinc-950 to-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Три шага до <span className="text-emerald-400">безопасного AI</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Загрузите документ', desc: 'Откройте PDF, DOCX или TXT файл в GhostLayer' },
              { step: '02', title: 'Проверьте результат', desc: 'Просмотрите Side-by-Side сравнение и скорректируйте при необходимости' },
              { step: '03', title: 'Скопируйте в ИИ', desc: 'Нажмите «Copy» и вставьте безопасный текст в любой ИИ-сервис' },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-8xl font-bold text-emerald-500/10 absolute -top-6 -left-2">{item.step}</div>
                <div className="relative pt-12">
                  <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-zinc-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Простые цены. <span className="text-emerald-400">Без подписок.</span>
            </h2>
            <p className="text-xl text-zinc-400">
              Заплатите один раз — владейте навсегда. Никаких ежемесячных списаний.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Starter"
              price="$0"
              features={[
                'Безлимитные документы',
                'Все 58 паттернов PII',
                'Русский и английский языки',
                'Entity Inspector',
                'Prompt Library',
                'Side-by-Side просмотр',
              ]}
              cta="Скачать бесплатно"
            />
            
            <PricingCard
              name="Professional"
              price="$99"
              originalPrice="$199"
              popular
              features={[
                'Всё из Starter',
                'Learning System — ИИ учится на ваших правках',
                'Пользовательские правила анонимизации',
                'Приоритет ваших правил над автоматикой',
                '1 год обновлений',
                'Приоритетная поддержка',
              ]}
              cta="Купить лицензию"
            />
            
            <PricingCard
              name="Team"
              price="$399"
              features={[
                'Всё из Professional',
                '5 рабочих мест',
                'Общая база правил',
                'Audit log',
                'Интеграции (скоро)',
              ]}
              cta="Связаться с нами"
            />
          </div>
          
          <div className="text-center mt-12">
            <p className="text-zinc-500">
              60-дневная гарантия возврата • Работает на Windows 10/11
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-zinc-900/50 to-zinc-950">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Начните защищать данные <span className="text-emerald-400">сегодня</span>
          </h2>
          <p className="text-xl text-zinc-400 mb-8">
            Полная версия бесплатно. Без кредитной карты. Без регистрации.
          </p>
          
          <button className="px-10 py-5 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all hover:transform hover:scale-105 text-xl flex items-center justify-center gap-3 mx-auto">
            Скачать GhostLayer для Windows
            <Download className="w-6 h-6" />
          </button>
          
          <p className="text-zinc-600 mt-6 text-sm">
            v1.0.0 • 45 MB • Windows 10/11 • SHA-256: a1b2c3d4...
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-black" />
              </div>
              <span className="font-bold">GhostLayer</span>
            </div>
            
            <div className="flex items-center gap-8 text-zinc-500 text-sm">
              <a href="#" className="hover:text-white transition-colors">Документация</a>
              <a href="#" className="hover:text-white transition-colors">Политика конфиденциальности</a>
              <a href="#" className="hover:text-white transition-colors">Контакты</a>
            </div>
            
            <div className="text-zinc-600 text-sm">
              © 2025 GhostLayer. Все права защищены.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
