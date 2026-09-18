/**
 * /api/private-sector/router
 *
 * Single consolidated serverless function for the whole Private Sector
 * module — deliberately one file, not one per action: this repo is
 * already at 11/12 of Vercel Hobby's serverless-function cap (see
 * docs/status_report.md §36.3), so this is the one remaining slot.
 * Dispatch on req.body.action, same convention as api/auth/otp.js and
 * api/payments/actions.js.
 *
 * Auth model (see docs/private_sector_module_plan.md §2.6):
 *  - Candidate/employer actions verify the caller's Supabase session via
 *    `Authorization: Bearer <access_token>` and act as that verified user.
 *    (Reads of a user's own rows don't need this file at all — RLS
 *    self-read policies on the ps_* tables let the client read directly,
 *    same as EmployerOnboarding.jsx reads employer_profiles.)
 *  - Admin actions require the `x-admin-api-secret` header, matching
 *    api/admin/redemptions.js's existing pattern (the admin panel has no
 *    real Supabase Auth session — see AdminLogin.jsx).
 *  - Every WRITE in this module goes through here with the service-role
 *    client, bypassing RLS by design (no client-side write policy is
 *    defined on any ps_* table on purpose — matches sql/points_system.sql's
 *    "every write must go through server-side code" precedent) so that
 *    notification dispatch happens atomically with the data write.
 *
 * Actions:
 *   POST { action: 'save_profile', ... }              [candidate, bearer]
 *   POST { action: 'submit_verification', ... }        [candidate, bearer]
 *   POST { action: 'express_interest', requirement_id } [candidate, bearer]
 *   POST { action: 'submit_requirement', ... }          [employer, bearer]
 *   POST { action: 'admin_list_requirements', status? } [admin]
 *   POST { action: 'admin_update_requirement', id, status, hr_notes? } [admin]
 *   POST { action: 'admin_list_verifications', status? } [admin]
 *   POST { action: 'admin_update_verification', id, status, rejection_reason? } [admin]
 *   POST { action: 'admin_get_verification_url', id }   [admin]
 *   POST { action: 'admin_list_interest', requirement_id?, pipeline_status? } [admin]
 *   POST { action: 'admin_update_interest', id, pipeline_status, hr_notes? } [admin]
 *   POST { action: 'admin_list_senior_review' }         [admin]
 *   POST { action: 'admin_list_notifications' }         [admin]
 */

import { createClient } from '@supabase/supabase-js';
import Joi from 'joi';
import { broadcastJobApprovalEmail } from './emailBroadcaster.js';

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

function getSupabaseAnon() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // No bare SUPABASE_ANON_KEY is set in this project's env -- only the
  // VITE_-prefixed one (see .env). That prefix only controls what Vite
  // inlines into the client bundle; it's still a normal env var available
  // to serverless functions, so this falls back to it rather than failing.
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

