import { useState } from 'react';
import FinancialServicesSuite from '../components/finance/FinancialServicesSuite';
import GoalPlanningSuite from '../components/finance/GoalPlanningSuite';
import FinancialPlanningSuite from '../components/finance/FinancialPlanningSuite';
import { Sparkles, Layers, Landmark, TrendingUp, ShieldCheck } from 'lucide-react';

/**
 * PreviewFinanceSuites
 * Dedicated preview container for VeerNXT standalone Financial & Goal Planning fold components.
 * Enables live client preview without modifying the main FinancialGuidance.jsx page.
 */
const PreviewFinanceSuites = () => {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Top Preview Control Bar */}
      <div className="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-gray-800 px-4 sm:px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A059]/15 border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white">
                  VeerNXT Financial Components Live Preview
                </h1>
                <span className="text-[10px] uppercase font-extrabold bg-[#10B981]/20 text-[#10B981] px-2 py-0.5 rounded-full">
                  Ready to Implant
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Test the standalone folds and interactive calculators before dropping them into FinancialGuidance.jsx
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-gray-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-gray-900 font-extrabold shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All 3 Stacked</span>
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'services'
                  ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-gray-900 font-extrabold shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>1. Complete Suite</span>
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'goals'
                  ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-gray-900 font-extrabold shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>2. Goal Creator</span>
            </button>
            <button
              onClick={() => setActiveTab('planning')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'planning'
                  ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-gray-900 font-extrabold shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>3. Smart Tools</span>
            </button>
          </div>
        </div>
      </div>

      {/* Render Selected Component Folds */}
      <div className="space-y-4">
        {(activeTab === 'all' || activeTab === 'services') && (
          <div>
            {activeTab === 'all' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-2">
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#C5A059] bg-[#C5A059]/10 px-3 py-1 rounded-full">
                  Fold Component 1 of 3
                </span>
              </div>
            )}
            <FinancialServicesSuite />
          </div>
        )}

        {(activeTab === 'all' || activeTab === 'goals') && (
          <div>
            {activeTab === 'all' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-2">
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#C5A059] bg-[#C5A059]/10 px-3 py-1 rounded-full">
                  Fold Component 2 of 3 (Goal Planning Tools)
                </span>
              </div>
            )}
            <GoalPlanningSuite />
          </div>
        )}

        {(activeTab === 'all' || activeTab === 'planning') && (
          <div>
            {activeTab === 'all' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-2">
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#C5A059] bg-[#C5A059]/10 px-3 py-1 rounded-full">
                  Fold Component 3 of 3 (Smart Financial Tools)
                </span>
              </div>
            )}
            <FinancialPlanningSuite />
          </div>
        )}
      </div>

      {/* Developer Implantation Notice */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center text-xs text-gray-500">
        <p>
          These components are located in <code className="text-[#C5A059]">src/components/finance/</code> (<code>FinancialServicesSuite.jsx</code>, <code>GoalPlanningSuite.jsx</code>, <code>FinancialPlanningSuite.jsx</code>).
        </p>
      </div>
    </div>
  );
};

export default PreviewFinanceSuites;
