import { colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
};

type NotificationsModalProps = {
  visible: boolean;
  notifications: AppNotification[];
  onClose: () => void;
  onMarkAllRead: () => void;
};

export function NotificationsModal({
  visible,
  notifications,
  onClose,
  onMarkAllRead,
}: NotificationsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>
            <View style={styles.headerActions}>
              {notifications.length > 0 ? (
                <TouchableOpacity
                  onPress={onMarkAllRead}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.markReadText}>Mark all read</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={colors.neutral.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons
                    name="notifications-off-outline"
                    size={28}
                    color={colors.neutral.textSecondary}
                  />
                </View>
                <Text style={styles.emptyTitle}>All caught up</Text>
                <Text style={styles.emptyMessage}>
                  New reminders about your streak and lessons will show up here.
                </Text>
              </View>
            ) : (
              notifications.map((item, index) => (
                <View key={item.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.item}>
                    <View
                      style={[
                        styles.itemIcon,
                        { backgroundColor: item.iconBg },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={item.iconColor}
                      />
                    </View>
                    <View style={styles.itemText}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemMessage}>{item.message}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 19, 40, 0.45)",
    justifyContent: "flex-start",
    paddingTop: 96,
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 20,
    maxHeight: "72%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
  },
  title: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 17,
    color: colors.neutral.textPrimary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  markReadText: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    color: colors.primary.blue,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.neutral.surface,
  },
  list: {
    maxHeight: 420,
  },
  listContent: {
    paddingBottom: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.neutral.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    color: colors.neutral.textPrimary,
    marginBottom: 4,
  },
  emptyMessage: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: colors.neutral.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: colors.neutral.textPrimary,
    marginBottom: 2,
  },
  itemMessage: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: colors.neutral.textSecondary,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.border,
    marginHorizontal: 18,
  },
});
