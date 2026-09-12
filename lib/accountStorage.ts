import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StateStorage } from "zustand/middleware";

// Pause writes while switching accounts so resetting memory cannot overwrite
// the next account's saved progress before it is hydrated.
let writable = false;
export function setAccountStorageWritable(value: boolean) {
  writable = value;
}
export const accountStorage: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: (name, value) => writable ? AsyncStorage.setItem(name, value) : Promise.resolve(),
  removeItem: (name) => writable ? AsyncStorage.removeItem(name) : Promise.resolve(),
};