// Verifies the caller's Supabase session from the Authorization header and
// returns the underlying user, or null. Uses the anon client's getUser()
// (validates the JWT against Supabase Auth), not a hand-rolled JWT decode.
async function requireUser(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const { data, error } = await getSupabaseAnon().auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

function requireAdmin(req) {
  const expectedSecret = process.env.ADMIN_API_SECRET;
  return !!expectedSecret && req.headers['x-admin-api-secret'] === expectedSecret;
}

function normalizeMobile(mobile) {
  if (!mobile) return null;
  const clean = String(mobile).replace(/[\s\-+]/g, '');
  if (clean.length === 10) return `91${clean}`;
  if (clean.startsWith('91') && clean.length === 12) return clean;
  return clean.length ? `91${clean}` : null;
}

// ── MSG91 WhatsApp sender ───────────────────────────────────────────────
// Every notification writes a ps_notification_events row regardless of
// whether the actual WhatsApp send succeeds -- the row IS the audit trail
// the admin "Notification log" tab reads. Follows the exact dev-mode
// fallback convention api/auth/otp.js already uses: if the WhatsApp-specific
// env vars aren't set, log + record as 'simulated' instead of throwing, so
// the rest of the module works before MSG91's WhatsApp Business API
// (separate integrated number + approved template from the existing SMS
// OTP setup) is actually provisioned.
//
// NOTE: MSG91's WhatsApp outbound-message payload shape has changed across
// API versions -- verify the exact field names below against the current
// MSG91 dashboard/Postman collection for this account before relying on
// this in production. Built for a single generic approved template with
// one body variable (the full message text) rather than 5 separate
// per-event templates, to avoid blocking Phase 1 on 5 separate WhatsApp
// template approvals -- upgrade to per-event templates once available.
async function sendWhatsAppNotification(supabaseAdmin, { eventType, subject, message, recipient, relatedRequirementId, relatedUserId, relatedInterestId }) {
  const payload = { subject, message };
  const insertRow = {
    event_type: eventType,
    channel: 'whatsapp',
    subject,
    payload,
    related_requirement_id: relatedRequirementId || null,
    related_user_id: relatedUserId || null,
    related_interest_id: relatedInterestId || null,
    recipient: recipient || null,
    status: 'pending',
  };

  const authKey = process.env.MSG91_AUTH_KEY;
  const integratedNumber = process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER;
  const templateName = process.env.MSG91_WHATSAPP_TEMPLATE_NAME;
  const isDev = !authKey || !integratedNumber || !templateName || !recipient;

  if (isDev) {
    console.warn(`[private-sector:notify] [SIMULATED] ${eventType} -> ${recipient || '(no recipient configured)'}: ${subject}`);
    const { data, error } = await supabaseAdmin
      .from('ps_notification_events')
      .insert({ ...insertRow, status: 'simulated' })
      .select('id')
      .single();
    if (error) console.error('[private-sector:notify] failed to log simulated event', error);
    return data?.id;
  }

  try {
    const res = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
      method: 'POST',
      headers: { authkey: authKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        integrated_number: integratedNumber,
        content_type: 'template',
        payload: {
          messaging_product: 'whatsapp',
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en', policy: 'deterministic' },
            to_and_components: [
              { to: [normalizeMobile(recipient)], components: { body_1: { type: 'text', value: `${subject}\n${message}` } } },
            ],
          },
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok;
    const { data: row, error } = await supabaseAdmin
      .from('ps_notification_events')
      .insert({ ...insertRow, status: ok ? 'sent' : 'failed', provider_response: JSON.stringify(data).slice(0, 2000), sent_at: ok ? new Date().toISOString() : null })
      .select('id')
      .single();
    if (error) console.error('[private-sector:notify] failed to log event', error);
    if (!ok) console.error('[private-sector:notify] MSG91 WhatsApp send failed', data);
    return row?.id;
  } catch (err) {
    console.error('[private-sector:notify] exception sending WhatsApp', err);
    const { data: row } = await supabaseAdmin
      .from('ps_notification_events')
      .insert({ ...insertRow, status: 'failed', provider_response: String(err).slice(0, 2000) })
      .select('id')
      .single();
    return row?.id;
  }
}

function hrRecipient() {
  return process.env.MSG91_WHATSAPP_HR_NUMBER || null;
}

// ── Candidate broadcast helper for approved jobs ─────────────────────────
async function getAllCandidateRecipients(supabaseAdmin) {
  const { data: profiles, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, full_name, email, raw_profile_data');
  if (error) {
    console.error('[private-sector:broadcast] error fetching candidate profiles', error);
    return [];
  }

  const recipientsMap = new Map();

  for (const p of (profiles || [])) {
    // Skip employer accounts
    if (p.email && p.email.includes('+employer@')) continue;

    let rawMobile = p.raw_profile_data?.mobile || p.raw_profile_data?.phone || null;
    if (!rawMobile && p.email) {
      const match = p.email.match(/^(\d{10,12})@veernxt\.in$/i);
      if (match) rawMobile = match[1];
    }

    const norm = normalizeMobile(rawMobile);
    // Must be valid Indian mobile 91 + 10 digits
    if (norm && /^91\d{10}$/.test(norm) && !recipientsMap.has(norm)) {
      const name = p.full_name || p.raw_profile_data?.fullName || 'Candidate';
      recipientsMap.set(norm, { mobile: norm, name, userId: p.id });
    }
  }

  return Array.from(recipientsMap.values());
}

async function broadcastJobApprovalNotification(supabaseAdmin, requirement) {
  const recipients = await getAllCandidateRecipients(supabaseAdmin);
  if (!recipients.length) {
    console.warn('[private-sector:broadcast] No candidate recipients found for broadcast');
    return { ok: false, reason: 'no_recipients' };
  }

  const role = (requirement.role_titles || []).join(', ') || 'New Position';
  const company = requirement.employer_profiles?.company_name || 'VeerNXT Partner';
  const location = (requirement.locations || []).join(', ') || 'Across India';
  const vacancies = requirement.quantity ? `${requirement.quantity} Openings` : 'Multiple Openings';
  const opportunitiesUrl = 'https://veernxt.in/private-sector/opportunities';
  const subject = `[VNXT-SMS-JOB-ALERT] ${role} at ${company} — ${location} (${recipients.length} recipients)`;

  const authKey = process.env.MSG91_AUTH_KEY;
  const flowId = process.env.MSG91_JOB_SMS_FLOW_ID || process.env.MSG91_JOB_ALERT_FLOW_ID || process.env.MSG91_SMS_FLOW_ID;
  const isDev = !authKey || !flowId;

  const insertRow = {
    event_type: 'job_approved_broadcast',
    channel: 'sms',
    subject,
    payload: {
      channel: 'sms',
      role,
      company,
      location,
      vacancies,
      url: opportunitiesUrl,
      total_recipients: recipients.length,
      sample_recipients: recipients.slice(0, 5).map((r) => r.mobile),
      mode: isDev ? 'simulated' : 'live',
    },
    related_requirement_id: requirement.id,
    recipient: `${recipients.length} candidates`,
    recipient_count: recipients.length,
    status: 'pending',
  };

  if (isDev) {
    console.warn(`[private-sector:broadcast:sms] [SIMULATED] SMS Broadcast to ${recipients.length} candidates: ${subject}`);
    const { data: row, error } = await supabaseAdmin
      .from('ps_notification_events')
      .insert({ ...insertRow, status: 'simulated' })
      .select('id')
      .single();
    if (error) console.error('[private-sector:broadcast:sms] failed to log simulated event', error);
    return { ok: true, simulated: true, count: recipients.length, eventId: row?.id };
  }

  // Chunk recipients in batches of 50 for MSG91 Flow API
  const BATCH_SIZE = 50;
  const batches = [];
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    batches.push(recipients.slice(i, i + BATCH_SIZE));
  }

  let totalSent = 0;
  let totalFailed = 0;
  const responses = [];

  for (const batch of batches) {
    try {
      const flowPayload = {
        template_id: flowId,
        recipients: batch.map((r) => ({
          mobiles: r.mobile,
          // Support named variables in MSG91 Flow
          role,
          company,
          location,
          vacancies,
          link: opportunitiesUrl,
          url: opportunitiesUrl,
          name: r.name || 'Candidate',
          // Support indexed variables in MSG91 Flow
          var1: role,
          var2: company,
          var3: location,
          var4: opportunitiesUrl,
          var5: vacancies,
        })),
      };

      const res = await fetch('https://control.msg91.com/api/v5/flow', {
        method: 'POST',
        headers: {
          authkey: authKey,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(flowPayload),
      });
      const data = await res.json().catch(() => ({}));
      responses.push(data);
      if (res.ok && data.type !== 'error') {
        totalSent += batch.length;
      } else {
        totalFailed += batch.length;
      }
    } catch (err) {
      console.error('[private-sector:broadcast:sms] batch send exception', err);
      totalFailed += batch.length;
      responses.push({ error: String(err) });
    }
  }

  const finalStatus = totalSent > 0 ? 'sent' : 'failed';
  const { data: row, error } = await supabaseAdmin
    .from('ps_notification_events')
    .insert({
      ...insertRow,
      status: finalStatus,
      provider_response: JSON.stringify(responses).slice(0, 2000),
      sent_at: totalSent > 0 ? new Date().toISOString() : null,
    })
    .select('id')
    .single();

  if (error) console.error('[private-sector:broadcast:sms] failed to log broadcast event', error);

  return {
    ok: totalSent > 0,
    sentCount: totalSent,
    failedCount: totalFailed,
    totalCount: recipients.length,
    eventId: row?.id,
  };
}

// ── Validation ───────────────────────────────────────────────────────────
const profileSchema = Joi.object({
  path: Joi.string().valid('operational', 'professional').required(),
  sectors: Joi.array().items(Joi.string()).default([]),
  work_types: Joi.array().items(Joi.string()).default([]),
  skills: Joi.array().items(Joi.string()).default([]),
  tags: Joi.array().items(Joi.string()).default([]),
  preferred_locations: Joi.array().items(Joi.object()).default([]),
  licences_qualifications: Joi.array().items(Joi.string()).default([]),
  availability: Joi.string().allow('', null),
  other_preferences: Joi.string().allow('', null),
  profile_completed: Joi.boolean().default(false),
  // Tri-Service Military Capability Fields
  service: Joi.string().allow('', null),
  service_category: Joi.string().allow('', null),
  branch: Joi.string().allow('', null),
  trade: Joi.string().allow('', null),
  rank: Joi.string().allow('', null),
  service_years: Joi.string().allow('', null),
  trade_proficiency: Joi.string().allow('', null),
  duties: Joi.array().items(Joi.string()).default([]),
  team_size_supervised: Joi.number().integer().min(0).default(0),
  highest_working_level: Joi.string().allow('', null),
  civil_licences: Joi.array().items(Joi.string()).default([]),
  consent_masked: Joi.boolean().default(true),
  consent_contact: Joi.boolean().default(true),
});

const verificationSchema = Joi.object({
  service_number: Joi.string().min(1).max(100).required(),
  document_path: Joi.string().min(1).required(),
});

const requirementSchema = Joi.object({
  sector: Joi.string().allow('', null),
  role_titles: Joi.array().items(Joi.string()).min(1).required(),
  tags: Joi.array().items(Joi.string()).default([]),
  quantity: Joi.number().integer().min(1).required(),
  locations: Joi.array().items(Joi.string()).min(1).required(),
  salary_range: Joi.string().allow('', null),
  description: Joi.string().allow('', null),
  jd_document_path: Joi.string().allow('', null),
  requirements_text: Joi.string().allow('', null),
  // Capability-Based Requirements Fields
  job_family: Joi.string().allow('', null),
  essential_capabilities: Joi.array().items(Joi.string()).default([]),
  desired_capabilities: Joi.array().items(Joi.string()).default([]),
  min_team_supervised: Joi.number().integer().min(0).default(0),
  required_licences: Joi.array().items(Joi.string()).default([]),
  experience_band: Joi.string().allow('', null),
  shift_pattern: Joi.string().allow('', null),
  bridge_training_available: Joi.boolean().default(false),
  relocation_support: Joi.boolean().default(false),
  service_preference: Joi.string().allow('', null),
}).or('description', 'jd_document_path');

// ── Candidate handlers ────────────────────────────────────────────────────
async function handleSaveProfile(req, res) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Not authenticated' });
  const { error: validationError, value } = profileSchema.validate(req.body, { stripUnknown: true });
  if (validationError) return res.status(400).json({ ok: false, error: validationError.message });

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('ps_candidate_profiles')
    .upsert({ user_id: user.id, ...value, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.status(200).json({ ok: true, profile: data });
}

async function handleSubmitVerification(req, res) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Not authenticated' });
  const { error: validationError, value } = verificationSchema.validate(req.body, { stripUnknown: true });
  if (validationError) return res.status(400).json({ ok: false, error: validationError.message });

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('ps_verifications')
    .insert({ user_id: user.id, ...value, status: 'pending' })
    .select('*')
    .single();
  if (error) return res.status(500).json({ ok: false, error: error.message });

  await sendWhatsAppNotification(supabaseAdmin, {
    eventType: 'candidate_verification_submitted',
    subject: `[VNXT-VERIFICATION] Candidate Verification Submitted — ${user.id.slice(0, 8)}`,
    message: `Service number ${value.service_number} submitted for review.`,
    recipient: hrRecipient(),
    relatedUserId: user.id,
  });

  return res.status(200).json({ ok: true, verification: data });
}

async function handleExpressInterest(req, res) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Not authenticated' });
  const { requirement_id } = req.body || {};
  if (!requirement_id) return res.status(400).json({ ok: false, error: 'requirement_id is required' });

  const supabaseAdmin = getSupabaseAdmin();

  // Defense in depth beyond the client-side profile-completion gate.
  const { data: profile } = await supabaseAdmin
    .from('ps_candidate_profiles').select('profile_completed').eq('user_id', user.id).maybeSingle();
  if (!profile?.profile_completed) {
    return res.status(403).json({ ok: false, error: 'Complete your Private Sector Profile first' });
  }

  const { data: requirement } = await supabaseAdmin
    .from('ps_job_requirements').select('id, role_titles, locations, status').eq('id', requirement_id).maybeSingle();
  if (!requirement || requirement.status !== 'approved') {
    return res.status(404).json({ ok: false, error: 'Opportunity not found or no longer open' });
  }

  const { data, error } = await supabaseAdmin
    .from('ps_candidate_interest')
    .insert({ requirement_id, user_id: user.id, pipeline_status: 'new' })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') return res.status(200).json({ ok: true, alreadyExpressed: true });
    return res.status(500).json({ ok: false, error: error.message });
  }

  await sendWhatsAppNotification(supabaseAdmin, {
    eventType: 'candidate_interest_expressed',
    subject: `[VNXT-INTEREST] Candidate Interested — ${(requirement.role_titles || []).join('/')} — ${(requirement.locations || []).join('/')} — VNXT-JOB-${requirement_id.slice(0, 8).toUpperCase()}`,
    message: `Candidate ${user.id.slice(0, 8)} expressed interest.`,
    recipient: hrRecipient(),
    relatedRequirementId: requirement_id,
    relatedUserId: user.id,
    relatedInterestId: data.id,
  });

  return res.status(200).json({ ok: true, interest: data });
}

// ── Employer handlers ─────────────────────────────────────────────────────
async function handleSubmitRequirement(req, res) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Not authenticated' });
  const { error: validationError, value } = requirementSchema.validate(req.body, { stripUnknown: true });
  if (validationError) return res.status(400).json({ ok: false, error: validationError.message });

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('ps_job_requirements')
    .insert({ employer_id: user.id, ...value, status: 'submitted' })
    .select('*')
    .single();
  if (error) return res.status(500).json({ ok: false, error: error.message });

  await sendWhatsAppNotification(supabaseAdmin, {
    eventType: 'employer_requirement_submitted',
    subject: `[VNXT-EMPLOYER] New Hiring Requirement — ${value.sector ? `[${value.sector}] ` : ''}${value.quantity} ${(value.role_titles || []).join('/')} — ${(value.locations || []).join('/')}`,
    message: `New requirement submitted by employer ${user.id.slice(0, 8)}. Sector: ${value.sector || 'General'}. Tags: ${(value.tags || []).join(', ') || 'None'}. VNXT-JOB-${data.id.slice(0, 8).toUpperCase()}`,
    recipient: hrRecipient(),
    relatedRequirementId: data.id,
    relatedUserId: user.id,
  });

  return res.status(200).json({ ok: true, requirement: data });
}

