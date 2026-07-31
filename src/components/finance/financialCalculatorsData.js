// Comprehensive financial and goal calculators data engine for VeerNXT
// Ripped from Mutual Buddy and enriched with Indian Armed Forces / Agniveer financial advisory context

// Helper: format number in Indian Rupee format (e.g. ₹ 12,00,000 or ₹ 1.52 Cr)
export const formatINR = (val) => {
  if (isNaN(val) || val === null || val === undefined) return '₹ 0';
  const num = Math.round(Number(val));
  if (num >= 10000000) {
    return `₹ ${(num / 10000000).toFixed(2)} Cr`;
  } else if (num >= 100000) {
    return `₹ ${(num / 100000).toFixed(2)} Lakh`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

// Helper: exact INR string for titles (like Image 2: ₹ 12,00,000)
export const formatExactINR = (val) => {
  if (isNaN(val) || val === null || val === undefined) return '₹ 0';
  const num = Math.round(Number(val));
  return '₹ ' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num);
};

export const GOAL_PLANNING_TOOLS = [
  {
    id: 'human-life-value',
    title: 'Human Life Value.',
    subtitle: "Calculate the exact Sum Assured (Life Insurance) you need today to financially secure your family's future lifestyle based on your income trajectory.",
    iconName: 'HeartPulse',
    badge: 'Life Milestones',
    militaryRelevance: "Active duty AGIF / ECHS insurance covers you during service, but transition requires replacing your lifetime income stream with a dedicated term cover that protects Seva Nidhi and pension corpora.",
    inputs: [
      { id: 'currentIncome', label: 'CURRENT ANNUAL INCOME', defaultValue: 100000, min: 50000, max: 5000000, step: 10000, unit: '₹', isCurrency: true },
      { id: 'workingYearsLeft', label: 'TOTAL PERIOD OF INCOME (WORKING YRS LEFT)', defaultValue: 12, min: 1, max: 40, step: 1, unit: 'Yrs' },
      { id: 'incomeIncrementRate', label: 'INCOME INCREMENT RATE', defaultValue: 5, min: 0, max: 15, step: 0.5, unit: '%' },
      { id: 'investmentGrowthRate', label: 'INVESTMENT GROWTH RATE', defaultValue: 5, min: 1, max: 15, step: 0.5, unit: '%' }
    ],
    calculate: (vals) => {
      const C = Number(vals.currentIncome) || 100000;
      const n = Number(vals.workingYearsLeft) || 12;
      const g = (Number(vals.incomeIncrementRate) || 5) / 100;
      const r = (Number(vals.investmentGrowthRate) || 5) / 100;

      let hlv;
      if (Math.abs(g - r) < 0.0001) {
        hlv = C * n;
      } else {
        const k = (1 + g) / (1 + r);
        hlv = C * k * (1 - Math.pow(k, n)) / (1 - k);
      }
      return {
        mainValue: formatExactINR(hlv),
        mainLabel: 'TOTAL INSURANCE CORPUS REQUIRED',
        subtext: 'To replace your lifetime income stream',
        stats: [
          { label: 'Current Annual Income', value: formatINR(C) },
          { label: 'Working Tenure Left', value: `${n} Years` },
          { label: 'Income Growth Rate', value: `${(g * 100).toFixed(1)}%` },
          { label: 'Discount / Return Rate', value: `${(r * 100).toFixed(1)}%` }
        ],
        chartType: 'growth-line',
        chartData: { startValue: C, endValue: C * Math.pow(1 + g, n), targetValue: hlv, years: n }
      };
    }
  },
  {
    id: 'crorepati-planner',
    title: 'Crorepati Planner',
    subtitle: 'Map out the exact monthly SIP needed to build a ₹1 Crore (or custom target) wealth milestone.',
    iconName: 'Landmark',
    badge: 'Wealth Target',
    militaryRelevance: "Combining your Seva Nidhi or retirement lump sum with a disciplined monthly SIP can accelerate your ₹1 Crore timeline by 5 to 7 years.",
    inputs: [
      { id: 'targetAmount', label: 'TARGET CORPUS (₹)', defaultValue: 10000000, min: 1000000, max: 50000000, step: 500000, unit: '₹', isCurrency: true },
      { id: 'years', label: 'TIME HORIZON (YRS)', defaultValue: 15, min: 1, max: 35, step: 1, unit: 'Yrs' },
      { id: 'expectedReturn', label: 'EXPECTED ANNUAL RETURN', defaultValue: 12, min: 6, max: 20, step: 0.5, unit: '%' }
    ],
    calculate: (vals) => {
      const target = Number(vals.targetAmount) || 10000000;
      const years = Number(vals.years) || 15;
      const annualReturn = Number(vals.expectedReturn) || 12;
      const r = annualReturn / 12 / 100;
      const n = years * 12;

      const monthlySIP = (target * r) / ((Math.pow(1 + r, n) - 1) * (1 + r));
      const totalInvested = monthlySIP * n;
      const estimatedGain = target - totalInvested;

      return {
        mainValue: formatINR(monthlySIP),
        mainLabel: 'REQUIRED MONTHLY SIP',
        subtext: `To reach ${formatINR(target)} in ${years} years`,
        stats: [
          { label: 'Total Invested', value: formatINR(totalInvested) },
          { label: 'Wealth Generated', value: formatINR(estimatedGain) },
          { label: 'Target Corpus', value: formatINR(target) },
          { label: 'Expected Return', value: `${annualReturn}% p.a.` }
        ],
        chartType: 'split-bar',
        chartData: { invested: totalInvested, gain: estimatedGain }
      };
    }
  },
  {
    id: 'education-planning',
    title: 'Education Planning',
    subtitle: "Calculate the inflation-adjusted cost of your child's higher education and the monthly SIP required.",
    iconName: 'GraduationCap',
    badge: 'Family Future',
    militaryRelevance: "Defense scholarships and DSP education grants provide an initial cushion; use equity SIPs to conquer private professional degree inflation (8-10% p.a.).",
    inputs: [
      { id: 'currentCost', label: "TODAY'S DEGREE COST (₹)", defaultValue: 1500000, min: 200000, max: 10000000, step: 100000, unit: '₹', isCurrency: true },
      { id: 'yearsLeft', label: 'YEARS TO COLLEGE', defaultValue: 10, min: 1, max: 22, step: 1, unit: 'Yrs' },
      { id: 'inflation', label: 'EDUCATION INFLATION RATE', defaultValue: 8, min: 4, max: 15, step: 0.5, unit: '%' },
      { id: 'expectedReturn', label: 'EXPECTED SIP RETURN', defaultValue: 12, min: 6, max: 20, step: 0.5, unit: '%' }
    ],
    calculate: (vals) => {
      const current = Number(vals.currentCost) || 1500000;
      const years = Number(vals.yearsLeft) || 10;
      const inf = Number(vals.inflation) || 8;
      const ret = Number(vals.expectedReturn) || 12;

      const futureCost = current * Math.pow(1 + inf / 100, years);
      const r = ret / 12 / 100;
      const n = years * 12;
      const monthlySIP = (futureCost * r) / ((Math.pow(1 + r, n) - 1) * (1 + r));

      return {
        mainValue: formatINR(futureCost),
        mainLabel: 'TARGET EDUCATION CORPUS',
        subtext: `Required Monthly SIP: ${formatINR(monthlySIP)}`,
        stats: [
          { label: "Today's Cost", value: formatINR(current) },
          { label: 'Inflation Adjusted Cost', value: formatINR(futureCost) },
          { label: 'Required Monthly SIP', value: formatINR(monthlySIP) },
          { label: 'Time Horizon', value: `${years} Years` }
        ],
        chartType: 'inflation-bar',
        chartData: { current: current, future: futureCost }
      };
    }
  },
  {
    id: 'marriage-planning',
    title: 'Marriage Planning',
    subtitle: 'Estimate future wedding costs after inflation and plan an automated SIP savings roadmap.',
    iconName: 'ShieldCheck',
    badge: 'Family Milestone',
    militaryRelevance: "Avoid high-interest personal loans or dipping into retirement pension corpora; plan wedding milestones early with dedicated mutual fund SIPs.",
    inputs: [
      { id: 'currentCost', label: "TODAY'S WEDDING COST (₹)", defaultValue: 2000000, min: 500000, max: 20000000, step: 100000, unit: '₹', isCurrency: true },
      { id: 'yearsLeft', label: 'YEARS REMAINING', defaultValue: 8, min: 1, max: 25, step: 1, unit: 'Yrs' },
      { id: 'inflation', label: 'INFLATION RATE', defaultValue: 7, min: 4, max: 12, step: 0.5, unit: '%' },
      { id: 'expectedReturn', label: 'EXPECTED SIP RETURN', defaultValue: 12, min: 6, max: 20, step: 0.5, unit: '%' }
    ],
    calculate: (vals) => {
      const current = Number(vals.currentCost) || 2000000;
      const years = Number(vals.yearsLeft) || 8;
      const inf = Number(vals.inflation) || 7;
      const ret = Number(vals.expectedReturn) || 12;

      const futureCost = current * Math.pow(1 + inf / 100, years);
      const r = ret / 12 / 100;
      const n = years * 12;
      const monthlySIP = (futureCost * r) / ((Math.pow(1 + r, n) - 1) * (1 + r));

      return {
        mainValue: formatINR(futureCost),
        mainLabel: 'TARGET WEDDING CORPUS',
        subtext: `Required Monthly SIP: ${formatINR(monthlySIP)}`,
        stats: [
          { label: "Today's Cost", value: formatINR(current) },
          { label: 'Inflation Adjusted Cost', value: formatINR(futureCost) },
          { label: 'Required Monthly SIP', value: formatINR(monthlySIP) },
          { label: 'Time Horizon', value: `${years} Years` }
        ],
        chartType: 'inflation-bar',
        chartData: { current: current, future: futureCost }
      };
    }
  },
  {
    id: 'retirement-planning',
    title: 'Retirement Planning',
    subtitle: 'Calculate the retirement corpus needed to sustain your monthly lifestyle after military or civilian service.',
    iconName: 'TrendingUp',
    badge: 'Retirement Goal',
    militaryRelevance: "Your military pension covers base expenses; build an equity retirement corpus to beat healthcare inflation and fund your dream civilian lifestyle.",
    inputs: [
      { id: 'monthlyExpenses', label: 'CURRENT MONTHLY EXPENSES (₹)', defaultValue: 50000, min: 15000, max: 500000, step: 5000, unit: '₹', isCurrency: true },
      { id: 'yearsToRetire', label: 'YEARS TO RETIREMENT', defaultValue: 15, min: 1, max: 35, step: 1, unit: 'Yrs' },
      { id: 'inflation', label: 'EXPECTED INFLATION', defaultValue: 6, min: 3, max: 12, step: 0.5, unit: '%' },
      { id: 'postRetirementReturn', label: 'POST-RETIREMENT RETURN', defaultValue: 8, min: 5, max: 12, step: 0.5, unit: '%' }
    ],
    calculate: (vals) => {
      const expenses = Number(vals.monthlyExpenses) || 50000;
      const years = Number(vals.yearsToRetire) || 15;
      const inf = Number(vals.inflation) || 6;

      const futureMonthlyExp = expenses * Math.pow(1 + inf / 100, years);
      const annualExpRetirement = futureMonthlyExp * 12;
      // 20x annual expense corpus rule for Indian retirement security
      const targetCorpus = annualExpRetirement * 20;

      return {
        mainValue: formatINR(targetCorpus),
        mainLabel: 'TARGET RETIREMENT CORPUS',
        subtext: `Estimated Monthly Expense at Retirement: ${formatINR(futureMonthlyExp)}`,
        stats: [
          { label: "Today's Monthly Expense", value: formatINR(expenses) },
          { label: 'Future Monthly Expense', value: formatINR(futureMonthlyExp) },
          { label: 'Annual Expense at Retire', value: formatINR(annualExpRetirement) },
          { label: 'Required Corpus (20x)', value: formatINR(targetCorpus) }
        ],
        chartType: 'inflation-bar',
        chartData: { current: expenses * 12 * 20, future: targetCorpus }
      };
    }
  },
  {
    id: 'house-planning',
    title: 'House Planning',
    subtitle: 'Map out your down payment and purchase savings target for your dream home.',
    iconName: 'Landmark',
    badge: 'Property Goal',
    militaryRelevance: "Veterans enjoy concessionary home loan rates; saving a 25-30% down payment reduces EMI burden significantly.",
    inputs: [
      { id: 'propertyValue', label: 'CURRENT PROPERTY PRICE (₹)', defaultValue: 7500000, min: 1000000, max: 50000000, step: 250000, unit: '₹', isCurrency: true },
      { id: 'downPaymentPercent', label: 'DOWN PAYMENT TARGET', defaultValue: 25, min: 10, max: 50, step: 5, unit: '%' },
      { id: 'yearsLeft', label: 'YEARS TO PURCHASE', defaultValue: 5, min: 1, max: 15, step: 1, unit: 'Yrs' },
      { id: 'expectedReturn', label: 'EXPECTED SIP RETURN', defaultValue: 11, min: 6, max: 18, step: 0.5, unit: '%' }
    ],
    calculate: (vals) => {
      const price = Number(vals.propertyValue) || 7500000;
      const downPct = Number(vals.downPaymentPercent) || 25;
      const years = Number(vals.yearsLeft) || 5;
      const ret = Number(vals.expectedReturn) || 11;

      // Assume 5% property price appreciation
      const futurePrice = price * Math.pow(1.05, years);
      const targetDownPayment = futurePrice * (downPct / 100);

      const r = ret / 12 / 100;
      const n = years * 12;
      const monthlySIP = (targetDownPayment * r) / ((Math.pow(1 + r, n) - 1) * (1 + r));

      return {
        mainValue: formatINR(targetDownPayment),
        mainLabel: 'REQUIRED DOWN PAYMENT CORPUS',
        subtext: `Required Monthly SIP: ${formatINR(monthlySIP)}`,
        stats: [
          { label: "Today's Property Price", value: formatINR(price) },
          { label: 'Projected Property Price', value: formatINR(futurePrice) },
          { label: 'Down Payment Target', value: `${downPct}% (${formatINR(targetDownPayment)})` },
          { label: 'Required Monthly SIP', value: formatINR(monthlySIP) }
        ],
        chartType: 'inflation-bar',
        chartData: { current: price * (downPct / 100), future: targetDownPayment }
      };
    }
  },
  {
    id: 'emergency-fund',
    title: 'Emergency Fund',
    subtitle: 'Calculate the ideal cash & liquid mutual fund safety net for transition or unexpected emergencies.',
    iconName: 'ShieldCheck',
    badge: 'Safety Net',
    militaryRelevance: "During civilian job transitions, maintain 9 to 12 months of expenses in high-liquidity funds so you never accept a compromised salary offer.",
    inputs: [
      { id: 'monthlyExpenses', label: 'MONTHLY LIVING EXPENSES (₹)', defaultValue: 60000, min: 10000, max: 500000, step: 5000, unit: '₹', isCurrency: true },
      { id: 'monthsCoverage', label: 'MONTHS OF SAFETY COVERAGE', defaultValue: 9, min: 3, max: 24, step: 1, unit: 'Mths' },
      { id: 'medicalBuffer', label: 'ADDITIONAL MEDICAL/FAMILY BUFFER', defaultValue: 100000, min: 0, max: 1000000, step: 25000, unit: '₹', isCurrency: true }
    ],
    calculate: (vals) => {
      const expenses = Number(vals.monthlyExpenses) || 60000;
      const months = Number(vals.monthsCoverage) || 9;
      const buffer = Number(vals.medicalBuffer) || 100000;

      const totalFund = expenses * months + buffer;

      return {
        mainValue: formatINR(totalFund),
        mainLabel: 'TARGET EMERGENCY FUND',
        subtext: `Provides ${months} months of full financial independence`,
        stats: [
          { label: 'Monthly Expenses', value: formatINR(expenses) },
          { label: 'Coverage Duration', value: `${months} Months` },
          { label: 'Medical / Buffer Reserve', value: formatINR(buffer) },
          { label: 'Total Safety Net', value: formatINR(totalFund) }
        ],
        chartType: 'split-bar',
        chartData: { invested: expenses * months, gain: buffer }
      };
    }
  },
  {
    id: 'loan-emi-vs-sip',
    title: 'Loan EMI vs SIP',
    subtitle: 'Compare whether to prepay your loan EMI or invest that surplus in an equity SIP.',
    iconName: 'PieChart',
    badge: 'Debt Strategy',
    militaryRelevance: "Home loan interest rates (~8.5%) are lower than long-term equity SIP returns (~12-14%). See how much wealth you gain by investing your surplus.",
    inputs: [
      { id: 'surplusAmount', label: 'MONTHLY SURPLUS AVAILABLE (₹)', defaultValue: 15000, min: 2000, max: 200000, step: 1000, unit: '₹', isCurrency: true },
      { id: 'tenureYears', label: 'REMAINING LOAN TENURE', defaultValue: 10, min: 1, max: 25, step: 1, unit: 'Yrs' },
      { id: 'loanInterestRate', label: 'LOAN INTEREST RATE', defaultValue: 8.5, min: 5, max: 18, step: 0.5, unit: '%' },
      { id: 'sipReturnRate', label: 'EXPECTED SIP RETURN', defaultValue: 13, min: 8, max: 20, step: 0.5, unit: '%' }
    ],
    calculate: (vals) => {
      const surplus = Number(vals.surplusAmount) || 15000;
      const years = Number(vals.tenureYears) || 10;
      const loanRate = Number(vals.loanInterestRate) || 8.5;
      const sipRate = Number(vals.sipReturnRate) || 13;

      const n = years * 12;
      const rSip = sipRate / 12 / 100;
      const sipCorpus = surplus * ((Math.pow(1 + rSip, n) - 1) / rSip) * (1 + rSip);
      const totalSurplus = surplus * n;
      // Approx interest saved by prepayment
      const loanInterestSaved = totalSurplus * (loanRate / 100) * 0.55;
      const netBenefit = sipCorpus - totalSurplus - loanInterestSaved;

      return {
        mainValue: formatINR(sipCorpus),
        mainLabel: 'PROJECTED SIP WEALTH CREATED',
        subtext: `Net Wealth Advantage over Loan Prepayment: ${formatINR(Math.max(0, netBenefit))}`,
        stats: [
          { label: 'Total Surplus Available', value: formatINR(totalSurplus) },
          { label: 'Approx Loan Interest Saved', value: formatINR(loanInterestSaved) },
          { label: 'SIP Corpus Accumulated', value: formatINR(sipCorpus) },
          { label: 'Net SIP Wealth Advantage', value: formatINR(Math.max(0, netBenefit)) }
        ],
        chartType: 'split-bar',
        chartData: { invested: totalSurplus + loanInterestSaved, gain: Math.max(0, netBenefit) }
      };
    }
  }
];

export const FINANCIAL_PLANNING_TOOLS = [
  {
    id: 'simple-sip',
    title: 'Simple SIP Calculator',
    subtitle: 'Calculate the future compounding value of a regular monthly systematic investment plan.',
    iconName: 'TrendingUp',
    badge: 'Wealth Building',
    militaryRelevance: "Start a disciplined ₹5,000 to ₹15,000 SIP during active service to harness 15+ years of tax-efficient compounding.",
    inputs: [
      { id: 'monthlySIP', label: 'MONTHLY SIP AMOUNT (₹)', defaultValue: 10000, min: 1000, max: 200000, step: 1000, unit: '₹', isCurrency: true },
      { id: 'years', label: 'INVESTMENT TENURE (YRS)', defaultValue: 15, min: 1, max: 35, step: 1, unit: 'Yrs' },
      { id: 'expectedReturn', label: 'EXPECTED ANNUAL RETURN', defaultValue: 12, min: 5, max: 25, step: 0.5, unit: '%' }
    ],
    calculate: (vals) => {
      const sip = Number(vals.monthlySIP) || 10000;
      const years = Number(vals.years) || 15;
      const annualReturn = Number(vals.expectedReturn) || 12;
      const r = annualReturn / 12 / 100;
      const n = years * 12;

      const fv = sip * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
      const totalInvested = sip * n;
      const estimatedGain = fv - totalInvested;

      return {
        mainValue: formatINR(fv),
        mainLabel: 'EXPECTED TOTAL VALUE',
        subtext: `Total Wealth Generated: ${formatINR(estimatedGain)}`,
        stats: [
          { label: 'Total Invested', value: formatINR(totalInvested) },
          { label: 'Estimated Gain', value: formatINR(estimatedGain) },
          { label: 'Total Value', value: formatINR(fv) },
          { label: 'Investment Tenure', value: `${years} Years` }
        ],
        chartType: 'split-bar',
        chartData: { invested: totalInvested, gain: estimatedGain }
      };
    }
  },
  {
    id: 'step-up-sip',
    title: 'Step-Up SIP Calculator',
    subtitle: 'See how stepping up your SIP annually with salary increments multiplies long-term wealth.',
    iconName: 'TrendingUp',
    badge: 'Annual Increment',
    militaryRelevance: "Align your annual SIP step-up (e.g. +10% every year) with annual military pay increments or DA hikes.",
    inputs: [
      { id: 'monthlySIP', label: 'INITIAL MONTHLY SIP (₹)', defaultValue: 10000, min: 1000, max: 200000, step: 1000, unit: '₹', isCurrency: true },
      { id: 'stepUpPercent', label: 'ANNUAL STEP-UP %', defaultValue: 10, min: 5, max: 30, step: 1, unit: '%' },
      { id: 'years', label: 'INVESTMENT TENURE (YRS)', defaultValue: 15, min: 1, max: 35, step: 1, unit: 'Yrs' },
      { id: 'expectedReturn', label: 'EXPECTED ANNUAL RETURN', defaultValue: 12, min: 5, max: 25, step: 0.5, unit: '%' }
    ],
    calculate: (vals) => {
      const startSip = Number(vals.monthlySIP) || 10000;
      const stepUp = (Number(vals.stepUpPercent) || 10) / 100;
      const years = Number(vals.years) || 15;
      const annualReturn = Number(vals.expectedReturn) || 12;
      const r = annualReturn / 12 / 100;

      let fv = 0;
      let totalInvested = 0;
      let currentSip = startSip;

      for (let yr = 0; yr < years; yr++) {
        for (let m = 0; m < 12; m++) {
          totalInvested += currentSip;
          fv = (fv + currentSip) * (1 + r);
        }
        currentSip = currentSip * (1 + stepUp);
      }
      const gain = fv - totalInvested;

      return {
        mainValue: formatINR(fv),
        mainLabel: 'STEP-UP PORTFOLIO VALUE',
        subtext: `Total Gain Generated: ${formatINR(gain)}`,
        stats: [
          { label: 'Total Invested', value: formatINR(totalInvested) },
          { label: 'Estimated Gain', value: formatINR(gain) },
          { label: 'Final Annual SIP', value: formatINR(currentSip) },
          { label: 'Total Value', value: formatINR(fv) }
        ],
        chartType: 'split-bar',
        chartData: { invested: totalInvested, gain: gain }
      };
    }
  },
  {
    id: 'lump-sum',
    title: 'Lump-Sum Calculator',
    subtitle: 'Calculate the growth of a one-time lump-sum investment in equity or hybrid mutual funds.',
    iconName: 'Landmark',
    badge: 'One-Time Corpus',
    militaryRelevance: "Deploy retirement gratuity, leave encashment, or Seva Nidhi payouts into structured mutual fund portfolios.",
    inputs: [
      { id: 'lumpSumAmount', label: 'LUMP SUM AMOUNT (₹)', defaultValue: 500000, min: 25000, max: 50000000, step: 25000, unit: '₹', isCurrency: true },
      { id: 'years', label: 'INVESTMENT TENURE (YRS)', defaultValue: 10, min: 1, max: 35, step: 1, unit: 'Yrs' },
      { id: 'expectedReturn', label: 'EXPECTED ANNUAL RETURN', defaultValue: 12, min: 5, max: 25, step: 0.5, unit: '%' }
    ],
    calculate: (vals) => {
      const p = Number(vals.lumpSumAmount) || 500000;
      const years = Number(vals.years) || 10;
      const ret = Number(vals.expectedReturn) || 12;

      const fv = p * Math.pow(1 + ret / 100, years);
      const gain = fv - p;

      return {
        mainValue: formatINR(fv),
        mainLabel: 'EXPECTED CORPUS VALUE',
        subtext: `Wealth Multiplied by ${(fv / p).toFixed(1)}x`,
        stats: [
          { label: 'Initial Investment', value: formatINR(p) },
          { label: 'Estimated Growth', value: formatINR(gain) },
          { label: 'Total Corpus Value', value: formatINR(fv) },
          { label: 'Tenure', value: `${years} Years` }
        ],
        chartType: 'split-bar',
        chartData: { invested: p, gain: gain }
      };
    }
  },
  {
    id: 'cost-of-delay',
    title: 'Cost of Delay',
    subtitle: 'Discover the shocking amount of wealth lost by delaying your SIP investment journey by just a few years.',
    iconName: 'Clock',
    badge: 'Time Power',
    militaryRelevance: "Delaying SIPs until retirement costs veterans lakhs in lost compounding; starting 5 years earlier can double your retirement corpus.",
    inputs: [
      { id: 'monthlySIP', label: 'MONTHLY SIP AMOUNT (₹)', defaultValue: 15000, min: 2000, max: 200000, step: 1000, unit: '₹', isCurrency: true },
      { id: 'totalYears', label: 'TOTAL HORIZON (YRS)', defaultValue: 20, min: 5, max: 35, step: 1, unit: 'Yrs' },
      { id: 'delayYears', label: 'DELAY IN STARTING', defaultValue: 3, min: 1, max: 10, step: 1, unit: 'Yrs' },
      { id: 'expectedReturn', label: 'EXPECTED RETURN', defaultValue: 12, min: 6, max: 20, step: 0.5, unit: '%' }
    ],
    calculate: (vals) => {
      const sip = Number(vals.monthlySIP) || 15000;
      const totalYears = Number(vals.totalYears) || 20;
      const delayYears = Number(vals.delayYears) || 3;
      const annualReturn = Number(vals.expectedReturn) || 12;
      const r = annualReturn / 12 / 100;

      const n1 = totalYears * 12;
      const fvToday = sip * ((Math.pow(1 + r, n1) - 1) / r) * (1 + r);

      const n2 = Math.max(1, totalYears - delayYears) * 12;
      const fvDelayed = sip * ((Math.pow(1 + r, n2) - 1) / r) * (1 + r);

      const wealthLost = Math.max(0, fvToday - fvDelayed);

      return {
        mainValue: formatINR(wealthLost),
        mainLabel: 'ESTIMATED WEALTH LOST BY DELAYING',
        subtext: `Corpus if started today: ${formatINR(fvToday)} vs if delayed: ${formatINR(fvDelayed)}`,
        stats: [
          { label: 'Corpus If Started Today', value: formatINR(fvToday) },
          { label: `Corpus After ${delayYears}Yr Delay`, value: formatINR(fvDelayed) },
          { label: 'Wealth Lost', value: formatINR(wealthLost) },
          { label: 'Loss Percentage', value: `${((wealthLost / fvToday) * 100).toFixed(0)}%` }
        ],
        chartType: 'comparison-bar',
        chartData: { today: fvToday, delayed: fvDelayed }
      };
    }
  },
  {
    id: 'total-return',
    title: 'Total Return (SIP + Lump Sum)',
    subtitle: 'Calculate the combined compounding power of an initial lump sum plus monthly SIP additions.',
    iconName: 'PieChart',
    badge: 'Hybrid Portfolio',
    militaryRelevance: "Invest an initial Seva Nidhi / bonus lump sum and supplement it with monthly SIPs from your civilian salary.",
    inputs: [
      { id: 'lumpSumAmount', label: 'INITIAL LUMP SUM (₹)', defaultValue: 200000, min: 0, max: 10000000, step: 50000, unit: '₹', isCurrency: true },
      { id: 'monthlySIP', label: 'MONTHLY SIP (₹)', defaultValue: 10000, min: 0, max: 200000, step: 1000, unit: '₹', isCurrency: true },
      { id: 'years', label: 'INVESTMENT TENURE (YRS)', defaultValue: 15, min: 1, max: 35, step: 1, unit: 'Yrs' },
      { id: 'expectedReturn', label: 'EXPECTED ANNUAL RETURN', defaultValue: 12, min: 5, max: 25, step: 0.5, unit: '%' }
    ],
    calculate: (vals) => {
      const p = Number(vals.lumpSumAmount) || 200000;
      const sip = Number(vals.monthlySIP) || 10000;
      const years = Number(vals.years) || 15;
      const ret = Number(vals.expectedReturn) || 12;
      const r = ret / 12 / 100;
      const n = years * 12;

      const fvLump = p * Math.pow(1 + ret / 100, years);
      const fvSip = sip > 0 ? sip * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : 0;
      const totalFV = fvLump + fvSip;
      const totalInvested = p + sip * n;
      const gain = totalFV - totalInvested;

      return {
        mainValue: formatINR(totalFV),
        mainLabel: 'COMBINED PORTFOLIO VALUE',
        subtext: `Total Wealth Gain: ${formatINR(gain)}`,
        stats: [
          { label: 'Total Invested', value: formatINR(totalInvested) },
          { label: 'Total Growth', value: formatINR(gain) },
          { label: 'Lump Sum Contribution', value: formatINR(fvLump) },
          { label: 'SIP Contribution', value: formatINR(fvSip) }
        ],
        chartType: 'split-bar',
        chartData: { invested: totalInvested, gain: gain }
      };
    }
  },
  {
    id: 'sip-with-inflation',
    title: 'SIP (Inflation Adjusted)',
    subtitle: "Calculate your true SIP corpus in today's purchasing power after factoring in inflation.",
    iconName: 'Landmark',
    badge: 'Real Power',
    militaryRelevance: "A ₹1 Crore nominal corpus in 20 years is worth ~₹31 Lakhs in today's money at 6% inflation; aim for an inflation-beating real return.",
    inputs: [
      { id: 'monthlySIP', label: 'MONTHLY SIP (₹)', defaultValue: 15000, min: 1000, max: 200000, step: 1000, unit: '₹', isCurrency: true },
      { id: 'years', label: 'INVESTMENT TENURE (YRS)', defaultValue: 15, min: 1, max: 35, step: 1, unit: 'Yrs' },
      { id: 'expectedReturn', label: 'EXPECTED RETURN', defaultValue: 12, min: 6, max: 20, step: 0.5, unit: '%' },
      { id: 'inflationRate', label: 'EXPECTED INFLATION', defaultValue: 6, min: 3, max: 12, step: 0.5, unit: '%' }
    ],
    calculate: (vals) => {
      const sip = Number(vals.monthlySIP) || 15000;
      const years = Number(vals.years) || 15;
      const ret = Number(vals.expectedReturn) || 12;
      const inf = Number(vals.inflationRate) || 6;
      const r = ret / 12 / 100;
      const n = years * 12;

      const nominalFV = sip * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
      const realFV = nominalFV / Math.pow(1 + inf / 100, years);

      return {
        mainValue: formatINR(realFV),
        mainLabel: "REAL PURCHASING POWER (TODAY'S ₹)",
        subtext: `Nominal Future Value: ${formatINR(nominalFV)}`,
        stats: [
          { label: 'Total Invested', value: formatINR(sip * n) },
          { label: 'Nominal Future Value', value: formatINR(nominalFV) },
          { label: "Real Value (Today's ₹)", value: formatINR(realFV) },
          { label: 'Inflation Impact', value: `-${formatINR(nominalFV - realFV)}` }
        ],
        chartType: 'comparison-bar',
        chartData: { today: nominalFV, delayed: realFV }
      };
    }
  }
];
