import React, { useState, useEffect } from 'react';
import { Shield, Lock, Zap, Brain, Eye, EyeOff, Copy, Download, CheckCircle, ChevronRight, Globe, Server, Cpu, FileText, Users, Briefcase, Scale, Heart, Columns, X } from 'lucide-react';

// Translations
const translations = {
  ru: {
    nav: {
      features: 'Возможности',
      security: 'Безопасность',
      pricing: 'Цены',
      download: 'Скачать бесплатно',
    },
    hero: {
      badge: '100% Offline • Ваши данные остаются у вас',
      title1: 'Используйте AI',
      title2: 'без утечки',
      typewriter: ['имён клиентов', 'паспортных данных', 'номеров телефонов', 'банковских счетов', 'коммерческой тайны'],
      description: 'GhostLayer автоматически скрывает конфиденциальные данные в документах перед отправкой в ИИ-сервисы. Полностью локально. Никаких серверов.',
      downloadBtn: 'Скачать для Windows',
      demoBtn: 'Смотреть демо',
      stats: {
        patterns: 'паттернов PII',
        startup: 'запуск приложения',
        connections: 'сетевых соединений',
      },
    },
    demo: {
      original: 'Оригинал',
      anonymized: 'Анонимизировано',
      originalText: `Договор аренды №2847
  
Арендодатель: ООО "Альфа-Инвест"
ИНН: 7701234567
Контактное лицо: Иванов Сергей Петрович
Телефон: +7 (495) 123-45-67
Email: ivanov@alpha-invest.ru

Банковские реквизиты:
Р/с 40817810099910004567
БИК 044525225`,
      anonymizedText: `Договор аренды №[DOC_ID]
  
Арендодатель: [COMPANY_1]
ИНН: [INN_1]
Контактное лицо: [PERSON_1]
Телефон: [PHONE_1]
Email: [EMAIL_1]

Банковские реквизиты:
Р/с [ACCOUNT_1]
БИК [BIK_1]`,
    },
    problem: {
      title: '— тихая угроза',
      subtitle: '77% сотрудников уже используют ИИ на работе. Вы не можете запретить ИИ, но можете сделать его использование безопасным.',
      stat1: { value: '$4.44M', label: 'Средняя стоимость утечки', desc: 'Профилактика дешевле в сотни раз' },
      stat2: { value: '77%', label: 'Сотрудников копируют данные в ИИ', desc: 'Запреты не работают' },
      stat3: { value: '86%', label: 'Компаний «слепы» к AI-потокам', desc: 'GhostLayer возвращает контроль' },
    },
    industries: {
      title: 'Для профессионалов с',
      titleHighlight: 'ответственностью',
      lawyers: { title: 'Юристы', pain: 'Адвокатская тайна и риск дисциплинарки — один промпт может стоить лицензии' },
      finance: { title: 'Финансисты', pain: 'SEC штрафует за off-channel коммуникации — AI-чаты попадают под запрет' },
      hr: { title: 'HR-специалисты', pain: 'GDPR и право на забвение — резюме с PII нельзя отправлять в облако' },
      medical: { title: 'Медики', pain: 'HIPAA требует BAA — бесплатные ИИ-сервисы не подходят для PHI' },
    },
    features: {
      title: 'Три уровня защиты',
      titleHighlight: 'в одном клике',
      subtitle: 'Загрузите документ, проверьте результат, скопируйте безопасный текст в любой ИИ-сервис',
      learning: { title: 'Learning System', desc: 'Один клик по слову — и оно скрывается навсегда. GhostLayer учится на ваших правках и становится умнее с каждым документом.' },
      instant: { title: 'Мгновенная обработка', desc: 'Документы обрабатываются локально за секунды. Никаких задержек сети, никаких очередей — всё происходит на вашем устройстве.' },
      inspector: { title: 'Entity Inspector', desc: 'Полный контроль: просматривайте все найденные сущности и решайте сами, что скрывать, а что оставить для контекста.' },
      formats: { title: 'Поддержка форматов', desc: 'Работает с PDF, DOCX и TXT файлами. Загрузите документ и получите анонимизированную версию за секунды.' },
      prompts: { title: 'Prompt Library', desc: 'Сохраняйте шаблоны промптов и копируйте анонимизированный текст вместе с инструкцией одной кнопкой.' },
      sideBySide: { title: 'Side-by-Side сравнение', desc: 'Оригинал и анонимизированная версия рядом. Синхронная прокрутка и подсветка замен для полного контроля.' },
    },
    security: {
      badge: 'Zero-Trust Architecture',
      title: 'Безопасность —',
      titleHighlight: 'не опция',
      subtitle: 'GhostLayer спроектирован так, что утечка данных физически невозможна. Ваши документы никогда не покидают оперативную память.',
      points: [
        '100% Offline — нет сетевых соединений',
        'Документы только в RAM — никогда на диске',
        'AES-256-GCM шифрование правил',
        'Machine-bound ключи — база бесполезна на другом ПК',
      ],
      cardTitle: 'Данные под защитой',
      cardPoints: ['Документы обрабатываются локально', 'Не сохраняются на диск', 'Удаляются после закрытия'],
    },
    howItWorks: {
      title: 'Три шага до',
      titleHighlight: 'безопасного AI',
      steps: [
        { title: 'Загрузите документ', desc: 'Откройте PDF, DOCX или TXT файл в GhostLayer' },
        { title: 'Проверьте результат', desc: 'Просмотрите Side-by-Side сравнение и скорректируйте при необходимости' },
        { title: 'Скопируйте в ИИ', desc: 'Нажмите «Copy» и вставьте безопасный текст в любой ИИ-сервис' },
      ],
    },
    pricing: {
      title: 'Простые цены.',
      titleHighlight: 'Без подписок.',
      subtitle: 'Заплатите один раз — владейте навсегда. Никаких ежемесячных списаний.',
      badge: '🎁 $99 с промокодом',
      promo: 'Промокод:',
      promoDiscount: '= скидка 50%',
      footer: '7 дней бесплатно • 30-дневная гарантия возврата • Только для Windows',
      free: {
        name: 'Free',
        price: '$0',
        period: 'навсегда',
        features: ['Безлимитные документы', '5 базовых категорий (Email, Phone, URL, Date, Name)', 'Русский и английский', 'Entity Inspector', 'Prompt Library', 'Side-by-Side просмотр'],
        cta: 'Скачать бесплатно',
      },
      pro: {
        name: 'Professional',
        price: '$199',
        trial: '7 дней бесплатно',
        features: ['Всё из Free', '35+ категорий PII (SSN, Credit Cards, Addresses...)', 'Learning System — ИИ учится на ваших правках', 'Whitelist и Custom Regex', '1 год обновлений и поддержки', '30-дневная гарантия возврата'],
        cta: 'Попробовать бесплатно',
      },
      team: {
        name: 'Team',
        price: 'Soon',
        period: 'скоро',
        features: ['Всё из Professional', '5 рабочих мест', 'Общая база правил', 'Audit log', 'Интеграции'],
        cta: 'Оставить заявку',
      },
    },
    cta: {
      title: 'Начните защищать данные',
      titleHighlight: 'сегодня',
      subtitle: '7 дней бесплатно. 30-дневная гарантия возврата. Без регистрации.',
      button: 'Скачать GhostLayer для Windows',
      version: 'Только для Windows',
    },
    footer: {
      docs: 'Документация',
      contact: 'Контакты',
      rights: '© 2025 GhostLayer. Все права защищены.',
    },
    docsModal: {
      title: 'Документация',
      subtitle: 'Выберите документ для просмотра',
      quickStart: 'Быстрый старт',
      quickStartDesc: 'Начните работу за 5 минут',
      userGuide: 'Руководство пользователя',
      userGuideDesc: 'Полное описание всех функций',
    },
    faq: {
      title: 'Частые',
      titleHighlight: 'вопросы',
      items: [
        {
          q: 'Безопасно ли использовать GhostLayer?',
          a: 'Да. GhostLayer работает полностью оффлайн — никаких сетевых соединений. Ваши документы обрабатываются только в оперативной памяти и никогда не сохраняются на диск.'
        },
        {
          q: 'Где хранятся мои правила анонимизации?',
          a: 'Правила хранятся локально на вашем компьютере в зашифрованной базе данных (AES-256-GCM). Ключ привязан к вашему устройству — база бесполезна на другом ПК.'
        },
        {
          q: 'Чем отличается Free от Professional?',
          a: 'Free-версия включает 5 базовых категорий PII (Email, Phone, URL, Date, Name). Professional добавляет 35+ категорий (SSN, Credit Cards, Addresses и др.), Learning System (приложение запоминает правки), Whitelist и Custom Regex для полного контроля.'
        },
        {
          q: 'Как активировать Professional-лицензию?',
          a: 'После оплаты вы получите лицензионный ключ на email. Введите его в приложении: Настройки → Лицензия → Активировать.'
        },
        {
          q: 'Есть ли гарантия возврата?',
          a: 'Да, 30 дней без вопросов. Если продукт вам не подошёл — напишите на support@ghostlayerapp.com, и мы вернём деньги.'
        },
        {
          q: 'Какие форматы файлов поддерживаются?',
          a: 'PDF, DOCX и TXT. Максимальный размер файла — 50 MB.'
        },
      ],
    },
    contactModal: {
      title: 'Связаться с нами',
      subtitle: 'Ответим в течение 24 часов',
      emailLabel: 'Или напишите напрямую:',
    },
    modal: {
      title: 'Заявка на Team',
      subtitle: 'Мы свяжемся с вами, когда Team-версия будет готова',
      name: 'Ваше имя',
      email: 'Email',
      message: 'Сообщение (опционально)',
      submit: 'Отправить заявку',
      sending: 'Отправка...',
      success: 'Заявка отправлена!',
      error: 'Ошибка. Попробуйте позже.',
    },
  },
  en: {
    nav: {
      features: 'Features',
      security: 'Security',
      pricing: 'Pricing',
      download: 'Download Free',
    },
    hero: {
      badge: '100% Offline • Your data stays with you',
      title1: 'Use AI',
      title2: 'without leaking',
      typewriter: ['client names', 'passport data', 'phone numbers', 'bank accounts', 'trade secrets'],
      description: 'GhostLayer automatically redacts sensitive data in documents before sending to AI services. Completely local. No servers.',
      downloadBtn: 'Download for Windows',
      demoBtn: 'Watch Demo',
      stats: {
        patterns: 'PII patterns',
        startup: 'app startup',
        connections: 'network connections',
      },
    },
    demo: {
      original: 'Original',
      anonymized: 'Anonymized',
      originalText: `Lease Agreement #2847
  
Landlord: Alpha Invest LLC
Tax ID: 12-3456789
Contact: John Smith
Phone: +1 (555) 123-4567
Email: john@alpha-invest.com

Banking Details:
Account: 1234567890123456
Routing: 021000021`,
      anonymizedText: `Lease Agreement #[DOC_ID]
  
Landlord: [COMPANY_1]
Tax ID: [TAX_ID_1]
Contact: [PERSON_1]
Phone: [PHONE_1]
Email: [EMAIL_1]

Banking Details:
Account: [ACCOUNT_1]
Routing: [ROUTING_1]`,
    },
    problem: {
      title: '— the silent threat',
      subtitle: '77% of employees already use AI at work. You can\'t ban AI, but you can make it safe to use.',
      stat1: { value: '$4.44M', label: 'Average cost of data breach', desc: 'Prevention is hundreds of times cheaper' },
      stat2: { value: '77%', label: 'Employees paste data into AI', desc: 'Bans don\'t work' },
      stat3: { value: '86%', label: 'Companies are blind to AI data flows', desc: 'GhostLayer brings back control' },
    },
    industries: {
      title: 'For professionals with',
      titleHighlight: 'responsibility',
      lawyers: { title: 'Lawyers', pain: 'Attorney-client privilege at risk — one prompt could cost your license' },
      finance: { title: 'Finance', pain: 'SEC fines for off-channel communications — AI chats are prohibited' },
      hr: { title: 'HR Professionals', pain: 'GDPR and right to be forgotten — resumes with PII can\'t go to cloud' },
      medical: { title: 'Healthcare', pain: 'HIPAA requires BAA — free AI services don\'t qualify for PHI' },
    },
    features: {
      title: 'Three layers of protection',
      titleHighlight: 'in one click',
      subtitle: 'Upload a document, review the results, copy safe text to any AI service',
      learning: { title: 'Learning System', desc: 'One click on a word — and it\'s hidden forever. GhostLayer learns from your edits and gets smarter with every document.' },
      instant: { title: 'Instant Processing', desc: 'Documents are processed locally in seconds. No network delays, no queues — everything happens on your device.' },
      inspector: { title: 'Entity Inspector', desc: 'Full control: review all detected entities and decide what to hide and what to keep for context.' },
      formats: { title: 'Format Support', desc: 'Works with PDF, DOCX, and TXT files. Upload a document and get an anonymized version in seconds.' },
      prompts: { title: 'Prompt Library', desc: 'Save prompt templates and copy anonymized text with instructions in one click.' },
      sideBySide: { title: 'Side-by-Side View', desc: 'Original and anonymized versions side by side. Synchronized scrolling and replacement highlighting for full control.' },
    },
    security: {
      badge: 'Zero-Trust Architecture',
      title: 'Security is',
      titleHighlight: 'not optional',
      subtitle: 'GhostLayer is designed so data leaks are physically impossible. Your documents never leave RAM.',
      points: [
        '100% Offline — no network connections',
        'Documents only in RAM — never on disk',
        'AES-256-GCM encryption for rules',
        'Machine-bound keys — database is useless on another PC',
      ],
      cardTitle: 'Data Protected',
      cardPoints: ['Documents processed locally', 'Never saved to disk', 'Deleted after closing'],
    },
    howItWorks: {
      title: 'Three steps to',
      titleHighlight: 'safe AI',
      steps: [
        { title: 'Upload Document', desc: 'Open a PDF, DOCX, or TXT file in GhostLayer' },
        { title: 'Review Results', desc: 'Check the side-by-side comparison and adjust if needed' },
        { title: 'Copy to AI', desc: 'Click "Copy" and paste safe text into any AI service' },
      ],
    },
    pricing: {
      title: 'Simple pricing.',
      titleHighlight: 'No subscriptions.',
      subtitle: 'Pay once — own forever. No monthly charges.',
      badge: '🎁 $99 with promo code',
      promo: 'Promo code:',
      promoDiscount: '= 50% off',
      footer: '7-day free trial • 30-day money-back guarantee • Windows only',
      free: {
        name: 'Free',
        price: '$0',
        period: 'forever',
        features: ['Unlimited documents', '5 basic categories (Email, Phone, URL, Date, Name)', 'Russian and English', 'Entity Inspector', 'Prompt Library', 'Side-by-Side view'],
        cta: 'Download Free',
      },
      pro: {
        name: 'Professional',
        price: '$199',
        trial: '7-day free trial',
        features: ['Everything in Free', '35+ PII categories (SSN, Credit Cards, Addresses...)', 'Learning System — AI learns from your edits', 'Whitelist & Custom Regex', '1 year of updates and support', '30-day money-back guarantee'],
        cta: 'Start Free Trial',
      },
      team: {
        name: 'Team',
        price: 'Soon',
        period: 'coming soon',
        features: ['Everything in Professional', '5 seats', 'Shared rules database', 'Audit log', 'Integrations'],
        cta: 'Request Access',
      },
    },
    cta: {
      title: 'Start protecting data',
      titleHighlight: 'today',
      subtitle: '7-day free trial. 30-day money-back guarantee. No registration.',
      button: 'Download GhostLayer for Windows',
      version: 'Windows only',
    },
    footer: {
      docs: 'Documentation',
      contact: 'Contact',
      rights: '© 2025 GhostLayer. All rights reserved.',
    },
    docsModal: {
      title: 'Documentation',
      subtitle: 'Choose a document to view',
      quickStart: 'Quick Start',
      quickStartDesc: 'Get started in 5 minutes',
      userGuide: 'User Guide',
      userGuideDesc: 'Complete feature documentation',
    },
    faq: {
      title: 'Frequently Asked',
      titleHighlight: 'Questions',
      items: [
        {
          q: 'Is GhostLayer safe to use?',
          a: 'Yes. GhostLayer works completely offline — no network connections. Your documents are processed only in RAM and never saved to disk.'
        },
        {
          q: 'Where are my anonymization rules stored?',
          a: 'Rules are stored locally on your computer in an encrypted database (AES-256-GCM). The key is bound to your device — the database is useless on another PC.'
        },
        {
          q: 'What\'s the difference between Free and Professional?',
          a: 'Free version includes 5 basic PII categories (Email, Phone, URL, Date, Name). Professional adds 35+ categories (SSN, Credit Cards, Addresses, etc.), Learning System (app remembers edits), Whitelist, and Custom Regex for full control.'
        },
        {
          q: 'How do I activate a Professional license?',
          a: 'After payment, you\'ll receive a license key by email. Enter it in the app: Settings → License → Activate.'
        },
        {
          q: 'Is there a money-back guarantee?',
          a: 'Yes, 30 days no questions asked. If the product doesn\'t work for you — email support@ghostlayerapp.com and we\'ll refund you.'
        },
        {
          q: 'What file formats are supported?',
          a: 'PDF, DOCX, and TXT. Maximum file size is 50 MB.'
        },
      ],
    },
    contactModal: {
      title: 'Contact Us',
      subtitle: 'We\'ll respond within 24 hours',
      emailLabel: 'Or email us directly:',
    },
    modal: {
      title: 'Request Team Access',
      subtitle: 'We\'ll contact you when Team version is ready',
      name: 'Your name',
      email: 'Email',
      message: 'Message (optional)',
      submit: 'Submit Request',
      sending: 'Sending...',
      success: 'Request sent!',
      error: 'Error. Please try again later.',
    },
  },
};

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
const AnonymizationDemo = ({ t }) => {
  const [showOriginal, setShowOriginal] = useState(true);

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
          {t.demo.original}
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
          {t.demo.anonymized}
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
          {showOriginal ? t.demo.originalText : t.demo.anonymizedText}
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
const PricingCard = ({ name, price, originalPrice, period, trial, features, popular, cta, badge, onClick }) => (
  <div className={`relative bg-gradient-to-br from-zinc-900/90 to-zinc-900/50 rounded-2xl p-8 border ${
    popular ? 'border-emerald-500/50' : 'border-zinc-800'
  } transition-all hover:transform hover:scale-[1.02] flex flex-col h-full`}>
    {popular && badge && (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 rounded-full text-black text-sm font-semibold whitespace-nowrap text-center">
        {badge}
      </div>
    )}
    
    <h3 className="text-2xl font-bold text-white mb-2">{name}</h3>
    <div className="flex items-baseline gap-2 mb-2">
      {originalPrice && (
        <span className="text-2xl text-zinc-500 line-through">{originalPrice}</span>
      )}
      <span className="text-4xl font-bold text-white">{price}</span>
      {period && <span className="text-zinc-500">{period}</span>}
    </div>
    {trial && (
      <div className="text-emerald-400 text-sm font-medium mb-4">
        ✓ {trial}
      </div>
    )}
    {!trial && <div className="mb-4" />}
    
    <ul className="space-y-3 mb-8 flex-grow">
      {features.map((feature, i) => (
        <li key={i} className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span className="text-zinc-300">{feature}</span>
        </li>
      ))}
    </ul>
    
    <button onClick={onClick} className={`w-full py-3 rounded-xl font-semibold transition-all mt-auto ${
      popular 
        ? 'bg-emerald-500 text-black hover:bg-emerald-400' 
        : 'bg-zinc-800 text-white hover:bg-zinc-700'
    }`}>
      {cta}
    </button>
  </div>
);

// Contact Modal component
const ContactModal = ({ isOpen, onClose, t }) => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('');
  
  if (!isOpen) return null;
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: 'bf442846-7437-4772-9186-23c4ca733416',
          name: formData.name,
          email: formData.email,
          message: formData.message,
          subject: 'GhostLayer Team - Request'
        })
      });
      if (response.ok) {
        setStatus('success');
        setTimeout(() => { onClose(); setStatus(''); setFormData({ name: '', email: '', message: '' }); }, 2000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative bg-zinc-900 rounded-2xl p-8 max-w-md w-full border border-zinc-800" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-2xl font-bold text-white mb-2">{t.modal.title}</h3>
        <p className="text-zinc-400 mb-6">{t.modal.subtitle}</p>
        
        {status === 'success' ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <p className="text-white">{t.modal.success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder={t.modal.name}
              required
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <input
              type="email"
              placeholder={t.modal.email}
              required
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
            <textarea
              placeholder={t.modal.message}
              rows={3}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none resize-none"
              value={formData.message}
              onChange={e => setFormData({...formData, message: e.target.value})}
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full py-3 bg-emerald-500 text-black font-semibold rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              {status === 'sending' ? t.modal.sending : t.modal.submit}
            </button>
            {status === 'error' && <p className="text-red-400 text-sm text-center">{t.modal.error}</p>}
          </form>
        )}
      </div>
    </div>
  );
};

