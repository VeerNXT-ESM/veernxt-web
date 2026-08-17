import { motion } from 'motion/react';
import {
  Target, Users, TrendingUp, Briefcase, ArrowRight,
  ChevronRight, ShieldCheck, CheckCircle2, MapPin, Phone, Mail,
  Award, Globe, Lock, Star, Apple, PlaySquare, Languages, ChevronDown, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { AnimatePresence } from 'motion/react';

// ─── NAVBAR ──────────────────────────────────────────────────────────────────

const NavBar = () => {
  const { t, i18n } = useTranslation();
  const [isLangOpen, setIsLangOpen] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी (Hindi)' },
    { code: 'ta', name: 'தமிழ் (Tamil)' },
    { code: 'mr', name: 'मराठी (Marathi)' },
    { code: 'te', name: 'తెలుగు (Telugu)' },
    { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
  ];
  
  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
      <nav className="w-full py-4 md:py-6 flex justify-between items-center px-6 max-w-7xl mx-auto">
        <img src="/logo.png" alt="VeerNXT" className="h-10 md:h-14 w-auto object-contain" style={{ maxHeight: '56px', width: 'auto' }} />
        
        <div className="flex items-center gap-4">
          <div className="relative" onMouseEnter={() => setIsLangOpen(true)} onMouseLeave={() => setIsLangOpen(false)}>
            <button className={`text-sm font-medium hover:text-ios-olive transition-colors flex items-center gap-1 text-white h-10 ${isLangOpen ? 'text-ios-olive' : ''}`}>
              <Languages className="w-4 h-4" />
              <span className="hidden sm:inline uppercase">{currentLang.code}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isLangOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-0 w-48 bg-[#1a1a1a] rounded-xl shadow-2xl border border-white/10 overflow-hidden py-2 z-50"
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        i18n.changeLanguage(lang.code);
                        setIsLangOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left group ${i18n.language === lang.code ? 'text-ios-olive bg-white/5' : 'text-gray-300'}`}
                    >
                      <span className={`text-xs font-bold tracking-tight ${i18n.language === lang.code ? 'text-ios-olive' : 'text-gray-300'}`}>{lang.name}</span>
                      {i18n.language === lang.code && <Check className="w-3 h-3 text-ios-olive ml-auto" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Link
            to="/login"
            className="bg-ios-olive text-black font-black px-6 py-2.5 rounded-full text-xs uppercase tracking-wider hover:bg-ios-olive/90 transition-all shadow-lg shadow-ios-olive/20 inline-flex items-center gap-1.5"
          >
            {t('landing.hero.cta')}
          </Link>
        </div>
      </nav>
    </header>
  );
};

// ─── HERO ────────────────────────────────────────────────────────────────────

const Hero = () => {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  
  return (
    <section className="relative min-h-[calc(100vh-168px)] flex items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/hero/hero_image.jpg"
          src="/hero_video1.mp4"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-24 md:pt-32 pb-12 relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl text-white"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="w-8 h-[2px] bg-ios-olive" />
            <span className="text-xs font-bold tracking-[0.2em] text-white uppercase">{t('landing.hero.subtitle')}</span>
          </div>

          <h1 className={`font-black tracking-tighter mb-8 drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)] ${isEnglish ? 'text-6xl md:text-8xl leading-[0.95]' : 'text-5xl md:text-7xl leading-tight'}`}>
            {t('landing.hero.title_1')}<br />
            <span className="text-white">{t('landing.hero.title_2')}</span><br />
            {t('landing.hero.title_3')}
          </h1>

          <div className="flex flex-wrap gap-4 mb-10">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-ios-olive" />
              <span className="text-sm font-medium text-gray-200 drop-shadow-md">{t('landing.hero.gov')}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-ios-olive" />
              <span className="text-sm font-medium text-gray-200 drop-shadow-md">{t('landing.hero.veteran')}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/login"
              className="ios-btn-primary ios-pill px-8 py-4 text-sm font-black tracking-widest uppercase flex items-center gap-2 group shadow-2xl shadow-ios-olive/30"
            >
              {t('landing.hero.cta')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ─── WHAT IS VEERNXT? ────────────────────────────────────────────────────────
const WhatIsVeerNXT = () => {
  const { t, i18n } = useTranslation();
  const videoIds = {
    hi: 'wG--TwXf6yI',
    mr: 'VXhSDvpQOPk',
    te: 'LMnM9SU5rAM',
    ta: 'OdeYjGGomXY',
    kn: 'mgT1G9y8J3E',
  };
  const videoId = videoIds[i18n.language] || '3HBSfoM2Sls';

  return (
    <section className="py-24 bg-[#0d0d0d] text-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-ios-olive tracking-widest mb-4 uppercase">
            <span className="w-8 h-[2px] bg-ios-olive" /> {t('landing.whatIs.badge')} <span className="w-8 h-[2px] bg-ios-olive" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-8">
            {t('landing.whatIs.title_1')} <span className="text-ios-olive">{t('landing.whatIs.title_2')}</span>
          </h2>
          <p className="text-gray-300 text-lg md:text-2xl leading-relaxed font-light max-w-4xl mx-auto mb-12">
            {t('landing.whatIs.desc')}
          </p>

          <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative aspect-video bg-black">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&mute=1&rel=0&modestbranding=1`}
              title="VeerNXT Introduction Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>

          <div className="inline-flex flex-wrap justify-center gap-8 md:gap-16 mt-16 p-8 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl">
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-black text-white">{t('landing.whatIs.stat_1_val')}</p>
              <p className="text-xs md:text-sm text-ios-olive font-bold uppercase tracking-widest mt-2">{t('landing.whatIs.stat_1_label')}</p>
            </div>
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-black text-white">{t('landing.whatIs.stat_2_val')}</p>
              <p className="text-xs md:text-sm text-ios-olive font-bold uppercase tracking-widest mt-2">{t('landing.whatIs.stat_2_label')}</p>
            </div>
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-black text-white">{t('landing.whatIs.stat_3_val')}</p>
              <p className="text-xs md:text-sm text-ios-olive font-bold uppercase tracking-widest mt-2">{t('landing.whatIs.stat_3_label')}</p>
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <Link
              to="/login"
              className="ios-btn-primary ios-pill px-10 py-5 text-sm font-black tracking-widest uppercase inline-flex items-center gap-3 group shadow-2xl shadow-ios-olive/30 hover:scale-105 transition-transform"
            >
              {t('landing.hero.cta')} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ─── PRIMARY SERVICE OFFERINGS ───────────────────────────────────────────────

