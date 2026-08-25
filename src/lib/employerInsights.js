import { Building2, TrendingUp, Users, Target, CalendarClock, ShieldCheck } from 'lucide-react';

/**
 * Client-side "here's what this means for your candidate matches" copy for
 * the employer onboarding journey — mirrors profilingInsights.js's pattern
 * and constraints (qualitative framing, no fabricated numbers).
 */
export function getEmployerInsights(formData) {
  const insights = [];

  if (formData.companyName) {
    insights.push({
      icon: Building2,
      label: 'Company Profile Building',
      detail: `We're building ${formData.companyName}'s presence so veteran candidates can find and trust your listings.`,
    });
  }

  if (formData.industry) {
    insights.push({
      icon: TrendingUp,
      label: 'Industry Match Pool',
      detail: `We'll prioritise surfacing candidates whose service trade backgrounds map well to ${formData.industry}.`,
    });
  }

  if (formData.hiringRoles?.length) {
    insights.push({
      icon: Users,
      label: 'Role Targeting',
      detail: 'The roles you list here directly shape which candidates we rank to the top for you.',
    });
  }

  if (formData.requiredSkills?.length) {
    insights.push({
      icon: Target,
      label: 'Skills Matching',
      detail: 'Listing required skills sharpens how closely we match veteran trade backgrounds to your openings.',
    });
  }

  if (formData.hiringReadiness) {
    insights.push({
      icon: CalendarClock,
      label: 'Hiring Readiness',
      detail: `Marked as "${formData.hiringReadiness}" — we'll pace candidate introductions to match your timeline.`,
    });
  }

  if (formData.pwdHiringStance) {
    insights.push({
      icon: ShieldCheck,
      label: 'PwD Quota Matching',
      detail: 'We\'ll prioritise surfacing quota-eligible PwD candidates alongside your other requisites.',
    });
  }

  return insights;
}