// Documentation Modal
const DocsModal = ({ isOpen, onClose, t, lang }) => {
  if (!isOpen) return null;
  
  const docs = [
    { 
      id: 'quickstart',
      title: t.docsModal.quickStart, 
      desc: t.docsModal.quickStartDesc,
      icon: Zap,
      url: lang === 'ru' ? '/docs/GhostLayer-QuickStart-RU.pdf' : '/docs/GhostLayer-QuickStart-EN.pdf'
    },
    { 
      id: 'userguide',
      title: t.docsModal.userGuide, 
      desc: t.docsModal.userGuideDesc,
      icon: FileText,
      url: lang === 'ru' ? '/docs/GhostLayer-UserGuide-RU.pdf' : '/docs/GhostLayer-UserGuide-EN.pdf'
    },
  ];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative bg-zinc-900 rounded-2xl p-8 max-w-md w-full border border-zinc-800" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-2xl font-bold text-white mb-2">{t.docsModal.title}</h3>
        <p className="text-zinc-400 mb-6">{t.docsModal.subtitle}</p>
        
        <div className="space-y-3">
          {docs.map((doc) => (
            <a
              key={doc.id}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 hover:border-emerald-500/50 hover:bg-zinc-800 transition-all group"
            >
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <doc.icon className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="text-white font-medium">{doc.title}</div>
                <div className="text-zinc-500 text-sm">{doc.desc}</div>
              </div>
              <Download className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

// General Contact Modal
const GeneralContactModal = ({ isOpen, onClose, t }) => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('');
  
  if (!isOpen) return null;
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: 'bf442846-7437-4772-9186-23c4ca733416',
          name: formData.name,
          email: formData.email,
          message: formData.message,
          subject: 'GhostLayer - Contact Form'
        })
      });
      if (response.ok) {
        setStatus('success');
        setTimeout(() => { onClose(); setStatus(''); setFormData({ name: '', email: '', message: '' }); }, 2000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative bg-zinc-900 rounded-2xl p-8 max-w-md w-full border border-zinc-800" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-2xl font-bold text-white mb-2">{t.contactModal.title}</h3>
        <p className="text-zinc-400 mb-6">{t.contactModal.subtitle}</p>
        
        {status === 'success' ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <p className="text-white">{t.modal.success}</p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder={t.modal.name}
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
              <input
                type="email"
                placeholder={t.modal.email}
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
              <textarea
                placeholder={t.modal.message}
                rows={3}
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none resize-none"
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
              />
              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full py-3 bg-emerald-500 text-black font-semibold rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50"
              >
                {status === 'sending' ? t.modal.sending : t.modal.submit}
              </button>
              {status === 'error' && <p className="text-red-400 text-sm text-center">{t.modal.error}</p>}
            </form>
            
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <p className="text-zinc-500 text-sm mb-2">{t.contactModal.emailLabel}</p>
              <a 
                href="mailto:support@ghostlayerapp.com" 
                className="text-emerald-400 hover:text-emerald-300 font-medium"
              >
                support@ghostlayerapp.com
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Industry card
const IndustryCard = ({ icon: Icon, title, pain }) => (
  <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800 hover:border-zinc-700 transition-colors">
    <Icon className="w-8 h-8 text-emerald-400 mb-3" />
    <h4 className="text-white font-semibold mb-2">{title}</h4>
    <p className="text-zinc-500 text-sm">{pain}</p>
  </div>
);

// Language Switcher
const LanguageSwitcher = ({ lang, setLang }) => (
  <button
    onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
  >
    <Globe className="w-4 h-4 text-zinc-400" />
    <span className="text-zinc-300 font-medium">{lang === 'ru' ? 'EN' : 'RU'}</span>
  </button>
);

// Main landing page component
export default function GhostLayerLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showGeneralContactModal, setShowGeneralContactModal] = useState(false);
  const [lang, setLang] = useState('en');
  
  const t = translations[lang];
  
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const downloadUrl = 'https://github.com/Josefromkaz/ghostlayer-website/releases/download/v1.0.0/GhostLayer_v1.0.0_Windows_x64.zip';
  const checkoutUrl = 'https://ghostlayer.lemonsqueezy.com/checkout/buy/3a2ae4ca-d3d0-4095-beb0-169b278fb091';

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
            <a href="#features" className="text-zinc-400 hover:text-white transition-colors">{t.nav.features}</a>
            <a href="#security" className="text-zinc-400 hover:text-white transition-colors">{t.nav.security}</a>
            <a href="#pricing" className="text-zinc-400 hover:text-white transition-colors">{t.nav.pricing}</a>
          </div>
          
          <div className="flex items-center gap-3">
            <LanguageSwitcher lang={lang} setLang={setLang} />
            <a href={downloadUrl} className="px-5 py-2.5 bg-emerald-500 text-black font-semibold rounded-xl hover:bg-emerald-400 transition-colors flex items-center gap-2">
              {t.nav.download}
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        <ParticleField />
        
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px]" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-8">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-400 text-sm font-medium">{t.hero.badge}</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
                {t.hero.title1}
                <br />
                <span className="text-zinc-500">{t.hero.title2}</span>
                <br />
                <span className="block h-[1.8em] mb-4">
                  <TypeWriter words={t.hero.typewriter} />
                </span>
              </h1>
              
              <p className="text-xl text-zinc-400 mb-8 max-w-lg leading-relaxed">
                {t.hero.description}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <a href={downloadUrl} className="px-8 py-4 bg-emerald-500 text-black font-semibold rounded-xl hover:bg-emerald-400 transition-all hover:transform hover:scale-105 flex items-center justify-center gap-2 text-lg">
                  {t.hero.downloadBtn}
                  <Download className="w-5 h-5" />
                </a>
                <button className="px-8 py-4 bg-zinc-800 text-white font-semibold rounded-xl hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2 text-lg border border-zinc-700">
                  {t.hero.demoBtn}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-8 mt-10 pt-10 border-t border-zinc-800">
                <div>
                  <div className="text-3xl font-bold text-white"><AnimatedNumber value={28} /></div>
                  <div className="text-zinc-500 text-sm">{t.hero.stats.patterns}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">&lt;2<span className="text-emerald-400">{lang === 'ru' ? 'сек' : 'sec'}</span></div>
                  <div className="text-zinc-500 text-sm">{t.hero.stats.startup}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">0</div>
                  <div className="text-zinc-500 text-sm">{t.hero.stats.connections}</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <AnonymizationDemo t={t} />
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="relative py-24 bg-gradient-to-b from-zinc-950 to-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-red-400">Shadow AI</span> {t.problem.title}
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              {t.problem.subtitle}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-red-500/5 rounded-2xl p-8 border border-red-500/20">
              <div className="text-6xl font-bold text-red-400 mb-4">{t.problem.stat1.value}</div>
              <div className="text-white font-semibold mb-2">{t.problem.stat1.label}</div>
              <div className="text-zinc-500 text-sm mb-3">{t.problem.stat1.desc}</div>
              <div className="text-zinc-600 text-xs">IBM, Cost of a Data Breach Report 2025</div>
            </div>
            
            <div className="bg-red-500/5 rounded-2xl p-8 border border-red-500/20">
              <div className="text-6xl font-bold text-red-400 mb-4">{t.problem.stat2.value}</div>
              <div className="text-white font-semibold mb-2">{t.problem.stat2.label}</div>
              <div className="text-zinc-500 text-sm mb-3">{t.problem.stat2.desc}</div>
              <div className="text-zinc-600 text-xs">LayerX Security, AI Data Security Report 2025</div>
            </div>
            
            <div className="bg-red-500/5 rounded-2xl p-8 border border-red-500/20">
              <div className="text-6xl font-bold text-red-400 mb-4">{t.problem.stat3.value}</div>
              <div className="text-white font-semibold mb-2">{t.problem.stat3.label}</div>
              <div className="text-zinc-500 text-sm mb-3">{t.problem.stat3.desc}</div>
              <div className="text-zinc-600 text-xs">Kiteworks, AI Security Gap Report 2025</div>
            </div>
          </div>
        </div>
      </section>

      {/* For Who Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t.industries.title} <span className="text-emerald-400">{t.industries.titleHighlight}</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <IndustryCard icon={Scale} title={t.industries.lawyers.title} pain={t.industries.lawyers.pain} />
            <IndustryCard icon={Briefcase} title={t.industries.finance.title} pain={t.industries.finance.pain} />
            <IndustryCard icon={Users} title={t.industries.hr.title} pain={t.industries.hr.pain} />
            <IndustryCard icon={Heart} title={t.industries.medical.title} pain={t.industries.medical.pain} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-b from-zinc-900/50 to-zinc-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t.features.title} <span className="text-emerald-400">{t.features.titleHighlight}</span>
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              {t.features.subtitle}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon={Brain} title={t.features.learning.title} description={t.features.learning.desc} />
            <FeatureCard icon={Zap} title={t.features.instant.title} description={t.features.instant.desc} />
            <FeatureCard icon={Eye} title={t.features.inspector.title} description={t.features.inspector.desc} />
            <FeatureCard icon={FileText} title={t.features.formats.title} description={t.features.formats.desc} />
            <FeatureCard icon={Copy} title={t.features.prompts.title} description={t.features.prompts.desc} />
            <FeatureCard icon={Columns} title={t.features.sideBySide.title} description={t.features.sideBySide.desc} />
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
                <span className="text-emerald-400 text-sm font-medium">{t.security.badge}</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                {t.security.title} <span className="text-emerald-400">{t.security.titleHighlight}</span>
              </h2>
              
              <p className="text-xl text-zinc-400 mb-8">
                {t.security.subtitle}
              </p>
              
              <div className="space-y-4">
                {[Server, Cpu, Lock, Shield].map((Icon, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="text-white">{t.security.points[i]}</span>
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
                  <h3 className="text-2xl font-bold text-white mb-4">{t.security.cardTitle}</h3>
                  <div className="space-y-3 text-left w-full max-w-sm">
                    {t.security.cardPoints.map((point, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span className="text-zinc-300">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 mt-6 justify-center">
                <div className="px-4 py-2 bg-zinc-800 rounded-lg text-zinc-400 text-sm">GDPR ✓</div>
                <div className="px-4 py-2 bg-zinc-800 rounded-lg text-zinc-400 text-sm">{lang === 'ru' ? '152-ФЗ' : 'CCPA'} ✓</div>
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
              {t.howItWorks.title} <span className="text-emerald-400">{t.howItWorks.titleHighlight}</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {t.howItWorks.steps.map((item, i) => (
              <div key={i} className="relative">
                <div className="text-8xl font-bold text-emerald-500/10 absolute -top-6 -left-2">0{i + 1}</div>
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
              {t.pricing.title} <span className="text-emerald-400">{t.pricing.titleHighlight}</span>
            </h2>
            <p className="text-xl text-zinc-400">
              {t.pricing.subtitle}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name={t.pricing.free.name}
              price={t.pricing.free.price}
              period={t.pricing.free.period}
              features={t.pricing.free.features}
              cta={t.pricing.free.cta}
              onClick={() => window.location.href = downloadUrl}
            />
            
            <PricingCard
              name={t.pricing.pro.name}
              price={t.pricing.pro.price}
              trial={t.pricing.pro.trial}
              popular
              badge={lang === 'ru' ? '🔥 Рекомендуем' : '🔥 Recommended'}
              features={t.pricing.pro.features}
              cta={t.pricing.pro.cta}
              onClick={() => window.location.href = downloadUrl}
            />
            
            <PricingCard
              name={t.pricing.team.name}
              price={t.pricing.team.price}
              period={t.pricing.team.period}
              features={t.pricing.team.features}
              cta={t.pricing.team.cta}
              onClick={() => setShowContactModal(true)}
            />
          </div>
          
          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 mb-4">
              <span className="text-zinc-400">{t.pricing.promo}</span>
              <code className="text-emerald-400 font-bold text-lg">NEWGHOST50</code>
              <span className="text-zinc-500">{t.pricing.promoDiscount}</span>
            </div>
            <p className="text-zinc-500 mb-4">
              {lang === 'ru' ? '30-дневная гарантия возврата • Только для Windows' : '30-day money-back guarantee • Windows only'}
            </p>
            <a 
              href={checkoutUrl}
              className="text-emerald-400 hover:text-emerald-300 underline text-sm"
            >
              {lang === 'ru' ? 'Уже попробовали? Купить лицензию →' : 'Already tried it? Buy license →'}
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gradient-to-b from-zinc-950 to-zinc-900/50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t.faq.title} <span className="text-emerald-400">{t.faq.titleHighlight}</span>
            </h2>
          </div>
          
          <div className="space-y-4">
            {t.faq.items.map((item, i) => (
              <details key={i} className="group bg-zinc-900/50 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="text-white font-medium pr-4">{item.q}</span>
                  <ChevronRight className="w-5 h-5 text-zinc-500 group-open:rotate-90 transition-transform flex-shrink-0" />
                </summary>
                <div className="px-6 pb-6 text-zinc-400">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-zinc-900/50 to-zinc-950">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t.cta.title} <span className="text-emerald-400">{t.cta.titleHighlight}</span>
          </h2>
          <p className="text-xl text-zinc-400 mb-8">
            {t.cta.subtitle}
          </p>
          
          <a href={downloadUrl} className="px-10 py-5 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all hover:transform hover:scale-105 text-xl inline-flex items-center justify-center gap-3">
            {t.cta.button}
            <Download className="w-6 h-6" />
          </a>
          
          <p className="text-zinc-600 mt-6 text-sm">
            v1.0.0 • ~220 MB • {t.cta.version}
          </p>
          <p className="text-zinc-700 mt-2 text-xs font-mono">
            SHA-256: 1ac6cd78ce8029c31aa817c2a294ce2f03885efabe6f6022137939f393e084ef
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
              <button onClick={() => setShowDocsModal(true)} className="hover:text-white transition-colors">{t.footer.docs}</button>
              <button onClick={() => setShowGeneralContactModal(true)} className="hover:text-white transition-colors">{t.footer.contact}</button>
            </div>
            
            <div className="text-zinc-600 text-sm">
              {t.footer.rights}
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} t={t} />
      
      {/* Documentation Modal */}
      <DocsModal isOpen={showDocsModal} onClose={() => setShowDocsModal(false)} t={t} lang={lang} />
      
      {/* General Contact Modal */}
      <GeneralContactModal isOpen={showGeneralContactModal} onClose={() => setShowGeneralContactModal(false)} t={t} />
    </div>
  );
}
