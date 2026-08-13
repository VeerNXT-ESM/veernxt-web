import { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Trophy, Gift, Lock, CheckCircle, RefreshCw, Package } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Sheet from '../components/ui/Sheet';

const STATE_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// Semantic status colors from the design token scale — replaces the
// ad-hoc per-status hex values that used to live in the stylesheet below.
const STATUS_STYLES = {
  pending: { color: 'var(--warning)', background: 'var(--warning-bg)' },
  approved: { color: 'var(--warning)', background: 'var(--warning-bg)' },
  shipped: { color: 'var(--warning)', background: 'var(--warning-bg)' },
  delivered: { color: 'var(--success)', background: 'var(--success-bg)' },
  cancelled: { color: 'var(--danger)', background: 'var(--danger-bg)' },
};

const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--ios-text)',
  outline: 'none',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
};

const RedemptionModal = ({ reward, pointsBalance, prefill, onClose, onRedeemed }) => {
  const [size, setSize] = useState(reward.available_sizes?.[0] || '');
  const [shipping, setShipping] = useState({
    name: prefill.name || '',
    phone: prefill.phone || '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setShipping(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await axios.post('/api/rewards/redeem', {
        reward_id: reward.id,
        size: reward.requires_size ? size : null,
        shipping,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.data.ok) throw new Error(res.data.error || 'Redemption failed');
      onRedeemed(res.data.points_balance);
    } catch (err) {
      const code = err.response?.data?.error;
      const messages = {
        INSUFFICIENT_POINTS: "You don't have enough points for this reward.",
        OUT_OF_STOCK: 'This reward just went out of stock.',
        REWARD_INACTIVE: 'This reward is no longer available.',
      };
      setError(messages[code] || err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const sizeOptions = (reward.available_sizes || []).map(s => ({ value: s, label: s }));

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Redeem ${reward.name}`}
      footer={(
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <RefreshCw className="rewards-animate-spin" size={14} /> : <Gift size={14} />}
            {submitting ? 'Redeeming…' : 'Confirm Redemption'}
          </Button>
        </>
      )}
    >
      <p className="rewards-modal-cost">
        <Trophy size={16} /> {reward.points_cost.toLocaleString()} points — you have {pointsBalance.toLocaleString()}
      </p>

      {reward.requires_size && (
        <div className="rewards-field">
          <label>Size</label>
          <Select
            options={sizeOptions}
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="Select a size"
          />
        </div>
      )}

      <div className="rewards-field">
        <label>Full Name</label>
        <input style={inputStyle} name="name" value={shipping.name} onChange={handleChange} required />
      </div>
      <div className="rewards-field">
        <label>Phone</label>
        <input style={inputStyle} name="phone" value={shipping.phone} onChange={handleChange} required />
      </div>
      <div className="rewards-field">
        <label>Address Line 1</label>
        <input style={inputStyle} name="line1" value={shipping.line1} onChange={handleChange} required />
      </div>
      <div className="rewards-field">
        <label>Address Line 2 (optional)</label>
        <input style={inputStyle} name="line2" value={shipping.line2} onChange={handleChange} />
      </div>
      <div className="rewards-field-row">
        <div className="rewards-field">
          <label>City</label>
          <input style={inputStyle} name="city" value={shipping.city} onChange={handleChange} required />
        </div>
        <div className="rewards-field">
          <label>State</label>
          <input style={inputStyle} name="state" value={shipping.state} onChange={handleChange} required />
        </div>
        <div className="rewards-field">
          <label>Pincode</label>
          <input style={inputStyle} name="pincode" value={shipping.pincode} onChange={handleChange} required />
        </div>
      </div>

      {error && <p className="rewards-modal-error">{error}</p>}
    </Sheet>
  );
};

const RewardsCenter = () => {
  const [loading, setLoading] = useState(true);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [activeReward, setActiveReward] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Pure fetch, no setState — kept separate so the mount effect below can
  // apply the results in its own inline closure (avoids react-hooks/
  // set-state-in-effect, which flags a *named* function reference that
  // transitively calls setState, but not an effect-local closure).
  const fetchRewardsData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const result = { profile: null, pointsBalance: null, redemptions: null, rewards: [] };

    if (session?.user) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('full_name, mobile, points_balance')
        .eq('id', session.user.id)
        .maybeSingle();
      if (userProfile) {
        result.pointsBalance = userProfile.points_balance || 0;
        result.profile = { name: userProfile.full_name || '', phone: userProfile.mobile || '' };
      }

      const { data: redemptionRows } = await supabase
        .from('reward_redemptions')
        .select('*, rewards(name, image_url)')
        .eq('user_id', session.user.id)
        .order('requested_at', { ascending: false });
      result.redemptions = redemptionRows || [];
    }

    const { data: rewardRows } = await supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    result.rewards = rewardRows || [];

    return result;
  };

  const applyRewardsData = (data) => {
    if (data.profile) setProfile(data.profile);
    if (data.pointsBalance != null) setPointsBalance(data.pointsBalance);
    if (data.redemptions) setRedemptions(data.redemptions);
    setRewards(data.rewards);
  };

  useEffect(() => {
    (async () => {
      try {
        applyRewardsData(await fetchRewardsData());
      } catch (err) {
        console.error('Error loading rewards center:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRedeemed = async (newBalance) => {
    setActiveReward(null);
    setSuccessMessage('Redemption request placed! We’ll notify you once it ships.');
    if (newBalance != null) setPointsBalance(newBalance);
    try {
      applyRewardsData(await fetchRewardsData());
    } catch (err) {
      console.error('Error refreshing rewards center:', err);
    }
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  if (loading) {
    return (
      <div className="rewards-loading">
        <RefreshCw className="rewards-animate-spin" size={28} color="var(--ios-olive)" />
      </div>
    );
  }

  return (
    <div className="rewards-wrapper">
      <div className="rewards-hero">
        <div>
          <h1>Rewards Center</h1>
          <p>Redeem the points you&apos;ve earned across VeerNXT for real rewards.</p>
        </div>
        <div className="rewards-balance-card">
          <Trophy size={22} />
          <div>
            <span className="rewards-balance-number">{pointsBalance.toLocaleString()}</span>
            <span className="rewards-balance-label">points available</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="rewards-success-banner"
          >
            <CheckCircle size={16} /> {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rewards-catalog-grid">
        {rewards.map((reward, i) => {
          const canAfford = pointsBalance >= reward.points_cost;
          const outOfStock = reward.stock_quantity != null && reward.stock_quantity <= 0;
          return (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.05, ease: 'easeOut' }}
            >
              <Card interactive className="rewards-catalog-card">
                <div className="rewards-catalog-image">
                  {reward.image_url ? <img src={reward.image_url} alt={reward.name} /> : <Gift size={32} color="var(--ios-olive)" />}
                </div>
                <h3>{reward.name}</h3>
                <p className="rewards-catalog-desc">{reward.description}</p>
                <div className="rewards-catalog-footer">
                  <span className="rewards-catalog-cost"><Trophy size={14} /> {reward.points_cost.toLocaleString()} pts</span>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={!canAfford || outOfStock}
                    onClick={() => setActiveReward(reward)}
                  >
                    {outOfStock ? 'Out of Stock' : canAfford ? 'Redeem' : <><Lock size={12} /> Need More Points</>}
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
        {rewards.length === 0 && (
          <p className="rewards-empty">No rewards available right now — check back soon.</p>
        )}
      </div>

      {redemptions.length > 0 && (
        <Card className="rewards-history-card">
          <div className="card-top">
            <Package size={20} color="var(--ios-olive)" />
            <h2 className="rewards-history-title">Your Redemptions</h2>
          </div>
          <div className="rewards-history-list">
            {redemptions.map(r => {
              const statusStyle = STATUS_STYLES[r.status] || { color: 'var(--text-secondary)', background: 'var(--surface-alt)' };
              return (
                <div key={r.id} className="rewards-history-item">
                  <span className="rewards-history-name">{r.rewards?.name || 'Reward'}</span>
                  <span
                    className="rewards-status-badge"
                    style={{ color: statusStyle.color, background: statusStyle.background }}
                  >
                    {STATE_LABELS[r.status] || r.status}
                  </span>
                  <span className="rewards-history-date">{new Date(r.requested_at).toLocaleDateString()}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {activeReward && (
        <RedemptionModal
          reward={activeReward}
          pointsBalance={pointsBalance}
          prefill={profile}
          onClose={() => setActiveReward(null)}
          onRedeemed={handleRedeemed}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .rewards-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 64px);
        }
        .rewards-wrapper {
          padding: 3rem 1.5rem;
          max-width: 1100px;
          margin: 0 auto;
        }
        .rewards-hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .rewards-hero h1 { font-size: 2rem; margin-bottom: 0.35rem; }
        .rewards-hero p { color: #777; font-size: 1rem; }
        .rewards-balance-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--ios-olive);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-2);
        }
        .rewards-balance-number { display: block; font-size: 1.4rem; font-weight: 800; }
        .rewards-balance-label { display: block; font-size: 0.72rem; opacity: 0.85; }
        .rewards-success-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--success-bg);
          color: var(--success);
          border: 1px solid var(--border);
          padding: 0.85rem 1.25rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }
        .rewards-catalog-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .rewards-catalog-card {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .rewards-catalog-image {
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface-alt);
          border-radius: var(--radius-sm);
          margin-bottom: 1rem;
          overflow: hidden;
        }
        .rewards-catalog-image img { width: 100%; height: 100%; object-fit: cover; }
        .rewards-catalog-card h3 { font-size: 1.05rem; margin-bottom: 0.4rem; }
        .rewards-catalog-desc {
          font-size: 0.85rem;
          color: #777;
          flex: 1;
          margin-bottom: 1rem;
          line-height: 1.5;
        }
        .rewards-catalog-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }
        .rewards-catalog-cost {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--ios-olive);
        }
        .rewards-empty { color: #999; grid-column: 1 / -1; text-align: center; padding: 2rem; }
        .rewards-history-card {}
        .rewards-history-title { font-size: 1.1rem; margin: 0; }
        .card-top {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 1rem;
        }
        .rewards-history-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .rewards-history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: var(--surface-alt);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
        }
        .rewards-history-name { font-weight: 600; flex: 1; }
        .rewards-history-date { color: #999; font-size: 0.78rem; }
        .rewards-status-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.25rem 0.65rem;
          border-radius: var(--radius-pill);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .rewards-modal-cost {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.85rem;
          color: var(--ios-olive);
          font-weight: 700;
          margin-bottom: 1.25rem;
        }
        .rewards-field { margin-bottom: 0.9rem; }
        .rewards-field label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          color: #475569;
          margin-bottom: 0.35rem;
        }
        .rewards-field-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.75rem;
        }
        .rewards-modal-error {
          background: var(--danger-bg);
          color: var(--danger);
          border: 1px solid var(--border);
          padding: 0.6rem 0.85rem;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          margin-bottom: 1rem;
        }
        .rewards-animate-spin { animation: rewards-spin 1s linear infinite; }
        @keyframes rewards-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 600px) {
          .rewards-field-row { grid-template-columns: 1fr; }
        }
      `}} />
    </div>
  );
};

export default RewardsCenter;
