import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import styles from "../styles";

const TaskItem = ({
  item,
  onEdit,
  onDelete,
  onToggleComplete,
  onOpenTimePicker,
}) => {
  const reminderTime = item.reminderTime ? new Date(item.reminderTime) : null;

  const renderRightActions = () => (
    <TouchableOpacity
      style={styles.deleteButtonContainer}
      onPress={() => onDelete(item.id)}
    >
      <Text style={styles.deleteButtonText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity onPress={() => onEdit(item)}>
        <View style={styles.taskContainer}>
          <TouchableOpacity
            onPress={() => onToggleComplete(item.id)}
            style={styles.circleContainer}
          >
            <View
              style={[styles.circle, item.completed && styles.circleCompleted]}
            />
          </TouchableOpacity>
          <View style={styles.taskInfoContainer}>
            <Text
              style={[
                styles.taskText,
                item.completed && styles.taskTextCompleted,
              ]}
            >
              {item.task}
            </Text>
            {item.notificationSet && reminderTime && (
              <Text style={styles.reminderText}>
                {reminderTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.infoIcon}
            onPress={() => onOpenTimePicker(item)}
          >
            <Ionicons
              name="information-circle-outline"
              size={24}
              color="blue"
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

export default TaskItem;
