import { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  Landmark, 
  GraduationCap, 
  ShieldCheck, 
  TrendingUp, 
  Clock, 
  PieChart, 
  X, 
  Shield, 
  HelpCircle,
  ArrowUpRight,
  Mail
} from 'lucide-react';

const iconMap = {
  HeartPulse,
  Landmark,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  Clock,
  PieChart
};

// Formatter for chart Y-axis tick marks in Lakhs (L) or Crores (Cr)
const formatTickINR = (num) => {
  if (!num || num === 0) return '₹0';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${Math.round(num / 100000)}L`;
  if (num >= 1000) return `₹${Math.round(num / 1000)}k`;
  return `₹${Math.round(num)}`;
};

// Plotted SVG Area/Line Graph Component matching Mutual Buddy screenshot
const VisualChart = ({ type, data }) => {
  if (!data) return null;

  let startVal = 100000;
  let endVal = 1200000;
  let leftLabel = 'Current Annual Income';
  let rightLabel = 'Insurance Required';

  if (type === 'growth-line') {
    startVal = Number(data.startValue) || 100000;
    endVal = Number(data.targetValue) || 1200000;
    leftLabel = 'Current Annual Income';
    rightLabel = 'Insurance Required';
  } else if (type === 'split-bar') {
    startVal = Number(data.invested) || 100000;
    endVal = (Number(data.invested) || 0) + (Number(data.gain) || 0);
    leftLabel = 'Total Invested';
    rightLabel = 'Expected Wealth Target';
  } else if (type === 'inflation-bar' || type === 'comparison-bar') {
    startVal = Number(data.current || data.today) || 100000;
    endVal = Number(data.future || data.delayed) || 200000;
    leftLabel = "Today's Cost / Base";
    rightLabel = 'Projected Future Value';
  }

  const maxVal = Math.max(endVal, startVal, 10000);

  // Generate 7 Y-axis tick values from maxVal down to 0
  const ticks = [
    maxVal,
    maxVal * (5 / 6),
    maxVal * (4 / 6),
    maxVal * (3 / 6),
    maxVal * (2 / 6),
    maxVal * (1 / 6),
    0
  ];

  // SVG dimensions & margins
  // left margin = 55, right margin = 465 (width = 410)
  // top margin = 20, bottom margin = 175 (height = 155)
  const chartHeight = 155;
  const topMargin = 20;
  const bottomMargin = topMargin + chartHeight; // 175
  const leftMargin = 55;
  const rightMargin = 465;
  const chartWidth = rightMargin - leftMargin; // 410

  // Calculate Y coordinate for a value
  const getY = (val) => {
    const ratio = Math.max(0, Math.min(1, val / maxVal));
    return bottomMargin - ratio * chartHeight;
  };

  // Generate 15 points for smooth compounding curve
  const numPoints = 15;
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    // Smooth curve from startVal to endVal
    const val = startVal + (endVal - startVal) * Math.pow(t, 1.25);
    const x = leftMargin + t * chartWidth;
    const y = getY(val);
    points.push({ x, y, val });
  }

  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L ${rightMargin},${bottomMargin} L ${leftMargin},${bottomMargin} Z`;
  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  return (
    <div className="w-full bg-white dark:bg-[#0d2319] rounded-3xl p-5 sm:p-6 shadow-xl mb-6 border border-gray-100 dark:border-[#C5A059]/20">
      <div className="w-full overflow-hidden">
        <svg
          viewBox="0 0 490 215"
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label="Plotted financial calculation chart"
        >
          <defs>
            <linearGradient id="greenGoldAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#C5A059" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Y-axis grid lines and tick labels */}
          {ticks.map((tickVal, idx) => {
            const yPos = topMargin + (idx / (ticks.length - 1)) * chartHeight;
            return (
              <g key={idx}>
                <line
                  x1={leftMargin}
                  y1={yPos}
                  x2={rightMargin}
                  y2={yPos}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  className="dark:stroke-gray-700/60"
                />
                <text
                  x={leftMargin - 10}
                  y={yPos + 3.5}
                  textAnchor="end"
                  className="text-[10px] sm:text-[11px] font-bold fill-gray-500 dark:fill-gray-400"
                >
                  {formatTickINR(tickVal)}
                </text>
              </g>
            );
          })}

          {/* Shaded Area Fill Under Curve */}
          <path d={areaPath} fill="url(#greenGoldAreaGradient)" />

          {/* Plotted Main Curve - Military Accent Emerald Green */}
          <path
            d={linePath}
            stroke="#10B981"
            strokeWidth="3.2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Start Point Marker */}
          <circle
            cx={startPoint.x}
            cy={startPoint.y}
            r="4.5"
            className="fill-[#059669] dark:fill-[#10B981]"
          />

          {/* End Point Marker (Target Dot - Seva Gold) */}
          <circle
            cx={endPoint.x}
            cy={endPoint.y}
            r="7"
            className="fill-[#C5A059] shadow-lg"
          />
          <circle
            cx={endPoint.x}
            cy={endPoint.y}
            r="3"
            className="fill-white"
          />

          {/* Bottom X-Axis Labels */}
          <text
            x={leftMargin}
            y={bottomMargin + 24}
            textAnchor="start"
            className="text-[11px] font-extrabold fill-gray-700 dark:fill-gray-300"
          >
            {leftLabel}
          </text>
          <text
            x={rightMargin}
            y={bottomMargin + 24}
            textAnchor="end"
            className="text-[11px] font-extrabold fill-gray-700 dark:fill-gray-300"
          >
            {rightLabel}
          </text>
        </svg>
      </div>
    </div>
  );
};

