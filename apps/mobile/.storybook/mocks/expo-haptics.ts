// Storybook web mock — haptics aren't available in the browser, so these
// resolve immediately to no-ops.
const noop = (): Promise<void> => Promise.resolve();

const impactAsync = noop;
const notificationAsync = noop;
const selectionAsync = noop;

const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
  Soft: 'soft',
  Rigid: 'rigid',
} as const;

const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
} as const;

export { impactAsync, notificationAsync, selectionAsync, ImpactFeedbackStyle, NotificationFeedbackType };