// ── Recruiter & Candidate Consent Handshake Handlers ──────────────────────
async function handleSendRecruiterRequest(req, res) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Not authenticated' });
  const { requirement_id, candidate_user_id, fit_score, match_reasons } = req.body || {};
  if (!requirement_id || !candidate_user_id) {
    return res.status(400).json({ ok: false, error: 'requirement_id and candidate_user_id are required' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  // Ensure requirement belongs to this employer
  const { data: requirement } = await supabaseAdmin
    .from('ps_job_requirements')
    .select('id, employer_id, role_titles, locations, employer_profiles(company_name)')
    .eq('id', requirement_id)
    .maybeSingle();

  if (!requirement || requirement.employer_id !== user.id) {
    return res.status(403).json({ ok: false, error: 'Requirement not found or unauthorized' });
  }

  const { data, error } = await supabaseAdmin
    .from('ps_recruiter_requests')
    .upsert(
      {
        requirement_id,
        employer_id: user.id,
        user_id: candidate_user_id,
        status: 'interest_sent',
        fit_score: fit_score || null,
        match_reasons: match_reasons || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'requirement_id,user_id' }
    )
    .select('*')
    .single();

  if (error) return res.status(500).json({ ok: false, error: error.message });

  // Notify candidate (fetch candidate mobile best-effort)
  const { data: candidateUser } = await supabaseAdmin
    .from('user_profiles')
    .select('raw_profile_data')
    .eq('id', candidate_user_id)
    .maybeSingle();

  const mobile = candidateUser?.raw_profile_data?.mobile;
  const companyName = requirement.employer_profiles?.company_name || 'A corporate partner';
  const roleTitle = (requirement.role_titles || []).join(', ') || 'Civilian Role';

  await sendWhatsAppNotification(supabaseAdmin, {
    eventType: 'candidate_interest_expressed',
    subject: `[VNXT-INTEREST-REQUEST] New Job Opportunity from ${companyName}`,
    message: `${companyName} has expressed interest in your profile for the role of ${roleTitle}. Log in to review the terms and accept or decline. Your contact details remain masked until you accept.`,
    recipient: mobile,
    relatedRequirementId: requirement_id,
    relatedUserId: candidate_user_id,
  });

  return res.status(200).json({ ok: true, request: data });
}

async function handleRespondRecruiterRequest(req, res) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Not authenticated' });
  const { request_id, decision } = req.body || {};
  if (!request_id || !['accepted', 'declined'].includes(decision)) {
    return res.status(400).json({ ok: false, error: 'request_id and valid decision (accepted/declined) are required' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('ps_recruiter_requests')
    .select('*, ps_job_requirements(role_titles, employer_profiles(company_name, contact_phone))')
    .eq('id', request_id)
    .maybeSingle();

  if (fetchErr || !existing || existing.user_id !== user.id) {
    return res.status(404).json({ ok: false, error: 'Request not found or unauthorized' });
  }

  const newStatus = decision === 'accepted' ? 'accepted' : 'declined';
  const unlockedAt = decision === 'accepted' ? new Date().toISOString() : null;

  const { data, error } = await supabaseAdmin
    .from('ps_recruiter_requests')
    .update({
      status: newStatus,
      unlocked_at: unlockedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request_id)
    .select('*')
    .single();

  if (error) return res.status(500).json({ ok: false, error: error.message });

  // If accepted, notify employer that candidate accepted introduction
  if (decision === 'accepted') {
    const employerMobile = existing.ps_job_requirements?.employer_profiles?.contact_phone;
    const roleTitle = (existing.ps_job_requirements?.role_titles || []).join(', ') || 'Role';
    await sendWhatsAppNotification(supabaseAdmin, {
      eventType: 'selection_offer_update',
      subject: `[VNXT-INTRO-ACCEPTED] Candidate Accepted Introduction for ${roleTitle}`,
      message: `A candidate has accepted your introduction for ${roleTitle}. Full profile and contact details are now unlocked on your employer dashboard.`,
      recipient: employerMobile,
      relatedRequirementId: existing.requirement_id,
      relatedUserId: user.id,
    });
  }

  return res.status(200).json({ ok: true, request: data });
}

async function handleGetRecruiterRequests(req, res) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Not authenticated' });
  const { mode, requirement_id } = req.body || {};
  const supabaseAdmin = getSupabaseAdmin();

  if (mode === 'candidate') {
    // Inbound requests for this veteran
    const { data, error } = await supabaseAdmin
      .from('ps_recruiter_requests')
      .select('*, ps_job_requirements(*, employer_profiles(company_name, industry))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, requests: data || [] });
  }

  // Employer mode: pipeline requests sent by this employer
  let query = supabaseAdmin
    .from('ps_recruiter_requests')
    .select('*, ps_job_requirements(role_titles, locations)')
    .eq('employer_id', user.id)
    .order('created_at', { ascending: false });

  if (requirement_id) {
    query = query.eq('requirement_id', requirement_id);
  }

  const { data: requests, error } = await query;
  if (error) return res.status(500).json({ ok: false, error: error.message });

  // Enrich with candidate details (unmasked only if status in accepted/interview/hired)
  const candidateUserIds = [...new Set((requests || []).map((r) => r.user_id))];
  let candidatesById = {};

  if (candidateUserIds.length) {
    const { data: cProfiles } = await supabaseAdmin
      .from('ps_candidate_profiles')
      .select('*')
      .in('user_id', candidateUserIds);

    const { data: uProfiles } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, raw_profile_data')
      .in('id', candidateUserIds);

    const uMap = Object.fromEntries((uProfiles || []).map((u) => [u.id, u]));

    cProfiles?.forEach((cp) => {
      const u = uMap[cp.user_id] || {};
      candidatesById[cp.user_id] = {
        ...cp,
        full_name: u.full_name || 'Verified Veteran',
        mobile: u.raw_profile_data?.mobile || null,
        email: u.raw_profile_data?.email || null,
      };
    });
  }

  const enriched = (requests || []).map((r) => {
    const c = candidatesById[r.user_id] || {};
    const isUnlocked = ['accepted', 'interview', 'hired'].includes(r.status);
    const maskedCode = `VN-${r.user_id.slice(0, 4).toUpperCase()}`;

    return {
      ...r,
      candidate: {
        id: r.user_id,
        maskedCode,
        name: isUnlocked ? c.full_name : `Candidate ${maskedCode}`,
        mobile: isUnlocked ? c.mobile : null,
        email: isUnlocked ? c.email : null,
        service: c.service || 'Indian Armed Forces',
        trade: c.trade || 'Specialist',
        rank: c.rank || 'Veteran',
        service_years: c.service_years || '4+ Years',
        team_size_supervised: c.team_size_supervised || 0,
        work_types: c.work_types || [],
        skills: c.skills || [],
        licences: c.licences_qualifications || [],
        preferred_locations: c.preferred_locations || [],
        availability: c.availability || 'Immediate',
        is_unlocked: isUnlocked,
      },
    };
  });

  return res.status(200).json({ ok: true, requests: enriched });
}

async function handleSearchMatchingCandidates(req, res) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Not authenticated' });
  const { requirement_id } = req.body || {};

  const supabaseAdmin = getSupabaseAdmin();
  let requirement = null;

  if (requirement_id) {
    const { data: reqData } = await supabaseAdmin
      .from('ps_job_requirements')
      .select('*')
      .eq('id', requirement_id)
      .maybeSingle();
    requirement = reqData;
  }

  // Fetch candidate profiles that have completed their profile
  const { data: candidates, error } = await supabaseAdmin
    .from('ps_candidate_profiles')
    .select('*')
    .eq('profile_completed', true)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ ok: false, error: error.message });

  // Check which candidates already have recruiter requests for this requirement
  let sentMap = new Set();
  if (requirement_id) {
    const { data: sentReqs } = await supabaseAdmin
      .from('ps_recruiter_requests')
      .select('user_id')
      .eq('requirement_id', requirement_id);
    sentMap = new Set((sentReqs || []).map((s) => s.user_id));
  }

  // Map candidates to masked profiles
  const mapped = (candidates || []).map((c) => {
    const maskedCode = `VN-${c.user_id.slice(0, 4).toUpperCase()}`;
    return {
      id: c.user_id,
      maskedCode,
      name: `Candidate ${maskedCode}`,
      service: c.service || 'Indian Armed Forces',
      branch: c.branch || 'Service',
      trade: c.trade || (c.work_types?.[0] ? c.work_types[0] : 'Specialist'),
      rank: c.rank || 'Veteran',
      service_years: c.service_years || '4+ Years',
      trade_proficiency: c.trade_proficiency || 'Class I',
      duties: c.duties || [],
      team_size_supervised: c.team_size_supervised || 0,
      highest_working_level: c.highest_working_level || 'Supervised',
      work_types: c.work_types || [],
      skills: c.skills || [],
      licences: c.licences_qualifications || [],
      preferred_locations: c.preferred_locations || [],
      availability: c.availability || 'Immediate',
      request_sent: sentMap.has(c.user_id),
      caps: c.work_types || [],
    };
  });

  return res.status(200).json({ ok: true, candidates: mapped, requirement });
}

// ── Admin handlers ─────────────────────────────────────────────────────────
async function handleAdminListRequirements(req, res) {
  const supabaseAdmin = getSupabaseAdmin();
  let query = supabaseAdmin.from('ps_job_requirements').select('*, employer_profiles(company_name, contact_name)').order('created_at', { ascending: false });
  if (req.body.status) query = query.eq('status', req.body.status);
  const { data, error } = await query;
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.status(200).json({ ok: true, requirements: data });
}

async function handleAdminUpdateRequirement(req, res) {
  const { id, status, hr_notes, notify_users } = req.body || {};
  if (!id || !status) return res.status(400).json({ ok: false, error: 'id and status are required' });
  const supabaseAdmin = getSupabaseAdmin();

  // Fetch existing requirement to verify previous status and employer details
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('ps_job_requirements')
    .select('*, employer_profiles(company_name)')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !existing) {
    return res.status(404).json({ ok: false, error: 'Requirement not found' });
  }

  const { data, error } = await supabaseAdmin
    .from('ps_job_requirements')
    .update({ status, hr_notes, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, employer_profiles(company_name)')
    .single();
  if (error) return res.status(500).json({ ok: false, error: error.message });

  let broadcastResult = null;
  let emailBroadcastResult = null;
  // Trigger broadcast if transitioning to approved from a non-approved state and not explicitly suppressed
  if (status === 'approved' && existing.status !== 'approved' && notify_users !== false) {
    broadcastResult = await broadcastJobApprovalNotification(supabaseAdmin, data);
    try {
      emailBroadcastResult = await broadcastJobApprovalEmail(supabaseAdmin, data);
    } catch (eErr) {
      console.error('[private-sector:broadcast:email] Error broadcasting email:', eErr);
      emailBroadcastResult = { ok: false, error: eErr.message };
    }
  }

  return res.status(200).json({ ok: true, requirement: data, broadcast: broadcastResult, emailBroadcast: emailBroadcastResult });
}

async function handleAdminListVerifications(req, res) {
  const supabaseAdmin = getSupabaseAdmin();
  let query = supabaseAdmin.from('ps_verifications').select('*').order('created_at', { ascending: false });
  if (req.body.status) query = query.eq('status', req.body.status);
  const { data, error } = await query;
  if (error) return res.status(500).json({ ok: false, error: error.message });

  // Enrich with candidate name/mobile from user_profiles (best-effort —
  // don't fail the whole list if a lookup is missing).
  const userIds = [...new Set((data || []).map((v) => v.user_id))];
  let profilesById = {};
  if (userIds.length) {
    const { data: profiles } = await supabaseAdmin.from('user_profiles').select('id, full_name, raw_profile_data').in('id', userIds);
    profilesById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  }
  const enriched = (data || []).map((v) => ({ ...v, candidate_name: profilesById[v.user_id]?.full_name || null }));
  return res.status(200).json({ ok: true, verifications: enriched });
}

async function handleAdminUpdateVerification(req, res) {
  const { id, status, rejection_reason } = req.body || {};
  if (!id || !status) return res.status(400).json({ ok: false, error: 'id and status are required' });
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('ps_verifications')
    .update({ status, rejection_reason: rejection_reason || null, reviewed_at: new Date().toISOString() })
    .eq('id', id).select('*').single();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.status(200).json({ ok: true, verification: data });
}

async function handleAdminGetVerificationUrl(req, res) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ ok: false, error: 'id is required' });
  const supabaseAdmin = getSupabaseAdmin();
  const { data: verification, error } = await supabaseAdmin.from('ps_verifications').select('document_path').eq('id', id).maybeSingle();
  if (error || !verification) return res.status(404).json({ ok: false, error: 'Verification not found' });
  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from('ps-verification-docs').createSignedUrl(verification.document_path, 600);
  if (signError) return res.status(500).json({ ok: false, error: signError.message });
  return res.status(200).json({ ok: true, url: signed.signedUrl });
}

