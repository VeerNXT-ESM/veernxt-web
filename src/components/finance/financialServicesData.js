/**
 * VeerNXT Financial Services Suite Data
 * Ripped from Complete Suite of Services and enriched for Indian Armed Forces, Veterans, and Agniveers.
 * All brand references are strictly VeerNXT.
 */

export const FINANCIAL_SERVICES_SUITE = [
  {
    id: 'mutual_funds',
    title: 'Mutual Funds',
    shortDescription:
      'Diversified portfolios across equity, debt, and hybrid funds. Take advantage of ELSS for tax saving, and automate your investments with flexible SIP, SWP, and STP options.',
    icon: 'PieChart',
    badgeText: 'Asset Deep-Dive',
    accentColor: 'green',
    modalContent: {
      headline: 'Institutional Mutual Fund Solutions for Defense Personnel',
      subheadline:
        'Systematic wealth compounding tailored to your deployment cycles, pensions, and retirement milestones.',
      overview: [
        'At VeerNXT, we provide expert Mutual Fund investment frameworks designed to compound your wealth predictably through systematic asset allocation. Recognizing that operational deployments and remote postings leave little time to monitor market volatility, our specialists ground every fund selection in objective, behaviorally-sound strategies.',
        'Whether your current horizon targets aggressive equity compounding, fixed-yield capital preservation, or tax-saving ELSS paths, we help you eliminate psychological biases. Gain access to institutional-grade fund evaluation parameters, clean portfolio diversification metrics, and fully transparent portfolio tracking.'
      ],
      defenseRelevance: {
        title: 'Why This Matters for Veterans & Agniveers',
        content:
          'Military personnel often experience predictable salary increments and lump-sum payouts (such as Seva Nidhi for Agniveers or retirement gratuities for veterans). We structure automated SIPs and STPs that sync seamlessly with Defense Salary Accounts (DSP), ensuring your capital grows even while you are deployed in zero-connectivity forward areas.'
      },
      categories: [
        {
          title: 'Equity Funds',
          subtitle: 'High Long-Term Growth',
          desc: 'Invest primarily in stocks across Large-Cap, Mid-Cap, Small-Cap, and Sectoral themes. Ideal for investors with a 5+ year horizon aiming to beat inflation significantly.'
        },
        {
          title: 'Debt Funds',
          subtitle: 'Stable & Conservative',
          desc: 'Invest in government bonds, treasury bills, and high-rated corporate debt. Perfect for capital preservation and generating better tax-adjusted returns than regular savings accounts.'
        },
        {
          title: 'Hybrid Funds',
          subtitle: 'Balanced Risk & Reward',
          desc: 'Combine equity and debt instruments to cushion against sharp market drawdowns while capturing equity upside. Best suited for moderate risk-takers and mid-career personnel.'
        },
        {
          title: 'ELSS (Tax Saving)',
          subtitle: 'Section 80C Deduction',
          desc: 'Equity-linked savings schemes with the shortest lock-in period (3 years) among 80C options, allowing you to claim up to ₹1.5 Lakh tax deduction while building wealth.'
        },
        {
          title: 'Index & Passive Funds',
          subtitle: 'Low-Cost Market Tracking',
          desc: 'Track benchmarks like Nifty 50 or Sensex with minimal expense ratios. Ideal for disciplined, hands-off investors who want low-cost exposure to India’s growth story.'
        }
      ],
      benefits: [
        {
          title: 'NISM-Certified Military Planners',
          desc: 'Our advisory panel includes certified planners who understand defense pay structures and allowances.'
        },
        {
          title: 'Zero-Conflict Recommendations',
          desc: 'We prioritize your net returns without pushing high-commission or mis-sold products.'
        },
        {
          title: 'Automated SIP & STP Mandates',
          desc: 'Set up seamless mandates that execute automatically, regardless of field deployments.'
        },
        {
          title: 'Tax-Optimized Withdrawals',
          desc: 'Structured SWP (Systematic Withdrawal Plan) strategies to supplement pension income tax-efficiently.'
        }
      ],
      faqs: [
        {
          question: 'Can I continue my SIPs if I am posted to a remote field area?',
          answer:
            'Yes. Once your OTM (One Time Mandate) or NACH mandate is registered with your bank, SIP installments are debited automatically without requiring any manual OTPs or connectivity.'
        },
        {
          question: 'How is ELSS better than PPF or Army Group Insurance (AGIF) for tax saving?',
          answer:
            'While PPF has a 15-year lock-in, ELSS has only a 3-year lock-in and offers equity-linked compounding, historically delivering significantly higher real returns over 5–7 years.'
        },
        {
          question: 'What is the minimum amount needed to start investing with VeerNXT?',
          answer:
            'You can begin a Systematic Investment Plan (SIP) in diversified mutual funds with as little as ₹500 per month.'
        }
      ],
      ctaText: 'Schedule Free Veteran Financial Consultation'
    }
  },
  {
    id: 'stock_broking',
    title: 'Stock Broking',
    shortDescription:
      'Trade seamlessly in equities, derivatives, and commodities. Benefit from our expert research reports, market insights, and low brokerage fees tailored for active traders.',
    icon: 'TrendingUp',
    badgeText: 'Direct Equities',
    accentColor: 'gold',
    modalContent: {
      headline: 'Institutional Stock Broking & Direct Equity Research',
      subheadline:
        'Data-backed equity research and low-latency execution tailored for disciplined investors and active traders.',
      overview: [
        'VeerNXT provides direct market access to NSE and BSE equities, derivatives, and commodities backed by fundamental and technical research. We empower defense personnel and veterans to participate directly in India’s corporate growth without falling prey to speculative noise or unchecked leverage.',
        'Our platform combines transparent, competitive brokerage pricing with curated stock baskets and macroeconomic reports. Whether you are building a long-term dividend portfolio or tactically hedging existing holdings, our advisory desk supports every execution.'
      ],
      defenseRelevance: {
        title: 'Why This Matters for Veterans & Agniveers',
        content:
          'Transitioning out of uniform often opens up time to actively manage personal portfolios. We provide specialized training on risk-reward discipline and portfolio defense, ensuring veterans do not risk hard-earned retirement corpora in speculative derivatives.'
      },
      categories: [
        {
          title: 'Cash & Carry Equities (CNC)',
          subtitle: 'Long-Term Ownership',
          desc: 'Buy and hold high-conviction blue-chip, mid-cap, and emerging market leaders with zero leverage and full demat delivery.'
        },
        {
          title: 'Curated Stock Baskets',
          subtitle: 'Theme-Based Portfolios',
          desc: 'Pre-screened baskets of stocks around themes like Defense & Aerospace, Infrastructure, Banking, and Green Energy.'
        },
        {
          title: 'Derivatives & Hedging',
          subtitle: 'Risk Management Tools',
          desc: 'Index and stock futures/options for seasoned investors looking to hedge downside risk during market volatility.'
        },
        {
          title: 'ETF & Sovereign Gold Bonds',
          subtitle: 'Exchange Traded Assets',
          desc: 'Direct exchange trading of Nifty BeES, Gold ETFs, and RBI Sovereign Gold Bonds (SGBs) for cost-effective diversification.'
        }
      ],
      benefits: [
        {
          title: 'Institutional Research Desk',
          desc: 'Access quarterly earnings breakdowns, sector reports, and macro trends curated by financial analysts.'
        },
        {
          title: 'Transparent Flat Fee Brokerage',
          desc: 'No hidden markup charges—transparent brokerage rates designed for active and long-term investors alike.'
        },
        {
          title: 'Portfolio Health Diagnostics',
          desc: 'Regular portfolio reviews to identify concentration risks, underperforming stocks, and tax harvesting opportunities.'
        },
        {
          title: 'Dedicated Dealing Desk Support',
          desc: 'Direct telephone and chat access to certified dealers for execution support during market hours.'
        }
      ],
      faqs: [
        {
          question: 'Can serving Armed Forces personnel trade directly in the stock market?',
          answer:
            'Yes, serving personnel can invest and hold equity shares for long-term wealth creation. However, speculative intraday trading or excessive leverage should be avoided in line with service conduct guidelines.'
        },
        {
          question: 'How do I open a Demat and Trading account with VeerNXT?',
          answer:
            'Our digital onboarding is 100% paperless using Aadhaar and PAN e-KYC, taking less than 10 minutes to complete.'
        },
        {
          question: 'Are there charges for holding shares in my Demat account?',
          answer:
            'Standard SEBI/DP Annual Maintenance Charges (AMC) apply, but VeerNXT offers waived or discounted AMC tiers for verified defense personnel and veterans.'
        }
      ],
      ctaText: 'Explore Direct Equity Advisory'
    }
  },
  {
    id: 'fixed_deposits',
    title: 'Fixed Deposits',
    shortDescription:
      'Secure your capital with predictable returns and guaranteed growth. Choose from a wide range of reliable Bank and Corporate FDs offering flexible tenures to match your needs.',
    icon: 'Landmark',
    badgeText: 'Capital Security',
    accentColor: 'green',
    modalContent: {
      headline: 'High-Yield Bank & Corporate Fixed Deposits',
      subheadline:
        'Guaranteed capital protection with premium interest yields from AAA-rated banks and NBFCs.',
      overview: [
        'For capital that you cannot afford to expose to market fluctuations—such as children’s education milestones, upcoming home purchases, or emergency funds—VeerNXT offers curated access to top-rated Bank and Corporate Fixed Deposits.',
        'We screen corporate issuers rigorously on CRISIL, ICRA, and CARE credit ratings (strictly AAA and AA+), allowing you to earn up to 1.5% to 2.5% higher annual interest than conventional PSU bank savings or standard deposit rates without compromising solvency.'
      ],
      defenseRelevance: {
        title: 'Why This Matters for Veterans & Agniveers',
        content:
          'When Agniveers receive their lump-sum Seva Nidhi package or veterans receive retirement gratuities, preserving the core corpus is the #1 priority. Curated high-yield FDs allow you to lock in guaranteed monthly or quarterly payouts while planning long-term career moves.'
      },
      categories: [
        {
          title: 'AAA-Rated Corporate FDs',
          subtitle: 'Maximum Yield Security',
          desc: 'Deposits with top-tier corporate conglomerates offering 8.0% to 8.75% p.a. interest rates with impeccable repayment track records.'
        },
        {
          title: 'Senior Citizen / Veteran Bonus FDs',
          subtitle: '0.50% Extra Payout',
          desc: 'Special interest rate bonuses for retired personnel and senior citizens looking for reliable monthly or quarterly pension supplementation.'
        },
        {
          title: 'Tax-Saver 5-Year Bank FDs',
          subtitle: 'Section 80C Lock-In',
          desc: 'Scheduled commercial bank FDs eligible for tax exemption under Section 80C with guaranteed maturity payouts.'
        },
        {
          title: 'Cumulative & Non-Cumulative Options',
          subtitle: 'Flexible Cash Flow',
          desc: 'Choose cumulative compounding for lump-sum growth or non-cumulative payouts (monthly/quarterly/yearly) to cover household expenses.'
        }
      ],
      benefits: [
        {
          title: 'Strictly AAA & AA+ Credit Quality',
          desc: 'We never list high-risk or lower-rated NBFCs; every institution is vetted for balance sheet strength.'
        },
        {
          title: 'Digital Instant Booking',
          desc: 'Book FDs across multiple banks and NBFCs from a single VeerNXT dashboard without opening new bank accounts.'
        },
        {
          title: 'Automated Maturity & Renewal Alerts',
          desc: 'Receive proactive alerts 30 days before maturity so your money never sits idle in low-interest accounts.'
        },
        {
          title: 'Premature Withdrawal Guidance',
          desc: 'Clear transparency on liquidity terms and premature closure penalties before you invest.'
        }
      ],
      faqs: [
        {
          question: 'Are Corporate Fixed Deposits safe compared to bank FDs?',
          answer:
            'CRISIL AAA-rated corporate FDs represent the highest safety standard, indicating an extremely strong degree of safety regarding timely payment of financial obligations.'
        },
        {
          question: 'Can I receive monthly interest payouts to my existing salary account?',
          answer:
            'Yes. Under non-cumulative FD options, monthly, quarterly, half-yearly, or annual interest is credited directly to your registered bank account via NEFT/RTGS.'
        },
        {
          question: 'Is tax deducted at source (TDS) on Fixed Deposit interest?',
          answer:
            'Yes, TDS is deducted per Income Tax rules if annual interest exceeds ₹40,000 (₹50,000 for senior citizens). You can submit Form 15G/15H if your total income is below the taxable limit.'
        }
      ],
      ctaText: 'Compare AAA Fixed Deposit Rates'
    }
  },
  {
    id: 'bonds',
    title: 'Bonds',
    shortDescription:
      'Build a stable fixed-income portfolio with our conservative investment options. Access secure Government Securities, reliable Corporate Bonds, and lucrative Tax-Free Bonds.',
    icon: 'FileText',
    badgeText: 'Fixed Income',
    accentColor: 'gold',
    modalContent: {
      headline: 'Sovereign & Corporate Bonds for Stable Fixed Income',
      subheadline:
        'Lock in predictable yields with Government of India Securities, PSU Bonds, and Tax-Free Instruments.',
      overview: [
        'Bonds are the bedrock of any resilient financial fortress. VeerNXT opens the door to the Indian debt capital markets, enabling individual defense personnel and veterans to invest in Government Securities (G-Secs), State Development Loans (SDLs), and Public Sector Undertaking (PSU) bonds.',
        'Unlike volatile equity instruments, bonds provide fixed coupon payments at regular intervals and return your face value at maturity. For retirees and conservative investors, building a laddered bond portfolio ensures a predictable cash flow stream that outlasts market downturns.'
      ],
      defenseRelevance: {
        title: 'Why This Matters for Veterans & Agniveers',
        content:
          'Veterans looking for a permanent, sovereign-guaranteed monthly income stream beyond their military pension can lock in long-term G-Sec yields (up to 20–30 year tenures), creating a financial legacy that is 100% immune to stock market crashes.'
      },
      categories: [
        {
          title: 'Government of India Securities (G-Secs)',
          subtitle: 'Sovereign Guarantee',
          desc: 'Direct debt obligations of the Central Government carrying zero default risk and tenures ranging from 1 year to 40 years.'
        },
        {
          title: 'Tax-Free PSU Bonds',
          subtitle: 'Zero Income Tax on Interest',
          desc: 'Issued by government-backed entities like NHAI, IRFC, REC, and PFC, where annual coupon income is completely exempt from income tax.'
        },
        {
          title: 'CRISIL AAA Corporate Bonds',
          subtitle: 'Institutional Yields',
          desc: 'High-grade corporate debentures offering 7.8% to 9.2% annual yields for investors seeking higher cash flow than traditional FDs.'
        },
        {
          title: 'Sovereign Gold Bonds (SGBs)',
          subtitle: 'Gold Growth + 2.5% p.a. Interest',
          desc: 'Government-backed gold ownership that pays 2.5% annual interest on your investment with zero capital gains tax on maturity.'
        }
      ],
      benefits: [
        {
          title: 'Zero Credit Risk on Sovereign Bonds',
          desc: 'G-Secs and State Development Loans carry the explicit sovereign guarantee of the Indian Government.'
        },
        {
          title: 'Higher After-Tax Payouts',
          desc: 'Tax-free bonds and indexation benefits on debt instruments help you retain more net income in higher tax slabs.'
        },
        {
          title: 'Tradable Liquidity',
          desc: 'All bonds are held in your Demat account and can be sold on stock exchanges if unexpected liquidity is needed.'
        },
        {
          title: 'Laddered Cash Flow Design',
          desc: 'We help you design portfolios where bond maturities occur systematically every year to meet life goals.'
        }
      ],
      faqs: [
        {
          question: 'What is the difference between a Bond and a Fixed Deposit?',
          answer:
            'While both offer fixed interest, bonds are marketable securities held in Demat accounts that can be traded on exchanges, and sovereign G-Secs carry zero default risk compared to ₹5 Lakh DICGC insurance on bank FDs.'
        },
        {
          question: 'How is interest paid on Government Bonds?',
          answer:
            'Interest (coupon) is typically paid semi-annually directly into your registered bank account.'
        },
        {
          question: 'Is there any lock-in period for G-Secs or Corporate Bonds?',
          answer:
            'There is no mandatory lock-in; you can sell your bonds on exchange secondary markets before maturity at prevailing market prices.'
        }
      ],
      ctaText: 'Explore Available Bond Offerings'
    }
  },
  {
    id: 'nri_corner',
    title: 'NRI Corner',
    shortDescription:
      'Specialized wealth management solutions for Non-Resident Indians. Get expert advisory services, seamless repatriation assistance, and comprehensive NRE/NRO account setup.',
    icon: 'Globe',
    badgeText: 'Global & NRI',
    accentColor: 'green',
    modalContent: {
      headline: 'Specialized NRI Wealth & NRE/NRO Advisory',
      subheadline:
        'Comprehensive financial management for personnel on UN Peacekeeping missions, overseas postings, and NRI veterans.',
      overview: [
        'Serving overseas on UN Peacekeeping deployments, diplomatic assignments, or transitioning into international careers requires specialized cross-border financial planning. VeerNXT’s NRI Corner simplifies FEMA compliance, NRE/NRO banking, and Indian asset management.',
        'We help you deploy overseas allowances and foreign earnings into Indian high-growth mutual funds, tax-exempt NRE fixed deposits, and real estate opportunities while ensuring seamless repatriation and full tax treaty compliance (DTAA).'
      ],
      defenseRelevance: {
        title: 'Why This Matters for Veterans & Agniveers',
        content:
          'Indian defense personnel serving in UN Peacekeeping forces or naval overseas missions earn significant allowances in USD/foreign currency. We structure NRE accounts and tax-free repatriation pathways so your earnings compound in India without double taxation.'
      },
      categories: [
        {
          title: 'NRE / NRO Account Optimization',
          subtitle: 'FEMA-Compliant Banking',
          desc: 'Guidance on setting up Non-Resident External (tax-free in India) and Non-Resident Ordinary accounts with top private banks.'
        },
        {
          title: 'NRI Mutual Fund Advisory',
          subtitle: 'USA / Canada Compliant Portfolios',
          desc: 'Specialized mutual fund selection compliant with FATCA regulations for NRIs residing in the US, UK, Middle East, and Canada.'
        },
        {
          title: 'Tax Treaty (DTAA) Assistance',
          subtitle: 'Avoid Double Taxation',
          desc: 'Optimize withholding tax (TDS) on Indian earnings by leveraging Double Taxation Avoidance Agreements between India and your residence country.'
        },
        {
          title: 'Repatriation & 15CA/15CB Filings',
          subtitle: 'Hassle-Free Fund Transfers',
          desc: 'End-to-end documentation support with Chartered Accountants to repatriate funds from Indian NRO accounts to overseas accounts.'
        }
      ],
      benefits: [
        {
          title: '100% Digital Remote Onboarding',
          desc: 'Complete all KYC and investment mandates from anywhere in the world without physically visiting India.'
        },
        {
          title: 'Dedicated NRI Relationship Manager',
          desc: 'Single-point contact trained in cross-border FEMA and Indian defense overseas allowances.'
        },
        {
          title: 'Tax-Free NRE Interest Yields',
          desc: 'Earn up to 7.5%+ interest on NRE Fixed Deposits that is completely exempt from Indian income tax.'
        },
        {
          title: 'Transparent Currency Conversion',
          desc: 'Guidance on timing foreign remittances to capture optimal INR exchange rates.'
        }
      ],
      faqs: [
        {
          question: 'Can I invest in Indian Mutual Funds while serving on a UN Peacekeeping mission?',
          answer:
            'Yes. You can invest from an NRE or NRO bank account using digital KYC. All mutual fund units will be linked to your Indian PAN.'
        },
        {
          question: 'Are NRIs from USA and Canada allowed to invest in Indian Mutual Funds?',
          answer:
            'Yes, several top AMCs in India accept US/Canada NRIs subject to FATCA compliance, and VeerNXT filters and recommends only compliant funds.'
        },
        {
          question: 'Is interest earned in an NRE account taxable in India?',
          answer:
            'No. Interest earned on NRE savings accounts and NRE Fixed Deposits is 100% tax-free in India.'
        }
      ],
      ctaText: 'Speak to an NRI Financial Specialist'
    }
  },
  {
    id: 'term_insurance',
    title: 'Term Insurance',
    shortDescription:
      'Protect your family’s financial future with pure life coverage. Enjoy high cover amounts at low premiums, complete with attractive tax benefits for absolute peace of mind.',
    icon: 'ShieldCheck',
    badgeText: 'Wealth Protection',
    accentColor: 'gold',
    modalContent: {
      headline: 'Pure Term Insurance & Family Income Protection',
      subheadline:
        'High-value pure life coverage to safeguard your family’s lifestyle, home loans, and children’s future.',
      overview: [
        'True wealth management begins with protecting your family against life’s uncertainties. While serving military personnel receive coverage under Army/Navy/Air Force Group Insurance Funds (AGIF/NGIF/AFGIS), this coverage terminates or reduces significantly upon retirement or completion of service.',
        'VeerNXT helps you lock in personal pure Term Insurance policies at young age premiums. With up to ₹1 Crore to ₹3 Crore coverage at affordable annual premiums, your family receives an immediate, tax-free lump sum to clear liabilities and maintain their standard of living in case of any unforeseen event.'
      ],
      defenseRelevance: {
        title: 'Why This Matters for Veterans & Agniveers',
        content:
          'When Agniveers complete their 4-year tenure or short-service commissioned officers transition to civilian life, service group insurance ends immediately. Locking in a civilian term life policy while young ensures low premiums for the next 30 to 40 years without defense-service occupational loadings.'
      },
      categories: [
        {
          title: 'Pure Term Life Protection',
          subtitle: 'Maximum Cover, Low Premium',
          desc: 'Straightforward life insurance paying a guaranteed lump sum to your nominees with zero investment dilution.'
        },
        {
          title: 'Critical Illness Rider',
          subtitle: 'Lump-Sum Health Benefit',
          desc: 'Optional rider paying out a lump sum upon diagnosis of major illnesses (cancer, heart attack, stroke) to cover treatment costs.'
        },
        {
          title: 'Accidental Death & Disability Rider',
          subtitle: 'Double Indemnity Protection',
          desc: 'Provides additional financial compensation if death or permanent disability occurs due to an accident.'
        },
        {
          title: 'Zero Cost Term Insurance',
          subtitle: 'Return of Premiums at Age 65',
          desc: 'Innovative policies where the insurer returns 100% of your paid premiums if you survive the policy tenure, at no extra cost.'
        }
      ],
      benefits: [
        {
          title: 'High Claim Settlement Ratios (99%+)',
          desc: 'We only partner with India’s most reputable insurers with proven 99%+ claim settlement track records.'
        },
        {
          title: 'Section 80C & Section 10(10D) Benefits',
          desc: 'Premiums are tax-deductible under 80C, and the death benefit payout is 100% tax-free under Section 10(10D).'
        },
        {
          title: 'Dedicated Veteran Claim Support',
          desc: 'In an emergency, our team assists your nominees with paperwork and fast-track claim settlement.'
        },
        {
          title: 'No Defense Exclusion Clauses',
          desc: 'We screen policies to ensure full transparency regarding peacetime vs operational hazard coverage.'
        }
      ],
      faqs: [
        {
          question: 'Should I buy civilian term insurance if I already have Army Group Insurance (AGIF)?',
          answer:
            'Yes. AGIF covers you while serving, but once you retire or transition, civilian term insurance becomes essential. Buying early locks in low premiums for life.'
        },
        {
          question: 'Can I pay premiums monthly or annually?',
          answer:
            'You can choose annual, semi-annual, or monthly premium payment frequencies via automated bank debit.'
        },
        {
          question: 'What is the ideal term insurance cover amount?',
          answer:
            'A general rule of thumb is 15 to 20 times your current annual income plus any outstanding home loan or debt liabilities.'
        }
      ],
      ctaText: 'Calculate Recommended Life Cover'
    }
  },
  {
    id: 'health_insurance',
    title: 'Health Insurance',
    shortDescription:
      'Comprehensive medical coverage to handle rising healthcare costs. Choose from tailored family floaters and critical illness covers with hassle-free cashless claim facilities.',
    icon: 'HeartPulse',
    badgeText: 'Health Shield',
    accentColor: 'green',
    modalContent: {
      headline: 'Comprehensive Family Health Insurance & Super Top-Ups',
      subheadline:
        'Protect your savings from medical inflation with cashless hospital access across 10,000+ hospitals nationwide.',
      overview: [
        'Medical emergencies are the single biggest cause of wealth erosion in India. While veterans and dependents have access to ECHS (Ex-Servicemen Contributory Health Scheme) and military hospitals, civilian health insurance is vital for immediate private hospital admissions, non-empanelled emergency treatments, and coverage for parents or non-dependent children.',
        'VeerNXT designs robust Family Floater plans and low-cost Super Top-Up policies that work alongside your existing military healthcare benefits, giving your family zero-compromise access to private medical infrastructure without paying out-of-pocket.'
      ],
      defenseRelevance: {
        title: 'Why This Matters for Veterans & Agniveers',
        content:
          'ECHS is an excellent safety net, but emergency admissions in Tier-1 private super-specialty hospitals often require immediate cashless approvals or bridge coverage. A Super Top-Up policy costs a fraction of a regular health plan and provides ₹20 Lakh to ₹50 Lakh additional protection.'
      },
      categories: [
        {
          title: 'Family Floater Policies',
          subtitle: 'Single Cover for Entire Family',
          desc: 'One comprehensive sum insured covering self, spouse, and children with cashless hospitalization across India.'
        },
        {
          title: 'Super Top-Up Health Shield',
          subtitle: 'High Cover at Minimal Premium',
          desc: 'Add ₹20 Lakh to ₹50 Lakh of backup health cover over an initial deductible (₹5 Lakh to ₹10 Lakh) at very low annual premiums.'
        },
        {
          title: 'Senior Citizen Health Care',
          subtitle: 'For Elderly Parents',
          desc: 'Specialized policies with minimal waiting periods for pre-existing diseases designed specifically for elderly parents.'
        },
        {
          title: 'Critical Illness & Oncology Cover',
          subtitle: 'Dedicated Disease Protection',
          desc: 'Lump-sum payouts upon diagnosis of critical conditions like cancer, kidney failure, or cardiac surgeries to fund specialized recovery.'
        }
      ],
      benefits: [
        {
          title: '10,000+ Cashless Hospital Network',
          desc: 'Direct cashless treatment across India’s premier hospital chains (Apollo, Max, Fortis, Manipal, Medanta).'
        },
        {
          title: 'Zero Room Rent Capping',
          desc: 'We recommend plans with zero room rent limits so you are never penalized with proportional deduction on hospital bills.'
        },
        {
          title: 'No Claim Bonus (NCB) up to 100%',
          desc: 'Your sum insured doubles over claim-free years without any increase in premium.'
        },
        {
          title: 'Section 80D Tax Exemption',
          desc: 'Save up to ₹25,000 to ₹75,000 in taxable income under Section 80D for health insurance premiums.'
        }
      ],
      faqs: [
        {
          question: 'Do I need a private health policy if I am covered under ECHS?',
          answer:
            'While ECHS covers medical care at empanelled centers, a private Super Top-Up policy is highly recommended for immediate private room access, zero referral wait times, and covering children after age 25.'
        },
        {
          question: 'What is a Super Top-Up policy and how does it save money?',
          answer:
            'A Super Top-Up covers hospital bills above a deductible threshold. Since small claims occur frequently and large claims are rare, ₹20 Lakh of Super Top-Up cover can cost as little as ₹3,000 to ₹5,000 a year.'
        },
        {
          question: 'Can I include my parents in my health insurance plan?',
          answer:
            'We recommend taking a separate senior citizen plan for parents so their age does not increase the premium of your nuclear family floater policy.'
        }
      ],
      ctaText: 'Compare Family Health & Top-Up Plans'
    }
  },
  {
    id: 'education_planning',
    title: 'Education Planning',
    shortDescription:
      'Smart, goal-based investments to easily fund your child’s higher education. Stay ahead of inflation, align with their milestones, and create lasting wealth for their future.',
    icon: 'GraduationCap',
    badgeText: 'Child Milestones',
    accentColor: 'gold',
    modalContent: {
      headline: 'Goal-Based Child Higher Education & Milestone Planning',
      subheadline:
        'Outpace 10%+ education inflation with structured equity-debt glide paths tailored to your child’s graduation year.',
      overview: [
        'Higher education costs in India and abroad are inflating at 10% to 12% annually—twice the general inflation rate. A professional engineering, medical, or management degree that costs ₹15 Lakh today will cost over ₹40 Lakh in 10 to 12 years.',
        'VeerNXT’s Education Planning framework replaces guesswork with mathematical precision. We calculate the exact future corpus required for your child’s target graduation year and build a dedicated, multi-asset portfolio that automatically reduces risk as the admission year approaches.'
      ],
      defenseRelevance: {
        title: 'Why This Matters for Veterans & Agniveers',
        content:
          'Armed forces families often aspire for premier higher education for their children. While scholarships and defense seats provide entry advantages, tuition and living expenses require a rock-solid investment corpus. We ensure your child graduate debt-free.'
      },
      categories: [
        {
          title: '10+ Year Equity Aggressive Horizon',
          subtitle: 'Maximum Inflation Compounding',
          desc: 'For toddlers and young children, where long timeframes allow high-growth small/mid/large-cap equity compounding.'
        },
        {
          title: '5 to 9 Year Balanced Glide Path',
          subtitle: 'Steady Growth & Risk Control',
          desc: 'Hybrid allocation that captures market growth while gradually moving gains into debt instruments as high school approaches.'
        },
        {
          title: '3-Year Capital Lock & Defense',
          subtitle: 'Zero Downside Risk Before College',
          desc: 'When your child enters 10th or 11th grade, we shift 100% of the education corpus into guaranteed fixed-income assets to protect college fees.'
        },
        {
          title: 'Overseas Education Currency Hedging',
          subtitle: 'USD / Foreign University Ready',
          desc: 'Specialized global mutual funds and international ETFs to protect against INR currency depreciation for study-abroad goals.'
        }
      ],
      benefits: [
        {
          title: 'Dedicated Child Education Calculator',
          desc: 'Precision forecasting accounting for course fees, living expenses, and 10% compounding education inflation.'
        },
        {
          title: 'Automated Risk Reduction (Glide Path)',
          desc: 'Systematically shift from high-growth equity to safe debt 3 years before college admission.'
        },
        {
          title: 'Zero Loan Burden for Your Child',
          desc: 'Ensure your child starts their professional career completely free from education loan EMIs.'
        },
        {
          title: 'Goal-Earmarked Portfolio Tracking',
          desc: 'Track your education corpus separately from your general retirement savings on the VeerNXT dashboard.'
        }
      ],
      faqs: [
        {
          question: 'How much should I invest monthly for my child’s higher education?',
          answer:
            'It depends on their current age and target course. For example, ₹5,000/month invested in equity mutual funds for 15 years at 12% annual return grows to approximately ₹25 Lakh.'
        },
        {
          question: 'Why not use traditional children’s insurance policies (ULIPs/Endowment plans)?',
          answer:
            'Traditional child endowment plans typically yield only 4% to 5% per annum, failing to beat education inflation. A dedicated mutual fund SIP combined with pure term insurance delivers far superior wealth.'
        },
        {
          question: 'What happens if the market crashes right before my child needs college fees?',
          answer:
            'Our glide-path strategy automatically shifts your accumulated corpus into safe debt funds 2 to 3 years before college, ensuring a market crash cannot touch your child’s fee money.'
        }
      ],
      ctaText: 'Build Your Child’s Education Roadmap'
    }
  }
];
