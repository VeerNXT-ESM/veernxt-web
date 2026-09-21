/**
 * /api/admin/legal-aid
 *
 * GET  → list all legal aid queries (newest first)
 * POST { action: 'send_email', id, to, extra_email, subject, body } → send email reply and update status
 * POST { action: 'update_status', id, status, admin_notes } → update query status/notes
 */

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { getSmtpCredentials } from '../_lib/emailBroadcaster.js';

function getSupabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function checkSecret(req, res) {
  const secret = req.headers['x-admin-api-secret'];
  if (secret !== process.env.ADMIN_API_SECRET) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return false;
  }
  return true;
}

async function handleList(req, res) {
  if (!checkSecret(req, res)) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ ok: false, error: 'Missing Supabase Admin keys' });

  try {
    const { data, error } = await supabase
      .from('legal_aid_queries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ ok: true, queries: data || [] });
  } catch (err) {
    console.error('[legal-aid] Error listing queries:', err);
    return res.status(500).json({ ok: false, error: 'Failed to fetch legal aid queries' });
  }
}

async function handleSendEmail(req, res) {
  if (!checkSecret(req, res)) return;

  const { id, to, extra_email, subject, body } = req.body || {};

  if (!to || !subject || !body) {
    return res.status(400).json({ ok: false, error: 'to, subject and body are required' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ ok: false, error: 'Missing Supabase Admin keys' });

  try {
    const { user: smtpUser, pass: smtpPass, from: smtpFrom } = getSmtpCredentials();

    if (!smtpPass || smtpPass.length < 16) {
      return res.status(500).json({ ok: false, error: 'SMTP credentials are not properly configured. Please check SMTP_PASS in .env' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const recipients = [to];
    if (extra_email && extra_email.trim() && extra_email.trim() !== to) {
      recipients.push(extra_email.trim());
    }

    // Build a clean HTML wrapper around the admin-typed body
    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .wrapper { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #0d1f0d 0%, #1F3A2E 100%); padding: 28px 24px; text-align: center; color: white; border-bottom: 4px solid #eab308; }
    .badge { display: inline-block; background: rgba(255,255,255,0.18); color: #fef08a; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 999px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.25); }
    .title { font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.01em; }
    .body { padding: 28px 24px; font-size: 14px; line-height: 1.75; color: #334155; white-space: pre-wrap; }
    .footer { background: #f1f5f9; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="badge">VeerNXT Legal Aid Cell</span>
      <h1 class="title">Response from VeerNXT Support Desk</h1>
    </div>
    <div class="body">${body.replace(/\n/g, '<br>')}</div>
    <div class="footer">
      VeerNXT Legal Aid Cell — Supporting Indian Armed Forces Veterans &amp; their families.<br>
      © ${new Date().getFullYear()} VeerNXT. All rights reserved.
    </div>
  </div>
</body>
</html>`.trim();

    await transporter.sendMail({
      from: smtpFrom,
      to: recipients.join(', '),
      subject,
      text: body,
      html: htmlBody,
    });

    // Update query status to 'responded'
    if (id) {
      await supabase
        .from('legal_aid_queries')
        .update({ status: 'responded' })
        .eq('id', id);
    }

    return res.status(200).json({ ok: true, message: `Email sent to ${recipients.join(', ')}` });
  } catch (err) {
    console.error('[legal-aid] Error sending email:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Failed to send email' });
  }
}

async function handleUpdateStatus(req, res) {
  if (!checkSecret(req, res)) return;

  const { id, status, admin_notes } = req.body || {};
  if (!id) return res.status(400).json({ ok: false, error: 'id is required' });

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ ok: false, error: 'Missing Supabase Admin keys' });

  try {
    const updates = {};
    if (status) updates.status = status;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;

    const { error } = await supabase
      .from('legal_aid_queries')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ ok: true, message: 'Query updated successfully' });
  } catch (err) {
    console.error('[legal-aid] Error updating query:', err);
    return res.status(500).json({ ok: false, error: 'Failed to update query' });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-api-secret');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') return handleList(req, res);

  if (req.method === 'POST') {
    const { action } = req.body || {};
    if (action === 'send_email') return handleSendEmail(req, res);
    if (action === 'update_status') return handleUpdateStatus(req, res);
    return res.status(400).json({ ok: false, error: "action must be 'send_email' or 'update_status'" });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