// Requirement JD documents live in a separate bucket from candidate
// verification documents (see sql/private_sector.sql) — same signed-URL
// pattern, different source table/bucket.
async function handleAdminGetRequirementDocUrl(req, res) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ ok: false, error: 'id is required' });
  const supabaseAdmin = getSupabaseAdmin();
  const { data: requirement, error } = await supabaseAdmin.from('ps_job_requirements').select('jd_document_path').eq('id', id).maybeSingle();
  if (error || !requirement?.jd_document_path) return res.status(404).json({ ok: false, error: 'No document on this requirement' });
  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from('ps-job-documents').createSignedUrl(requirement.jd_document_path, 600);
  if (signError) return res.status(500).json({ ok: false, error: signError.message });
  return res.status(200).json({ ok: true, url: signed.signedUrl });
}

async function handleAdminListInterest(req, res) {
  const supabaseAdmin = getSupabaseAdmin();
  let query = supabaseAdmin.from('ps_candidate_interest').select('*, ps_job_requirements(role_titles, locations, quantity)').order('created_at', { ascending: false });
  if (req.body.requirement_id) query = query.eq('requirement_id', req.body.requirement_id);
  if (req.body.pipeline_status) query = query.eq('pipeline_status', req.body.pipeline_status);
  const { data, error } = await query;
  if (error) return res.status(500).json({ ok: false, error: error.message });

  const userIds = [...new Set((data || []).map((i) => i.user_id))];
  let profilesById = {};
  if (userIds.length) {
    const { data: profiles } = await supabaseAdmin.from('user_profiles').select('id, full_name, raw_profile_data').in('id', userIds);
    profilesById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  }
  const enriched = (data || []).map((i) => ({ ...i, candidate_name: profilesById[i.user_id]?.full_name || null }));
  return res.status(200).json({ ok: true, interest: enriched });
}

