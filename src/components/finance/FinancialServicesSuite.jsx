import { useState } from 'react';
import {
  PieChart,
  TrendingUp,
  Landmark,
  FileText,
  Globe,
  ShieldCheck,
  HeartPulse,
  GraduationCap,
  ArrowRight
} from 'lucide-react';
import { FINANCIAL_SERVICES_SUITE } from './financialServicesData';
import FinancialServiceModal from './FinancialServiceModal';
import '../../pages/FinancialGuidance.css';

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

/**
 * FinancialServicesSuite
 * Standalone VeerNXT fold component recreating the "Complete Suite of Services" 4x2 grid.
 * Clicking any card triggers an interactive in-page modal popup without navigating to a new page.
 */
const FinancialServicesSuite = () => {
  const [selectedService, setSelectedService] = useState(null);

  return (
    <section
      className="py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-[#F7F5F0] text-[#1C1C1C]"
      aria-label="VeerNXT Financial Services Suite"
    >
      {/* Ambient Military Background Accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#1A5C2A]/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-[#C9A84C]/10 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-block bg-[#1C1C1C] text-white text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4 shadow-sm">
            WHAT WE OFFER
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#1C1C1C]">
            Our Complete Suite of{' '}
            <span className="text-[#C9A84C] underline decoration-[#1A5C2A]/30 decoration-4 underline-offset-8">
              Services
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#5A5A5A] leading-relaxed">
            From mutual funds to insurance, NRI services to education planning —
            we cover every aspect of your financial life with veteran-first advisory.
          </p>
        </div>

        {/* 4x2 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {FINANCIAL_SERVICES_SUITE.map((service) => {
            const IconComponent = ICON_MAP[service.icon] || PieChart;
            const isGoldAccent = service.accentColor === 'gold';

            return (
              <div
                key={service.id}
                onClick={() => setSelectedService(service)}
                className="group relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 flex flex-col justify-between cursor-pointer border border-[#E8E3D9] shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-[#1A5C2A]"
                style={{
                  borderLeft: isGoldAccent
                    ? '4px solid #C9A84C'
                    : '4px solid #1A5C2A',
                  borderTop: isGoldAccent
                    ? '2px solid #C9A84C'
                    : '2px solid #1A5C2A'
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedService(service);
                  }
                }}
                aria-label={`Learn more about ${service.title}`}
              >
                {/* Top Row: Icon Box + Category Badge */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm ${
                        isGoldAccent
                          ? 'bg-[#FBF5E6] text-[#7A5C10] border border-[#DFC98A]'
                          : 'bg-[#EBF3EC] text-[#1A5C2A] border border-[#B5D4B9]'
                      }`}
                    >
                      <IconComponent className="w-6 h-6" />
                    </div>
                    {service.badgeText && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#F7F5F0] text-[#5A5A5A] border border-[#E8E3D9]">
                        {service.badgeText}
                      </span>
                    )}
                  </div>

                  {/* Title & Short Description */}
                  <h3 className="text-lg font-bold text-[#1C1C1C] mb-2 group-hover:text-[#1A5C2A] transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5A5A5A] leading-relaxed mb-6">
                    {service.shortDescription}
                  </p>
                </div>

                {/* Explore Link with Animated Arrow */}
                <div
                  className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 mt-auto ${
                    isGoldAccent
                      ? 'text-[#7A5C10] group-hover:text-[#C9A84C]'
                      : 'text-[#1A5C2A] group-hover:text-[#0F3A1A]'
                  }`}
                >
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5 transform transition-transform duration-300 group-hover:translate-x-1" />
                </div>

                {/* Subtle military cut-corner notch at bottom-right */}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: isGoldAccent
                      ? 'linear-gradient(135deg, transparent 50%, #C9A84C 50%)'
                      : 'linear-gradient(135deg, transparent 50%, #1A5C2A 50%)'
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Info Popup Overlay Modal */}
      <FinancialServiceModal
        service={selectedService}
        onClose={() => setSelectedService(null)}
      />
    </section>
  );
};

export default FinancialServicesSuite;
