import { Href, router } from 'expo-router';

/**
 * Goes back, or to `fallback` when there's nothing to go back to (a screen opened from a
 * link or after a reload), where router.back() would do nothing.
 */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