const NOTIFY_ON_PIPELINE_STATUS = {
  interview: { eventType: 'pipeline_status_changed', subject: '[VNXT-INTERVIEW] Interview Coordination', message: 'You have been shortlisted for an interview. Our HR team will contact you shortly with details.' },
  offer: { eventType: 'selection_offer_update', subject: '[VNXT-OFFER] Offer / Selection Update', message: 'Congratulations — an offer update is available. Our HR team will reach out with details.' },
  not_selected: { eventType: 'selection_offer_update', subject: '[VNXT-OFFER] Selection Update', message: "Thank you for your interest — this opportunity has moved forward with another candidate. We'll keep you in mind for future roles." },
  joined: { eventType: 'selection_offer_update', subject: '[VNXT-OFFER] Joining Confirmed', message: 'Your joining has been confirmed. Congratulations from the VeerNXT team!' },
};

async function handleAdminUpdateInterest(req, res) {
  const { id, pipeline_status, hr_notes } = req.body || {};
  if (!id || !pipeline_status) return res.status(400).json({ ok: false, error: 'id and pipeline_status are required' });
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('ps_candidate_interest')
    .update({ pipeline_status, hr_notes, updated_at: new Date().toISOString() })
    .eq('id', id).select('*').single();
  if (error) return res.status(500).json({ ok: false, error: error.message });

  // Interview/offer/joined/not_selected notify the CANDIDATE directly (per
  // docs/VeerNXT_Private_Sector_Implementation_Improvements.md §8 — "HR
  // moves candidate to interview -> relevant notification/workflow" reads
  // as candidate-directed, since HR itself is the one taking the action).
  const notifySpec = NOTIFY_ON_PIPELINE_STATUS[pipeline_status];
  if (notifySpec) {
    const { data: userProfile } = await supabaseAdmin.from('user_profiles').select('raw_profile_data').eq('id', data.user_id).maybeSingle();
    const mobile = userProfile?.raw_profile_data?.mobile;
    await sendWhatsAppNotification(supabaseAdmin, {
      eventType: notifySpec.eventType,
      subject: notifySpec.subject,
      message: notifySpec.message,
      recipient: mobile,
      relatedRequirementId: data.requirement_id,
      relatedUserId: data.user_id,
      relatedInterestId: data.id,
    });
  }

  return res.status(200).json({ ok: true, interest: data });
}