const FinancialCalculatorModalContent = ({ tool, onClose }) => {
  // Initialize state with default values from tool schema (reset automatically when tool.id changes via key prop)
  const [inputValues, setInputValues] = useState(() => {
    const initial = {};
    tool.inputs.forEach((inp) => {
      initial[inp.id] = inp.defaultValue;
    });
    return initial;
  });

  // Handle ESC key press & body scroll locking
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handleInputChange = (id, value) => {
    setInputValues((prev) => ({
      ...prev,
      [id]: value
    }));
  };

  const IconComponent = iconMap[tool.iconName] || TrendingUp;
  const result = tool.calculate(inputValues);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div 
        className="relative w-full max-w-4xl bg-[#ffffff] dark:bg-[#081510] rounded-3xl shadow-2xl border border-gray-200 dark:border-[#C5A059]/30 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-[#C5A059]/20 bg-gradient-to-r from-gray-50 dark:from-[#0b1e15] to-white dark:to-[#081510]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#C5A059]/15 border border-[#C5A059]/30 flex items-center justify-center shrink-0">
              <IconComponent className="w-6 h-6 text-[#C5A059]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#C5A059] bg-[#C5A059]/10 px-2.5 py-0.5 rounded-full">
                  {tool.badge || 'VeerNXT Calculator'}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {tool.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-2xl">
                {tool.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 sm:p-6 md:p-8 overflow-y-auto flex-grow">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Interactive Input Controls */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Adjust Your Parameters
                </span>
                <span className="text-xs text-[#C5A059] font-medium flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> Instant Recalculation
                </span>
              </div>

              {tool.inputs.map((inp) => (
                <div key={inp.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-bold tracking-wide uppercase text-gray-700 dark:text-gray-200">
                      {inp.label}
                    </label>
                    <div className="flex items-center bg-gray-100 dark:bg-[#0c2017] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#C5A059]/30">
                      {inp.unit === '₹' && (
                        <span className="text-xs font-bold text-gray-500 mr-1">₹</span>
                      )}
                      <input
                        type="number"
                        min={inp.min}
                        max={inp.max}
                        step={inp.step}
                        value={inputValues[inp.id]}
                        onChange={(e) => handleInputChange(inp.id, Number(e.target.value))}
                        className="w-24 sm:w-28 text-right font-bold text-sm sm:text-base text-gray-900 dark:text-white bg-transparent focus:outline-none"
                      />
                      {inp.unit !== '₹' && (
                        <span className="text-xs font-bold text-gray-500 ml-1">{inp.unit}</span>
                      )}
                    </div>
                  </div>

                  {/* Range Slider */}
                  <div className="pt-1">
                    <input
                      type="range"
                      min={inp.min}
                      max={inp.max}
                      step={inp.step}
                      value={inputValues[inp.id]}
                      onChange={(e) => handleInputChange(inp.id, Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-[#C5A059]"
                    />
                    <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                      <span>{inp.unit === '₹' ? `₹${inp.min.toLocaleString('en-IN')}` : `${inp.min}${inp.unit}`}</span>
                      <span>{inp.unit === '₹' ? `₹${inp.max.toLocaleString('en-IN')}` : `${inp.max}${inp.unit}`}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Plotted Graph & Protection Results matching VeerNXT Green/Gold/White Brand Palette */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl bg-[#0b1e16] dark:bg-[#081812] border border-[#C5A059]/30 p-5 sm:p-7 text-white shadow-2xl relative overflow-hidden">
                {/* Subtle military badge watermark */}
                <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-[#C5A059]/5 pointer-events-none"></div>

                {/* Top Header: Protection Results & EMAIL PDF Button */}
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                    {tool.id === 'human-life-value' ? 'Protection Results' : 'Calculation Results'}
                  </h3>
                  <button 
                    type="button"
                    onClick={() => alert('PDF Calculation Summary sent to your registered email address.')}
                    className="px-3.5 py-1.5 bg-white text-[#0b1e16] hover:bg-gray-100 font-extrabold text-[11px] uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-md transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-gray-700" />
                    <span>EMAIL PDF</span>
                  </button>
                </div>

                {/* White Card 1: Plotted SVG Area/Line Chart */}
                <VisualChart type={result.chartType} data={result.chartData} />

                {/* White Card 2: Main Value Display Card matching VeerNXT Green/Gold palette */}
                <div className="bg-white dark:bg-[#0d2319] rounded-3xl p-5 sm:p-6 shadow-xl mb-6 border border-gray-100 dark:border-[#C5A059]/20 flex flex-col justify-between gap-3 overflow-hidden">
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-[#C5A059]">
                      {result.mainLabel}
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">
                      {result.subtext}
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0b1e16] dark:text-white tracking-tight break-words">
                    {result.mainValue}
                  </div>
                </div>

                {/* Stats Breakdown Table */}
                <div className="space-y-3 pt-4 border-t border-white/10 text-xs sm:text-sm">
                  {result.stats.map((stat, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-gray-300">{stat.label}:</span>
                      <span className="font-bold text-white">{stat.value}</span>
                    </div>
                  ))}
                </div>

                {/* Military Relevance Banner */}
                {tool.militaryRelevance && (
                  <div className="mt-6 p-4 rounded-2xl bg-black/40 border border-[#C5A059]/30 text-xs text-gray-300 space-y-1">
                    <div className="flex items-center gap-1.5 text-[#C5A059] font-bold">
                      <Shield className="w-3.5 h-3.5 shrink-0" />
                      <span>Why This Matters for Veterans & Agniveers</span>
                    </div>
                    <p className="leading-relaxed text-[11px] sm:text-xs">
                      {tool.militaryRelevance}
                    </p>
                  </div>
                )}

                {/* Call to Action Inside Modal */}
                <div className="mt-6">
                  <button
                    onClick={onClose}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-gray-900 font-bold text-xs sm:text-sm uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span>Save This Calculation Plan</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 md:px-8 py-4 bg-gray-50 dark:bg-[#06120d] border-t border-gray-100 dark:border-[#C5A059]/20 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>VeerNXT Interactive Financial Engine</span>
          <button
            onClick={onClose}
            className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium"
          >
            Close Calculator (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};

const FinancialCalculatorModal = ({ tool, isOpen, onClose }) => {
  if (!isOpen || !tool) return null;
  return (
    <FinancialCalculatorModalContent
      key={tool.id}
      tool={tool}
      onClose={onClose}
    />
  );
};

export default FinancialCalculatorModal;
