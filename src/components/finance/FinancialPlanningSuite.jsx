import { useState } from 'react';
import { 
  TrendingUp, 
  Landmark, 
  Clock, 
  PieChart, 
  ArrowRight, 
  Sparkles, 
  Shield, 
  Calculator 
} from 'lucide-react';
import { FINANCIAL_PLANNING_TOOLS } from './financialCalculatorsData';
import FinancialCalculatorModal from './FinancialCalculatorModal';
import '../../pages/FinancialGuidance.css';

const iconMap = {
  TrendingUp,
  Landmark,
  Clock,
  PieChart
};

/**
 * FinancialPlanningSuite
 * Standalone VeerNXT fold component for Smart Tools & Financial Planning (SIP, Step-Up SIP, Lump-Sum, Cost of Delay, etc.).
 * Ripped from Mutual Buddy's financialPlanning.html and customized for Indian Armed Forces / Agniveers.
 * Ready for drop-in implantation into FinancialGuidance.jsx.
 */
const FinancialPlanningSuite = () => {
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
      className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-[#FFFFFF] text-[#1C1C1C] relative overflow-hidden border-t border-b border-[#C5A059]/30"
      aria-label="VeerNXT Financial Planning Smart Tools Suite"
    >
      {/* Subtle background ambient lighting */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-[#C5A059]/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-[#10B981]/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[#0F3A1A] text-xs sm:text-sm font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-4 h-4 text-[#10B981]" />
            <span>VeerNXT Smart Financial Tools</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#0F3A1A] mb-4 leading-tight">
            Financial Planning <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0F3A1A] via-[#1A5C2A] to-[#C5A059]">Made Simple &amp; Powerful.</span>
          </h2>
          <p className="text-[#4A5D4E] text-base sm:text-lg leading-relaxed font-medium">
            Deploy your Seva Nidhi, salary increments, or retirement gratuity with precision. 
            See how compounding, annual step-ups, and early start dates multiply your wealth.
          </p>
        </div>

        {/* 6-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {FINANCIAL_PLANNING_TOOLS.map((tool, index) => {
            const IconComponent = iconMap[tool.iconName] || TrendingUp;
            const isFeatured = index === 0; // Highlight first tool as primary entry

            return (
              <div
                key={tool.id}
                onClick={(e) => handleOpenTool(tool, e)}
                className={`group relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5 ${
                  isFeatured 
                    ? 'bg-gradient-to-b from-[#0F3A1A] to-[#162B1C] text-white border-2 border-[#C5A059] shadow-xl' 
                    : 'bg-white hover:bg-[#F9F8F5] text-[#1C1C1C] border border-[#0F3A1A]/20 hover:border-[#C5A059] shadow-md hover:shadow-lg'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleOpenTool(tool, e);
                  }
                }}
              >
                {/* Featured Tag */}
                {isFeatured && (
                  <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-extrabold text-[10px] uppercase tracking-wider shadow-md">
                    High Impact
                  </div>
                )}

                <div>
                  {/* Icon and Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#10B981]/15 group-hover:bg-[#10B981]/25 border border-[#10B981]/30 flex items-center justify-center transition-colors">
                      <IconComponent className="w-6 h-6 text-[#10B981]" />
                    </div>
                    <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${isFeatured ? 'text-gray-300 bg-white/10' : 'text-[#4A5D4E] bg-[#0F3A1A]/5'}`}>
                      {tool.badge}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className={`text-xl font-bold mb-2.5 transition-colors leading-snug ${isFeatured ? 'text-white group-hover:text-[#C5A059]' : 'text-[#0F3A1A] group-hover:text-[#1A5C2A]'}`}>
                    {tool.title}
                  </h3>
                  <p className={`text-sm leading-relaxed mb-6 ${isFeatured ? 'text-gray-200' : 'text-[#4A5D4E]'}`}>
                    {tool.subtitle}
                  </p>
                </div>

                {/* Calculate Now Footer Action */}
                <div className={`pt-4 border-t flex items-center justify-between text-sm font-bold transition-colors mt-auto ${isFeatured ? 'border-white/20 text-[#C5A059] group-hover:text-white' : 'border-[#0F3A1A]/10 text-[#0F3A1A] group-hover:text-[#C5A059]'}`}>
                  <span>Calculate Now</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isFeatured ? 'bg-white/10 group-hover:bg-[#10B981]' : 'bg-[#0F3A1A]/5 group-hover:bg-[#0F3A1A] group-hover:text-white'}`}>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Educational Tip Banner */}
        <div className="mt-12 sm:mt-16 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0F3A1A] to-[#162B1C] border-2 border-[#C5A059]/60 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center shrink-0">
               <Shield className="w-6 h-6 text-[#10B981]" />
             </div>
             <div>
               <h4 className="text-base sm:text-lg font-bold text-white">
                 Why Systematic Investment Beats Ad-Hoc Saving
               </h4>
               <p className="text-xs sm:text-sm text-gray-200 mt-0.5">
                 Rupee cost averaging removes market timing anxiety so you can focus on service or transition duties.
               </p>
             </div>
           </div>
           <button
             onClick={() => handleOpenTool(FINANCIAL_PLANNING_TOOLS[1])}
             className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#0b1e16] font-bold text-xs sm:text-sm uppercase tracking-wider hover:opacity-90 transition-opacity shrink-0 shadow-md"
           >
             Try Step-Up SIP
           </button>
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

export default FinancialPlanningSuite;