async function handleAdminListSeniorReview(req, res) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('ps_candidate_profiles').select('*').eq('path', 'professional').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ ok: false, error: error.message });

  const userIds = [...new Set((data || []).map((p) => p.user_id))];
  let profilesById = {};
  if (userIds.length) {
    const { data: profiles } = await supabaseAdmin.from('user_profiles').select('id, full_name, raw_profile_data').in('id', userIds);
    profilesById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  }
  const enriched = (data || []).map((p) => ({ ...p, candidate_name: profilesById[p.user_id]?.full_name || null, raw_profile: profilesById[p.user_id]?.raw_profile_data || null }));
  return res.status(200).json({ ok: true, profiles: enriched });
}

async function handleAdminListNotifications(req, res) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('ps_notification_events').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.status(200).json({ ok: true, events: data });
}

async function handleAdminBroadcastRequirementEmail(req, res) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ ok: false, error: 'id is required' });
  const supabaseAdmin = getSupabaseAdmin();
  const { data: requirement, error } = await supabaseAdmin
    .from('ps_job_requirements')
    .select('*, employer_profiles(company_name)')
    .eq('id', id)
    .maybeSingle();
  if (error || !requirement) return res.status(404).json({ ok: false, error: 'Requirement not found' });
  const emailBroadcastResult = await broadcastJobApprovalEmail(supabaseAdmin, requirement);
  return res.status(200).json({ ok: true, emailBroadcast: emailBroadcastResult });
}

