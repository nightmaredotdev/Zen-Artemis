// All user-visible Artemis strings outside preferences.json (English).
// Keyed by id so localization can be added later.
export const STRINGS = {
  "settings.search.placeholder": "Search Artemis settings",
  "settings.search.empty": "No settings match your search.",
  "settings.reset": "Reset to default",
  "settings.resetAll": "Reset all",
  "settings.resetAll.confirmTitle": "Reset all Artemis settings?",
  "settings.resetAll.confirmText": "Every Artemis setting returns to its default. A backup is saved first, so you can restore it later.",
  "settings.restore": "Restore backup",
  "settings.restore.none": "No backups yet",
  "settings.restore.confirmTitle": "Restore this backup?",
  "settings.restore.confirmText": "Your current Artemis settings are replaced by the backup. A backup of the current settings is saved first.",
  "settings.restore.done": "Backup restored.",
  "settings.tour": "Take the tour",
  "settings.inactive": "Turn on “{area}” to use this.",
  "settings.migrationNotice": "Some Artemis settings could not be carried over from an earlier version: {names}. They were left unchanged, and a backup was saved.",
  "backup.reason.before-reset-all": "Before reset",
  "backup.reason.before-restore": "Before restore",
  "backup.reason.manual": "Manual",
  "tour.skip": "Skip",
  "tour.back": "Back",
  "tour.next": "Next",
  "tour.finish": "Done",
  "tour.step": "{n} of {total}",
  "tour.welcome.title": "Welcome to Artemis",
  "tour.welcome.text": "A calm, glassy look for Zen. Pick a few basics now. Every choice can be changed later in Artemis's settings.",
  "tour.look.title": "Look",
  "tour.look.text": "How much the glass shows through, how soft its blur is, and how rounded things are.",
  "tour.tabs.title": "Sidebar and tabs",
  "tour.tabs.text": "Shape and height of tabs, and how workspaces are shown.",
  "tour.motion.title": "Motion",
  "tour.motion.text": "How lively Artemis animations feel. Your system's reduce-motion setting is always respected.",
  "tour.done.title": "All set",
  "tour.done.text": "Find every option, and this tour, in Sine's mod list under Artemis → Settings.",
};

export function t(id, vars = {}) {
  let s = STRINGS[id] ?? id;
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}
