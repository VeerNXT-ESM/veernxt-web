/**
 * adminFrom(table) -- write helper for the admin panel, shaped like supabase-js's query builder
 * (insert/update/upsert/delete + eq/in + select/single/maybeSingle, awaited to { data, error }).
 *
 * The catalogue tables (lc_exams, lc_exam_resource_map, ...) have RLS on with a public-read policy
 * only (sql/lc_tables_rls.sql), so the anon key cannot write them. Writes are posted to
 * /api/admin/content-writes (api/admin/misc.js, service role), gated by the shared admin secret.
 * Reads still use the normal `supabase` client.
 */
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_API_SECRET;

class AdminWrite {
  constructor(table) { this.table = table; this.op = null; this.values = undefined; this.options = {}; this.filters = []; this.selectCols = null; this.mode = 'many'; }
  insert(values) { this.op = 'insert'; this.values = values; return this; }
  update(values) { this.op = 'update'; this.values = values; return this; }
  upsert(values, options = {}) { this.op = 'upsert'; this.values = values; this.options = options; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(column, value) { this.filters.push({ type: 'eq', column, value }); return this; }
  neq(column, value) { this.filters.push({ type: 'neq', column, value }); return this; }
  in(column, value) { this.filters.push({ type: 'in', column, value: Array.from(value) }); return this; }
  select(cols = '*') { this.selectCols = cols; return this; }
  single() { this.mode = 'single'; if (!this.selectCols) this.selectCols = '*'; return this; }
  maybeSingle() { this.mode = 'maybe'; if (!this.selectCols) this.selectCols = '*'; return this; }

  async run() {
    try {
      const res = await fetch('/api/admin/content-writes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-api-secret': ADMIN_SECRET },
        body: JSON.stringify({ action: 'table-write', table: this.table, op: this.op, values: this.values, options: this.options, filters: this.filters, select: this.selectCols }),
      });
      const out = await res.json().catch(() => null);
      if (!res.ok || !out) {
        const e = out?.error;
        return { data: null, error: { message: (typeof e === 'string' ? e : e?.message) || `Write failed (${res.status})` } };
      }
      if (out.error) return { data: null, error: out.error };
      let data = out.data;
      if (this.mode !== 'many') {
        const rows = Array.isArray(data) ? data : data ? [data] : [];
        if (rows.length === 1) data = rows[0];
        else if (rows.length === 0 && this.mode === 'maybe') data = null;
        else return { data: null, error: { message: `Expected a single row, got ${rows.length}` } };
      }
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }
  then(resolve, reject) { return this.run().then(resolve, reject); }
}

export const adminFrom = (table) => new AdminWrite(table);