const ADMIN_ACTIONS = {
  admin_list_requirements: handleAdminListRequirements,
  admin_update_requirement: handleAdminUpdateRequirement,
  admin_broadcast_requirement_email: handleAdminBroadcastRequirementEmail,
  admin_list_verifications: handleAdminListVerifications,
  admin_update_verification: handleAdminUpdateVerification,
  admin_get_verification_url: handleAdminGetVerificationUrl,
  admin_get_requirement_doc_url: handleAdminGetRequirementDocUrl,
  admin_list_interest: handleAdminListInterest,
  admin_update_interest: handleAdminUpdateInterest,
  admin_list_senior_review: handleAdminListSeniorReview,
  admin_list_notifications: handleAdminListNotifications,
};

const CANDIDATE_EMPLOYER_ACTIONS = {
  save_profile: handleSaveProfile,
  submit_verification: handleSubmitVerification,
  express_interest: handleExpressInterest,
  submit_requirement: handleSubmitRequirement,
  send_recruiter_request: handleSendRecruiterRequest,
  respond_recruiter_request: handleRespondRecruiterRequest,
  get_recruiter_requests: handleGetRecruiterRequests,
  search_matching_candidates: handleSearchMatchingCandidates,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { action } = req.body || {};
  if (!action) return res.status(400).json({ ok: false, error: 'action is required' });

  if (ADMIN_ACTIONS[action]) {
    if (!requireAdmin(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    try {
      return await ADMIN_ACTIONS[action](req, res);
    } catch (err) {
      console.error(`[private-sector] admin action '${action}' failed`, err);
      return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }

  if (CANDIDATE_EMPLOYER_ACTIONS[action]) {
    try {
      return await CANDIDATE_EMPLOYER_ACTIONS[action](req, res);
    } catch (err) {
      console.error(`[private-sector] action '${action}' failed`, err);
      return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }

  return res.status(400).json({ ok: false, error: `Unknown action: ${action}` });
}