const PrimaryServiceOfferings = () => {
  const { t } = useTranslation();
  const serviceOfferings = [
    {
      image: '/homepage/F3A.png',
      title: t('landing.services.card1_title'),
      objective: t('landing.services.card1_obj'),
      bullets: [
        { title: t('landing.services.card1_b1_t'), desc: t('landing.services.card1_b1_d') },
        { title: t('landing.services.card1_b2_t'), desc: t('landing.services.card1_b2_d') },
        { title: t('landing.services.card1_b3_t'), desc: t('landing.services.card1_b3_d') }
      ]
    },
    {
      image: '/homepage/F3_B.png',
      title: t('landing.services.card2_title'),
      objective: t('landing.services.card2_obj'),
      bullets: [
        { title: t('landing.services.card2_b1_t'), desc: t('landing.services.card2_b1_d') },
        { title: t('landing.services.card2_b2_t'), desc: t('landing.services.card2_b2_d') },
        { title: t('landing.services.card2_b3_t'), desc: t('landing.services.card2_b3_d') }
      ]
    }
  ];

  return (
    <section className="py-24 bg-ios-secondary">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-ios-olive tracking-widest mb-4 uppercase">
            {t('landing.services.badge')} <span className="w-8 h-[2px] bg-ios-olive" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
            {t('landing.services.title_1')} <span className="text-ios-olive">{t('landing.services.title_2')}</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {serviceOfferings.map((service, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="ios-card bg-white p-8 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/10 transition-all duration-300 group flex flex-col"
            >
                <div className="w-full aspect-square rounded-xl overflow-hidden mb-6 shadow-lg relative">
                  <img src={service.image} alt={service.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
              <h3 className="text-2xl font-bold tracking-tight mb-2 text-ios-olive">{service.title}</h3>
              <p className="text-gray-600 font-semibold mb-6">Objective: {service.objective}</p>
              <ul className="space-y-4">
                {service.bullets.map((b, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-ios-olive flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-800 text-sm block">{b.title}</strong>
                      <span className="text-gray-500 text-sm font-medium leading-relaxed">{b.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <Link
            to="/login"
            className="ios-btn-primary ios-pill px-10 py-5 text-sm font-black tracking-widest uppercase inline-flex items-center gap-3 group shadow-2xl shadow-ios-olive/30 hover:scale-105 transition-transform"
          >
            {t('landing.hero.cta')} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

// ─── ONBOARDING PROCESS ──────────────────────────────────────────────────────

const OnboardingProcess = () => {
  const { t } = useTranslation();
  const onboardingSteps = [
    { num: 'Step 01', title: t('landing.onboarding.s1_t'), desc: t('landing.onboarding.s1_d'), image: '/homepage/F4_A.png' },
    { num: 'Step 02', title: t('landing.onboarding.s2_t'), desc: t('landing.onboarding.s2_d'), image: '/homepage/F4B.png' },
    { num: 'Step 03', title: t('landing.onboarding.s3_t'), desc: t('landing.onboarding.s3_d'), image: '/homepage/F4C.png' },
    { num: 'Step 04', title: t('landing.onboarding.s4_t'), desc: t('landing.onboarding.s4_d'), image: '/homepage/F4D.png' }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#111] text-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-ios-olive tracking-widest mb-4 uppercase">
            {t('landing.onboarding.badge')} <span className="w-8 h-[2px] bg-ios-olive" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
            {t('landing.onboarding.title_1')}<br />
            <span className="text-ios-olive">{t('landing.onboarding.title_2')}</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6">
          {onboardingSteps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative"
            >
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 hover:border-ios-olive/30 transition-all group h-full flex flex-col">
                {step.image && (
                  <div className="w-full h-40 rounded-2xl overflow-hidden mb-6 shadow-2xl relative">
                    <img src={step.image} alt={step.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                )}
                <div className="text-2xl font-black text-ios-olive/40 mb-4 tracking-tighter group-hover:text-ios-olive transition-colors">
                  {step.num}
                </div>
                <h3 className="text-lg font-bold tracking-tight mb-3 text-white group-hover:text-ios-olive transition-colors">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed font-medium flex-grow">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <Link
            to="/login"
            className="ios-btn-primary ios-pill px-10 py-5 text-sm font-black tracking-widest uppercase inline-flex items-center gap-3 group shadow-2xl shadow-ios-olive/30 hover:scale-105 transition-transform"
          >
            {t('landing.onboarding.cta')} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

// ─── REGULATORY COMPLIANCE ────────────────────────────────────────────────────

const RegulatoryCompliance = () => {
  const { t } = useTranslation();
  const validations = [
    { image: '/homepage/F5A.png', title: t('landing.regulatory.c1_t'), subtitle: t('landing.regulatory.c1_st'), desc: t('landing.regulatory.c1_d') },
    { image: '/homepage/F5B.png', title: t('landing.regulatory.c2_t'), subtitle: t('landing.regulatory.c2_st'), desc: t('landing.regulatory.c2_d') },
    { image: '/homepage/F5C.png', title: t('landing.regulatory.c3_t'), subtitle: t('landing.regulatory.c3_st'), desc: t('landing.regulatory.c3_d') }
  ];

  return (
    <section className="py-24 bg-ios-secondary">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
            {t('landing.regulatory.title_1')}<br />
            <span className="text-ios-olive">{t('landing.regulatory.title_2')}</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {validations.map((val, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="ios-card bg-white p-8 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/10 transition-all duration-300 group flex flex-col"
            >
                <div className="w-full aspect-square rounded-xl overflow-hidden mb-6 shadow-lg relative">
                  <img src={val.image} alt={val.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
              <h3 className="text-xl font-bold tracking-tight mb-1">{val.title}</h3>
              <p className="text-sm font-bold text-ios-olive mb-4">{val.subtitle}</p>
              <p className="text-gray-500 text-sm leading-relaxed font-medium flex-grow">{val.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <Link
            to="/login"
            className="ios-btn-primary ios-pill px-10 py-5 text-sm font-black tracking-widest uppercase inline-flex items-center gap-3 group shadow-2xl shadow-ios-olive/30 hover:scale-105 transition-transform"
          >
            {t('landing.onboarding.cta')} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

// ─── CTA SECTION ─────────────────────────────────────────────────────────────


const EmployerPortal = () => {
  const { t } = useTranslation();
  return (
    <section className="py-24 bg-[#0a0a0a] text-white border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1 space-y-6"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-ios-olive tracking-widest uppercase">
              <span className="w-8 h-[2px] bg-ios-olive" /> {t('landing.employer.badge')}
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight">
              {t('landing.employer.title_1')} <span className="text-ios-olive">{t('landing.employer.title_2')}</span>
            </h2>
            <p className="text-gray-300 font-light leading-relaxed text-lg max-w-xl">
              {t('landing.employer.desc')}
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="ios-btn-primary ios-pill px-8 py-4 text-sm font-black tracking-widest uppercase inline-flex items-center gap-3 group shadow-2xl shadow-ios-olive/30 hover:scale-105 transition-transform"
              >
                {t('landing.hero.cta')} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1 w-full relative"
          >
            <div className="aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
              <img src="/homepage/emplyer portal.png" alt="Employer Portal" className="w-full h-full object-cover" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const CTASection = () => {
  const { t } = useTranslation();
  return (
    <section className="relative py-32 overflow-hidden border-t border-white/5">
      <div className="absolute inset-0 z-0">
        <img
          src="/hero/about.png"
          className="w-full h-full object-cover"
          alt=""
          style={{ filter: 'brightness(0.15)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/80 to-ios-olive/30" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-white">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 leading-tight">
              {t('landing.cta.title_1')} <span className="text-ios-olive">{t('landing.cta.title_2')}</span>
            </h2>
            <p className="text-gray-300 text-lg font-light max-w-4xl mx-auto leading-relaxed">
              {t('landing.cta.desc')}
            </p>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 lg:p-12 max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 backdrop-blur-md">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-6">{t('landing.cta.steps_title')}</h3>
              <ol className="space-y-4 text-base text-gray-300 font-light list-decimal pl-5">
                <li>{t('landing.cta.step_1')}</li>
                <li>{t('landing.cta.step_2')}</li>
                <li>{t('landing.cta.step_3')}</li>
              </ol>
              
              <div className="flex flex-wrap gap-4 mt-8">
                <div
                  className="bg-white/5 text-white/60 border border-white/10 ios-pill px-6 py-3 text-sm font-bold tracking-widest uppercase inline-flex items-center gap-3 select-none"
                >
                  {t('landing.cta.coming_apple')} <Apple className="w-5 h-5" />
                </div>
                <div
                  className="bg-white/5 text-white/60 border border-white/10 ios-pill px-6 py-3 text-sm font-bold tracking-widest uppercase inline-flex items-center gap-3 select-none"
                >
                  {t('landing.cta.coming_play')} <PlaySquare className="w-5 h-5" />
                </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-white/10 flex justify-center w-full">
                <Link
                  to="/login"
                  className="ios-btn-primary ios-pill px-10 py-5 text-sm font-black tracking-widest uppercase inline-flex items-center gap-3 group shadow-2xl shadow-ios-olive/30 w-full justify-center md:w-auto hover:scale-105 transition-transform"
                >
                  {t('landing.onboarding.cta')} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center md:border-l md:border-white/10 md:pl-12 w-full mt-12 md:mt-0">
              <img src="/homepage/F6_Phone.png" alt="VeerNXT App Preview" className="h-auto md:h-[768px] max-h-[60vh] md:max-h-none w-full max-w-[280px] md:max-w-none object-contain drop-shadow-2xl hover:scale-[1.02] transition-transform mx-auto" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ─── FOOTER ──────────────────────────────────────────────────────────────────

const LandingFooter = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-[#0a0a0a] text-white pt-16 pb-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="VeerNXT" className="w-8 h-8 object-contain" />
              <span className="text-xl font-black tracking-tight">VeerNXT</span>
            </div>
            <p className="text-gray-400 text-sm font-light leading-relaxed max-w-xs">
              {t('landing.footer.desc')}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">{t('landing.footer.contact')}</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-ios-olive mt-0.5 flex-shrink-0" />
                <a href="mailto:support@veernxt.in" className="hover:text-ios-olive transition-colors">support@veernxt.in</a>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-ios-olive mt-0.5 flex-shrink-0" />
                <a href="tel:+917889530025" className="hover:text-ios-olive transition-colors">+91-7889530025</a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-ios-olive mt-0.5 flex-shrink-0" />
                <span>225, 3rd C Cross Rd, Block 2, 3rd Stage, Basaveshwar Nagar, Bengaluru, Karnataka 560079</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">{t('landing.footer.legal')}</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/privacy" className="text-gray-400 hover:text-ios-olive transition-colors">{t('landing.footer.privacy')}</Link></li>
              <li><Link to="/support" className="text-gray-400 hover:text-ios-olive transition-colors">{t('landing.footer.support')}</Link></li>
              <li><Link to="/legal" className="text-gray-400 hover:text-ios-olive transition-colors">{t('landing.footer.terms')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            {t('landing.footer.copy')}
          </p>
          <div className="text-xs font-bold tracking-widest text-white/40 uppercase mb-4 md:mb-0">
            {t('landing.footer.builtBy')}
          </div>
        </div>
      </div>
    </footer>
  );
};

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────

export const LandingPage = () => (
  <div className="bg-[#0a0a0a]">
    <NavBar />
    <Hero />
    <WhatIsVeerNXT />
    <PrimaryServiceOfferings />
    <OnboardingProcess />
    <RegulatoryCompliance />
    <EmployerPortal />
    <CTASection />
    <LandingFooter />
  </div>
);
