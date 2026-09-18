import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

/**
 * Always reads SMTP credentials directly from the .env file on disk.
 *
 * WHY: Vite's vercelApiPlugin loads `process.env` once at startup (vite.config.js line 89:
 *   `process.env = { ...process.env, ...env }`). Updating .env while the server is running
 *   does NOT update process.env — the old password stays frozen in memory until restart.
 *   By reading the file directly every time we need to send, we always get the latest password
 *   without requiring a restart.
 */
export function getSmtpCredentials() {
  let user = '';
  let pass = '';
  let from = '';

  // Always read directly from .env on disk to bypass stale process.env
  try {
    // Resolve from the Vite project root (process.cwd() is always the project root)
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const passMatch = envContent.match(/^SMTP_PASS=(.*)$/m);
      const userMatch = envContent.match(/^SMTP_USER=(.*)$/m);
      const fromMatch = envContent.match(/^SMTP_FROM=(.*)$/m);
      if (passMatch?.[1]) pass = passMatch[1].trim();
      if (userMatch?.[1]) user = userMatch[1].trim();
      if (fromMatch?.[1]) from = fromMatch[1].trim();
    } else {
      console.warn('[emailBroadcaster] .env file not found at', envPath, '— falling back to process.env');
    }
  } catch (e) {
    console.warn('[emailBroadcaster] Failed to read .env file:', e.message);
  }

  // Fallback to process.env if .env file parse failed
  if (!user) user = process.env.SMTP_USER || 'veernxtitofficial@gmail.com';
  if (!pass) pass = process.env.SMTP_PASS || '';

  // Strip all whitespace, quotes, and invisible chars from the password
  user = user.replace(/^["']|["']$/g, '').trim();
  pass = pass.replace(/^["']|["']$/g, '').replace(/\s+/g, '').trim();
  from = (from || `VeerNXT Civil Careers <${user}>`).replace(/^["']|["']$/g, '').trim();

  console.log(`[emailBroadcaster] SMTP credentials resolved: user=${user} passLength=${pass.length}`);

  return { user, pass, from };
}


/**
 * Normalizes and validates an email address.
 * Filters out internal dummy addresses generated for phone auth (e.g. 919884150857@veernxt.in).
 */
function isValidCandidateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const cleaned = email.trim().toLowerCase();
  if (!cleaned.includes('@') || !cleaned.includes('.')) return false;
  // Ignore dummy/placeholder emails generated from phone numbers or employer accounts
  if (cleaned.endsWith('@veernxt.in') || cleaned.includes('+employer@')) return false;
  // Basic email pattern check
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleaned);
}

/**
 * Retrieves all candidates who have subscribed for civil jobs:
 * 1. Candidates who created a profile in ps_candidate_profiles (consent_contact != false).
 * 2. Candidates with an active subscription tier (SCORE_UNLOCK, SCORE_CV, MONTHLY, ANNUAL, BIENNIAL, PREMIUM).
 * Resolves real email addresses from raw_profile_data, auth.users, or user_profiles.
 */
export async function getCivilJobSubscribers(supabaseAdmin) {
  try {
    // 1. Get candidate IDs who signed up for civilian jobs in ps_candidate_profiles
    const { data: psProfiles } = await supabaseAdmin
      .from('ps_candidate_profiles')
      .select('user_id, consent_contact, profile_completed');

    const psUserIds = new Set(
      (psProfiles || [])
        .filter((p) => p.consent_contact !== false)
        .map((p) => p.user_id)
    );

    // 2. Get user_profiles
    const { data: userProfiles } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, raw_profile_data, subscription_tier, subscription_expires_at');

    // 3. Get auth.users for authoritative email lookup
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const authMap = new Map((authData?.users || []).map((u) => [u.id, u]));

    const uniqueEmails = new Set();
    const subscribers = [];

    for (const p of userProfiles || []) {
      const isPs = psUserIds.has(p.id);
      const isSubscribed = p.subscription_tier && p.subscription_tier !== 'FREE';

      // Candidate must be either registered for civil jobs or have an active subscription
      if (!isPs && !isSubscribed) continue;

      const authUser = authMap.get(p.id);
      const rawData = p.raw_profile_data || {};

      // Try multiple candidate email fields
      const candidateEmail =
        (isValidCandidateEmail(rawData.email) && rawData.email) ||
        (isValidCandidateEmail(authUser?.email) && authUser.email) ||
        (isValidCandidateEmail(p.email) && p.email) ||
        (isValidCandidateEmail(authUser?.user_metadata?.email) && authUser.user_metadata.email);

      if (candidateEmail) {
        const norm = candidateEmail.trim().toLowerCase();
        if (!uniqueEmails.has(norm)) {
          uniqueEmails.add(norm);
          subscribers.push({
            id: p.id,
            email: norm,
            name: p.full_name || rawData.fullName || 'VeerNXT Member',
            isPs,
            isSubscribed,
            tier: p.subscription_tier || 'FREE',
          });
        }
      }
    }

    return subscribers;
  } catch (err) {
    console.error('[emailBroadcaster] Error fetching civil job subscribers:', err);
    return [];
  }
}

/**
 * Builds high-converting, professional HTML & plain-text email template for approved civilian job requirement.
 */
function buildJobEmailTemplate(requirement) {
  const role = (requirement.role_titles || []).join(' / ') || 'Civilian Career Opportunity';
  const company = requirement.employer_profiles?.company_name || 'VeerNXT Verified Employer Partner';
  const sector = requirement.sector || 'Private Sector / Industry';
  const vacancies = requirement.quantity ? `${requirement.quantity} Positions` : 'Multiple Positions';
  const locations = (requirement.locations || []).join(', ') || 'Multiple Locations Across India';
  const salary = requirement.salary_range || 'Competitive Compensation (as per industry standards)';
  const essentialCaps = requirement.essential_capabilities || [];
  const desiredCaps = requirement.desired_capabilities || [];
  const jobUrl = 'https://veernxt.in/private-sector/opportunities';

  const subject = `[VeerNXT Job Alert] ${role} at ${company} (${vacancies})`;

  const textContent = `
VeerNXT — Military to Civilian Transition Platform
New Approved Civilian Career Opportunity

Role: ${role}
Company: ${company}
Sector: ${sector}
Openings: ${vacancies}
Locations: ${locations}
Compensation: ${salary}

Essential Capabilities:
${essentialCaps.length > 0 ? essentialCaps.map((c) => `- ${c}`).join('\n') : '- Mapped military trade experience and supervisory scale'}

View details and express interest directly on VeerNXT:
${jobUrl}

---
You received this email because you are registered for VeerNXT Civilian & Corporate Opportunities.
VeerNXT — Empowering Indian Armed Forces Veterans & Agniveers in Corporate Careers.
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .wrapper { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #0d1f0d 0%, #1F3A2E 100%); padding: 28px 24px; text-align: center; color: white; border-bottom: 4px solid #eab308; }
    .badge { display: inline-block; background: rgba(255,255,255,0.18); color: #fef08a; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 999px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.25); }
    .title { font-size: 22px; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.01em; line-height: 1.3; }
    .company-sub { font-size: 14px; opacity: 0.9; margin: 0; }
    .body { padding: 28px 24px; }
    .intro { font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 20px; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .details-table td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #edf2f7; }
    .details-table tr:last-child td { border-bottom: none; }
    .label { color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; width: 35%; }
    .value { color: #0f172a; font-weight: 700; }
    .caps-box { background: #fbfdfa; border: 1px solid #cce5c4; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
    .caps-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #1e3a1e; letter-spacing: 0.05em; margin: 0 0 8px; }
    .cap-pill { display: inline-block; background: #eef4ea; color: #2d5a27; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 6px; margin: 3px; border: 1px solid #c3ddbc; }
    .cta-container { text-align: center; margin: 28px 0 16px; }
    .cta-btn { display: inline-block; background: #4b6b32; color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 800; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 10px rgba(75, 107, 50, 0.3); }
    .footer { background: #f1f5f9; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="badge">VeerNXT Civilian Career Alert</span>
      <h1 class="title">${role}</h1>
      <p class="company-sub">Hiring Partner: <strong>${company}</strong></p>
    </div>

    <div class="body">
      <p class="intro">
        An employer partner on VeerNXT has posted a new verified civilian job requirement matching transitioning Agniveer and Ex-Servicemen talent.
      </p>

      <table class="details-table">
        <tr>
          <td class="label">Domain / Sector</td>
          <td class="value">${sector}</td>
        </tr>
        <tr>
          <td class="label">Openings</td>
          <td class="value">${vacancies}</td>
        </tr>
        <tr>
          <td class="label">Location(s)</td>
          <td class="value">${locations}</td>
        </tr>
        <tr>
          <td class="label">Compensation</td>
          <td class="value">${salary}</td>
        </tr>
      </table>

      ${
        essentialCaps.length > 0
          ? `
      <div class="caps-box">
        <div class="caps-title">Target Capability Competencies:</div>
        <div>
          ${essentialCaps.map((c) => `<span class="cap-pill">✓ ${c}</span>`).join('')}
        </div>
      </div>
      `
          : ''
      }

      <div class="cta-container">
        <a href="${jobUrl}" class="cta-btn" target="_blank">
          View Opportunity & Express Interest →
        </a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 12px 0 0;">
        Under the VeerNXT Veteran Privacy Charter, your contact details remain private until you choose to connect.
      </p>
    </div>

    <div class="footer">
      You are receiving this notification because you subscribed to VeerNXT Civilian & Corporate Opportunities.<br>
      © ${new Date().getFullYear()} VeerNXT — Tri-Service Transition & Resettlement Platform. All rights reserved.
    </div>
  </div>
</body>
</html>
`.trim();

  return { subject, textContent, htmlContent };
}

/**
 * Broadcasts an approved job requirement email to all subscribed civil job candidates.
 * 
 * Implements strict privacy & limits:
 * - Uses BCC so candidates NEVER see each other's email addresses.
 * - Batches in groups of 40 recipients per message to respect Gmail's limits (well under 100/msg).
 * - Delays 500ms between batches to prevent SMTP rate-limiting.
 * - Records audit log in ps_notification_events.
 */
export async function broadcastJobApprovalEmail(supabaseAdmin, requirement) {
  const subscribers = await getCivilJobSubscribers(supabaseAdmin);

  if (!subscribers.length) {
    console.warn('[emailBroadcaster] No eligible candidate email subscribers found.');
    return { ok: false, reason: 'no_subscribers', count: 0 };
  }

  const { subject, textContent, htmlContent } = buildJobEmailTemplate(requirement);

  // Gmail SMTP credentials
  const { user: smtpUser, pass: smtpPass, from: smtpFrom } = getSmtpCredentials();

  // Check if SMTP is configured
  if (!smtpPass || smtpPass.length < 16) {
    console.warn('[emailBroadcaster] Incomplete SMTP password configured. Simulating broadcast.');
    await supabaseAdmin.from('ps_notification_events').insert({
      event_type: 'job_approved_broadcast',
      channel: 'email',
      subject,
      payload: {
        total_subscribers: subscribers.length,
        sample_emails: subscribers.slice(0, 5).map((s) => s.email),
        mode: 'simulated_incomplete_credentials',
      },
      related_requirement_id: requirement.id,
      recipient: `${subscribers.length} civil job subscribers`,
      recipient_count: subscribers.length,
      status: 'simulated',
    });
    return { ok: true, simulated: true, count: subscribers.length };
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  // Batch recipients in chunks of 40 (Gmail maximum is 100 per message)
  const BATCH_SIZE = 40;
  const batches = [];
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    batches.push(subscribers.slice(i, i + BATCH_SIZE).map((s) => s.email));
  }

  let totalSent = 0;
  let totalFailed = 0;
  const sendErrors = [];

  for (let i = 0; i < batches.length; i++) {
    const batchEmails = batches[i];
    try {
      // Send with To: sender address, and BCC: candidate batch
      // This protects all candidate emails from being exposed to one another
      await transporter.sendMail({
        from: smtpFrom,
        to: smtpFrom,
        bcc: batchEmails,
        subject,
        text: textContent,
        html: htmlContent,
      });

      totalSent += batchEmails.length;

      // Small delay between batches to respect rate limits
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    } catch (err) {
      console.error(`[emailBroadcaster] Error sending batch ${i + 1}:`, err);
      totalFailed += batchEmails.length;
      sendErrors.push(err.message || String(err));
    }
  }

  // Log broadcast event to ps_notification_events for audit
  const finalStatus = totalSent > 0 ? 'sent' : 'failed';
  await supabaseAdmin.from('ps_notification_events').insert({
    event_type: 'job_approved_broadcast',
    channel: 'email',
    subject,
    payload: {
      role: (requirement.role_titles || []).join(' / '),
      company: requirement.employer_profiles?.company_name,
      total_subscribers: subscribers.length,
      batches_count: batches.length,
      total_sent: totalSent,
      total_failed: totalFailed,
      errors: sendErrors.slice(0, 3),
    },
    related_requirement_id: requirement.id,
    recipient: `${subscribers.length} civil job subscribers`,
    recipient_count: subscribers.length,
    status: finalStatus,
  });

  return {
    ok: totalSent > 0,
    totalSubscribers: subscribers.length,
    totalSent,
    totalFailed,
    batches: batches.length,
    errors: sendErrors,
  };
}
