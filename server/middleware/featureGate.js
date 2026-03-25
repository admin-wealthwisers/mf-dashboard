/**
 * Feature gate middleware — controls access based on user tier.
 *
 * Tiers: free → trial (7 days) → pro (paid)
 *
 * Free: Dashboard, Explore, Scorecard (basic), Compare (2), Help
 * Trial: Everything for 7 days — 1 ECAS upload, 10 AI chats/day
 * Pro: Everything — unlimited ECAS, 20 AI chats/day
 */
import db from '../db.js';
import { isLaunchMode } from '../lib/appSettings.js';

const TRIAL_DURATION_DAYS = 7;
const TRIAL_ECAS_LIMIT = 1;
const TRIAL_CHAT_LIMIT = 10;
const PRO_CHAT_LIMIT = 20;

// Prepared statements
const getUser = db.prepare('SELECT * FROM users WHERE email = ?');
const updateTier = db.prepare('UPDATE users SET tier = ? WHERE email = ?');
const resetChatCount = db.prepare('UPDATE users SET chat_count_today = 0, chat_count_date = ? WHERE email = ?');
const incrementChat = db.prepare('UPDATE users SET chat_count_today = chat_count_today + 1 WHERE email = ?');
const incrementEcas = db.prepare('UPDATE users SET ecas_uploads_used = ecas_uploads_used + 1 WHERE email = ?');
const setTrialStart = db.prepare('UPDATE users SET tier = ?, trial_start = ? WHERE email = ? AND trial_start IS NULL');

/**
 * Get effective tier for a user (handles trial expiry)
 */
export function getEffectiveTier(email) {
  const user = getUser.get(email);
  if (!user) return { tier: 'free', user: null };

  // Admin always gets pro
  if (user.role === 'admin') return { tier: 'pro', user };

  // Check if trial has expired
  if (user.tier === 'trial' && user.trial_start) {
    const trialEnd = new Date(user.trial_start);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);
    if (new Date() > trialEnd) {
      // Trial expired → revert to free
      updateTier.run('free', email);
      return { tier: 'free', user: { ...user, tier: 'free' } };
    }
  }

  // Check if pro subscription has expired
  if (user.tier === 'pro' && user.subscription_end) {
    if (new Date() > new Date(user.subscription_end)) {
      updateTier.run('free', email);
      return { tier: 'free', user: { ...user, tier: 'free' } };
    }
  }

  return { tier: user.tier || 'free', user };
}

/**
 * Start a user's trial (called on first login or when they click "Start Trial")
 */
export function startTrial(email) {
  const today = new Date().toISOString().slice(0, 10);
  setTrialStart.run('trial', today, email);
}

/**
 * Get trial info for a user
 */
export function getTrialInfo(email) {
  const user = getUser.get(email);
  if (!user || !user.trial_start) return null;

  const trialEnd = new Date(user.trial_start);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);
  const daysLeft = Math.max(0, Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24)));

  return {
    started: user.trial_start,
    endsAt: trialEnd.toISOString().slice(0, 10),
    daysLeft,
    expired: daysLeft === 0,
    ecasUsed: user.ecas_uploads_used || 0,
    ecasLimit: TRIAL_ECAS_LIMIT,
  };
}

/**
 * Middleware: require a minimum tier to access a route
 */
export function requireTier(minTier) {
  const tierLevel = { free: 0, trial: 1, pro: 2 };

  return (req, res, next) => {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Launch mode: grant full access (skip tier checks)
    if (isLaunchMode()) {
      req.userTier = 'pro';
      return next();
    }

    const { tier } = getEffectiveTier(req.user.email);
    const required = tierLevel[minTier] || 0;
    const current = tierLevel[tier] || 0;

    if (current < required) {
      return res.status(403).json({
        error: 'Upgrade required',
        requiredTier: minTier,
        currentTier: tier,
        message: tier === 'free'
          ? 'Start your 7-day free trial to access this feature.'
          : 'Upgrade to Pro to continue using this feature.',
      });
    }

    req.userTier = tier;
    next();
  };
}

/**
 * Middleware: check and increment AI chat usage
 */
export function checkChatLimit(req, res, next) {
  if (!req.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Launch mode: allow unlimited chats (still track for analytics)
  if (isLaunchMode()) {
    incrementChat.run(req.user.email);
    req.userTier = 'pro';
    req.chatUsage = { used: 0, limit: 999 };
    return next();
  }

  const { tier, user } = getEffectiveTier(req.user.email);

  if (tier === 'free') {
    return res.status(403).json({
      error: 'Upgrade required',
      requiredTier: 'trial',
      currentTier: 'free',
      message: 'Start your 7-day free trial to use AI Chat.',
    });
  }

  // Reset daily count if it's a new day
  const today = new Date().toISOString().slice(0, 10);
  if (user.chat_count_date !== today) {
    resetChatCount.run(today, req.user.email);
    user.chat_count_today = 0;
  }

  const limit = tier === 'pro' ? PRO_CHAT_LIMIT : TRIAL_CHAT_LIMIT;
  if ((user.chat_count_today || 0) >= limit) {
    return res.status(429).json({
      error: 'Daily chat limit reached',
      limit,
      used: user.chat_count_today,
      message: tier === 'trial'
        ? `Trial allows ${TRIAL_CHAT_LIMIT} chats/day. Upgrade to Pro for ${PRO_CHAT_LIMIT}/day.`
        : `Pro plan allows ${PRO_CHAT_LIMIT} chats per day. Resets at midnight.`,
    });
  }

  // Increment usage after response is sent
  incrementChat.run(req.user.email);
  req.userTier = tier;
  req.chatUsage = { used: (user.chat_count_today || 0) + 1, limit };
  next();
}

/**
 * Middleware: check and increment ECAS upload usage
 */
export function checkEcasLimit(req, res, next) {
  if (!req.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Launch mode: ECAS is "Coming Soon"
  if (isLaunchMode()) {
    return res.status(503).json({
      error: 'Coming soon',
      message: 'ECAS portfolio import is coming soon. Stay tuned!',
    });
  }

  const { tier, user } = getEffectiveTier(req.user.email);

  if (tier === 'free') {
    return res.status(403).json({
      error: 'Upgrade required',
      requiredTier: 'trial',
      currentTier: 'free',
      message: 'Start your 7-day free trial to upload ECAS statements.',
    });
  }

  // Pro users have unlimited ECAS
  if (tier === 'pro') {
    req.userTier = tier;
    return next();
  }

  // Trial users: check limit
  if ((user.ecas_uploads_used || 0) >= TRIAL_ECAS_LIMIT) {
    return res.status(429).json({
      error: 'ECAS upload limit reached',
      limit: TRIAL_ECAS_LIMIT,
      used: user.ecas_uploads_used,
      message: `Trial allows ${TRIAL_ECAS_LIMIT} ECAS upload. Upgrade to Pro for unlimited.`,
    });
  }

  incrementEcas.run(req.user.email);
  req.userTier = tier;
  next();
}
