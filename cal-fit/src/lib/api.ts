/**
 * Base URL for the app's own API routes (src/app/api).
 * On web the routes are same-origin, so relative paths work. Native builds have no origin,
 * so they need EXPO_PUBLIC_API_URL (e.g. http://192.168.1.20:8081 in development, or the
 * deployed server in production).
 */

import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export function apiUrl(path: string): string {
  if (API_URL) return `${API_URL}${path}`;
  if (Platform.OS !== 'web') {
    console.warn('EXPO_PUBLIC_API_URL is not set; API calls from native builds will fail.');
  }
  return path;
}
