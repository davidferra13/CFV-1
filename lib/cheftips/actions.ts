// Re-export from canonical location (lib/chef/knowledge/tip-actions)
// This module exists for backwards compatibility with agent-actions imports.

export {
  addChefTip,
  createChefTip,
  getChefTips,
  updateChefTip,
  deleteChefTip,
  getRecentTips,
  getTodaysTips,
  getChefTipStats,
  getRandomPastTip,
  getMonthlyTipCounts,
  getTopTags,
  getOnThisDayTips,
  exportTipsAsMarkdown,
  pinChefTip,
  setChefTipReview,
  shareChefTip,
  promoteTipToNote,
} from '@/lib/chef/knowledge/tip-actions'
