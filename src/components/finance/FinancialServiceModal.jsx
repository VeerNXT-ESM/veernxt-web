import { useEffect, useState } from 'react';
import {
  X,
  PieChart,
  TrendingUp,
  Landmark,
  FileText,
  Globe,
  ShieldCheck,
  HeartPulse,
  GraduationCap,
  Shield,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';

const ICON_MAP = {
  PieChart,
  TrendingUp,
  Landmark,
  FileText,
  Globe,
  ShieldCheck,
  HeartPulse,
  GraduationCap
};

const FinancialServiceModal = ({ service, onClose }) => {
  const [openFaq, setOpenFaq] = useState(null);

  // Close on ESC key and lock background scroll
  useEffect(() => {
    if (!service) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [service, onClose]);

  if (!service) return null;

  const IconComponent = ICON_MAP[service.icon] || PieChart;
  const content = service.modalContent || {};

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-service-title"
    >
      {/* Modal Dialog Container */}
      <div
        className="relative w-full max-w-4xl my-8 bg-[#F7F5F0] text-[#1C1C1C] rounded-2xl shadow-2xl border-2 border-[#1A5C2A]/20 overflow-hidden transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 25px 50px -12px rgba(15, 58, 26, 0.4)'
        }}
      >
        {/* Top Military Accent Border */}
        <div
          className="h-2 w-full"
          style={{
            background:
              service.accentColor === 'gold'
                ? 'linear-gradient(90deg, #C9A84C 0%, #E5C875 50%, #C9A84C 100%)'
                : 'linear-gradient(90deg, #1A5C2A 0%, #2A8341 50%, #1A5C2A 100%)'
          }}
        />

        {/* Header Section */}
        <div className="relative px-6 py-5 sm:px-8 sm:py-6 bg-white border-b border-[#E8E3D9] flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center shadow-md ${
                service.accentColor === 'gold'
                  ? 'bg-[#FBF5E6] text-[#7A5C10] border border-[#DFC98A]'
                  : 'bg-[#EBF3EC] text-[#1A5C2A] border border-[#B5D4B9]'
              }`}
            >
              <IconComponent className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    service.accentColor === 'gold'
                      ? 'bg-[#FBF5E6] text-[#7A5C10] border border-[#DFC98A]'
                      : 'bg-[#EBF3EC] text-[#1A5C2A] border border-[#B5D4B9]'
                  }`}
                >
                  {service.badgeText || 'VeerNXT Advisory'}
                </span>
                <span className="text-xs font-semibold text-[#5A5A5A]">
                  VeerNXT Financial Suite
                </span>
              </div>
              <h2
                id="modal-service-title"
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1C1C]"
              >
                {content.headline || service.title}
              </h2>
              {content.subheadline && (
                <p className="text-sm sm:text-base text-[#5A5A5A] mt-1">
                  {content.subheadline}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-[#F7F5F0] hover:bg-[#E8E3D9] text-[#1C1C1C] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto space-y-8">
          {/* Top Row: Overview + Defense Relevance Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-4 text-[#2C2C2C] leading-relaxed">
              {content.overview?.map((paragraph, index) => (
                <p key={index} className="text-sm sm:text-base text-justify">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Why This Matters for Defense Box */}
            {content.defenseRelevance && (
              <div className="lg:col-span-5 bg-gradient-to-br from-[#0F3A1A] to-[#1A5C2A] text-white p-6 rounded-xl shadow-lg border border-[#C9A84C]/40 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-[#C9A84C]" />
                  <h3 className="text-sm font-bold tracking-wider uppercase text-[#C9A84C]">
                    {content.defenseRelevance.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-[#EBF3EC]/95">
                  {content.defenseRelevance.content}
                </p>
              </div>
            )}
          </div>

          {/* Categories Grid (What We Offer Under This Asset) */}
          {content.categories && content.categories.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#1C1C1C] flex items-center gap-2 border-b border-[#E8E3D9] pb-2">
                <span>Fund & Service Categories</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-white text-[#5A5A5A] rounded-full border border-[#E8E3D9]">
                  {content.categories.length} Options
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {content.categories.map((cat, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white rounded-xl border border-[#E8E3D9] hover:border-[#1A5C2A] transition-colors shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-sm sm:text-base text-[#1A5C2A]">
                        {cat.title}
                      </h4>
                      {cat.subtitle && (
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#FBF5E6] text-[#7A5C10] border border-[#DFC98A]">
                          {cat.subtitle}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-[#5A5A5A] leading-relaxed">
                      {cat.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two Columns: Benefits + FAQs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
            {/* Key Benefits */}
            {content.benefits && content.benefits.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-[#1C1C1C] border-b border-[#E8E3D9] pb-2">
                  Why Choose VeerNXT Advisory
                </h3>
                <div className="space-y-3">
                  {content.benefits.map((benefit, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-[#E8E3D9]"
                    >
                      <CheckCircle2 className="w-5 h-5 text-[#1A5C2A] flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm text-[#1C1C1C]">
                          {benefit.title}
                        </h4>
                        <p className="text-xs text-[#5A5A5A] mt-0.5">
                          {benefit.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQs Accordion */}
            {content.faqs && content.faqs.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-[#1C1C1C] flex items-center gap-2 border-b border-[#E8E3D9] pb-2">
                  <HelpCircle className="w-5 h-5 text-[#1A5C2A]" />
                  <span>Frequently Asked Questions</span>
                </h3>
                <div className="space-y-2.5">
                  {content.faqs.map((faq, idx) => {
                    const isOpen = openFaq === idx;
                    return (
                      <div
                        key={idx}
                        className="bg-white rounded-xl border border-[#E8E3D9] overflow-hidden"
                      >
                        <button
                          onClick={() => toggleFaq(idx)}
                          className="w-full px-4 py-3 text-left font-semibold text-xs sm:text-sm text-[#1C1C1C] flex items-center justify-between gap-2 hover:bg-[#F7F5F0] transition-colors cursor-pointer"
                        >
                          <span>{faq.question}</span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-[#1A5C2A] flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[#5A5A5A] flex-shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-3 text-xs sm:text-sm text-[#5A5A5A] leading-relaxed border-t border-[#E8E3D9] pt-2">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-4 sm:px-8 bg-white border-t border-[#E8E3D9] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-xs font-bold text-[#1C1C1C]">
              Need Personalized Guidance on {service.title}?
            </p>
            <p className="text-xs text-[#5A5A5A]">
              Connect with an NISM-certified veteran financial advisor.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#5A5A5A] text-[#1C1C1C] text-xs font-bold hover:bg-[#F7F5F0] transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                setTimeout(() => {
                  const elem = document.getElementById('contact-section');
                  if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#1A5C2A] hover:bg-[#0F3A1A] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <span>{content.ctaText || 'Schedule Consultation'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialServiceModal;
