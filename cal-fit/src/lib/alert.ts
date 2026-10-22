/**
 * Drop-in replacement for React Native's Alert.
 * Alert.alert is a no-op on react-native-web, so fall back to browser dialogs there.
 */

import { Alert as NativeAlert, AlertButton, Platform } from 'react-native';

function alert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    NativeAlert.alert(title, message, buttons);
    return;
  }

  const text = [title, message].filter(Boolean).join('\n\n');
  const cancel = buttons?.find(b => b.style === 'cancel');
  const confirm = buttons?.filter(b => b.style !== 'cancel').pop();

  if (buttons && buttons.length > 1 && confirm) {
    // window.confirm only offers OK/Cancel: OK runs the last non-cancel button.
    if (window.confirm(text)) {
      confirm.onPress?.();
    } else {
      cancel?.onPress?.();
    }
    return;
  }

  window.alert(text);
  buttons?.[0]?.onPress?.();
}

export const Alert = { alert };
