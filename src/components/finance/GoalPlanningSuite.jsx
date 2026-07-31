import { useState } from 'react';
import { 
  HeartPulse, 
  Landmark, 
  GraduationCap, 
  ShieldCheck, 
  TrendingUp, 
  Clock, 
  PieChart, 
  ArrowRight, 
  Sparkles, 
  Shield, 
  Calculator 
} from 'lucide-react';
import { GOAL_PLANNING_TOOLS } from './financialCalculatorsData';
import FinancialCalculatorModal from './FinancialCalculatorModal';
import '../../pages/FinancialGuidance.css';

const iconMap = {
  HeartPulse,
  Landmark,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  Clock,
  PieChart
};

/**
 * GoalPlanningSuite
 * Standalone VeerNXT fold component for Life Milestones & Goal Planning Tools.
 * Ripped from Mutual Buddy's goalPlanning.html & homepage Goal Creator, and customized for Indian Armed Forces / Agniveers.
 * Ready for drop-in implantation into FinancialGuidance.jsx.
 */
const GoalPlanningSuite = () => {
  const [selectedTool, setSelectedTool] = useState(null);

  const handleOpenTool = (tool, e) => {
    if (e) e.preventDefault();
    setSelectedTool(tool);
  };

  const handleCloseModal = () => {
    setSelectedTool(null);
  };

  return (
    <section 
      className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0A2612] via-[#0E331B] to-[#0A2612] text-white relative overflow-hidden border-t border-b border-[#C9A84C]/20"
      aria-label="VeerNXT Goal Planning Suite"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#C5A059]/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#10B981]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/30 text-[#C5A059] text-xs sm:text-sm font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-4 h-4" />
            <span>VeerNXT Military-to-Civilian Goal Creator</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Let&apos;s Start Creating Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C5A059] via-[#E6CA65] to-[#D4AF37]">Life Goals.</span>
          </h2>
          <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
            At VeerNXT, we help defense personnel, veterans, and Agniveers turn dreams into reality. 
            Calculate your exact milestones, protect your family with Human Life Value, and map out your SIP wealth journey.
          </p>
        </div>

        {/* 4x2 Responsive Goal Planning Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {GOAL_PLANNING_TOOLS.map((tool) => {
            const IconComponent = iconMap[tool.iconName] || Calculator;
            const isFeatured = tool.id === 'human-life-value' || tool.id === 'crorepati-planner';

            return (
              <div
                key={tool.id}
                onClick={(e) => handleOpenTool(tool, e)}
                className={`group relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5 ${
                  isFeatured 
                    ? 'bg-gradient-to-b from-[#144726] to-[#0F3A1A] border-2 border-[#C5A059]/80 hover:border-[#C5A059] shadow-lg shadow-[#C5A059]/10' 
                    : 'bg-[#0E3A1A]/85 hover:bg-[#144726] border border-[#C5A059]/30 hover:border-[#C5A059]/60'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleOpenTool(tool, e);
                  }
                }}
              >
                {/* Featured Badge */}
                {isFeatured && (
                  <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-gray-900 font-extrabold text-[10px] uppercase tracking-wider shadow-md">
                    Recommended
                  </div>
                )}

                <div>
                  {/* Top Icon & Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-[#C5A059]/15 group-hover:bg-[#C5A059]/25 border border-[#C5A059]/30 flex items-center justify-center transition-colors">
                      <IconComponent className="w-6 h-6 text-[#C5A059]" />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400 bg-white/5 px-2.5 py-1 rounded-full">
                      {tool.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2.5 group-hover:text-[#C5A059] transition-colors leading-snug">
                    {tool.title}
                  </h3>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-6 line-clamp-3">
                    {tool.subtitle}
                  </p>
                </div>

                {/* Calculate Now Footer Action */}
                <div className="pt-4 border-t border-gray-800/80 flex items-center justify-between text-xs sm:text-sm font-bold text-[#C5A059] group-hover:text-white transition-colors mt-auto">
                  <span>Calculate Now</span>
                  <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-[#C5A059] group-hover:text-gray-900 flex items-center justify-center transition-all duration-300">
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Military Advisory Banner */}
        <div className="mt-12 sm:mt-16 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#144726] to-[#0F3A1A] border border-[#C5A059]/40 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#C5A059]/10 border border-[#C5A059]/30 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-[#C5A059]" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-bold text-white">
                Need a Personalized Transition Financial Plan?
              </h4>
              <p className="text-xs sm:text-sm text-gray-300 mt-0.5">
                Our Army-veteran SEBI-registered mentors can help you structure your Seva Nidhi and pension into automated SIP portfolios.
              </p>
            </div>
          </div>
          <a
            href="#contact-section"
            onClick={(e) => {
              e.preventDefault();
              const elem = document.getElementById('contact-section');
              if (elem) elem.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-gray-900 font-bold text-xs sm:text-sm uppercase tracking-wider hover:opacity-90 transition-opacity shrink-0 shadow-md"
          >
            Connect With Veteran Advisory
          </a>
        </div>
      </div>

      {/* Interactive Modal Popup */}
      <FinancialCalculatorModal
        tool={selectedTool}
        isOpen={Boolean(selectedTool)}
        onClose={handleCloseModal}
      />
    </section>
  );
};

export default GoalPlanningSuite;
