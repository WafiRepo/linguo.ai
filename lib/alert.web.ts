import type { AlertButton } from "react-native";

// react-native-web's Alert.alert is empty, so on web "Sign out?", "Delete
// records?" and error messages never showed and their buttons never ran.
// This uses the browser's own dialogs with the same call shape.
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    const text = message ? `${title}\n\n${message}` : title;
    const choices = buttons ?? [];
    const cancel = choices.find((button) => button.style === "cancel");
    const action = choices.find((button) => button.style !== "cancel");

    // A question with a cancel and an action button: OK runs the action.
    if (cancel && action) {
      if (window.confirm(text)) action.onPress?.();
      else cancel.onPress?.();
      return;
    }
    // Just a message (with at most one button).
    window.alert(text);
    (action ?? cancel)?.onPress?.();
  },
};
