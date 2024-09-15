import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import * as Permissions from "expo-permissions";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";

export default function App() {
  const [task, setTask] = useState("");
  const [taskList, setTaskList] = useState([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedTaskForNotification, setSelectedTaskForNotification] =
    useState(null);
  const [showTaskInput, setShowTaskInput] = useState(true);

  useEffect(() => {
    loadTasks();

    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  useEffect(() => {
    scheduleClearTasksAtMidnight();
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  const registerForPushNotificationsAsync = async () => {
    const { status } = await Permissions.getAsync(Permissions.NOTIFICATIONS);
    if (status !== "granted") {
      const { status: newStatus } = await Permissions.askAsync(
        Permissions.NOTIFICATIONS
      );
      if (newStatus !== "granted") {
        alert("You need to enable notifications for this app.");
      }
    }
  };

  const onTimeChange = (event, date) => {
    if (event.type === "set" && date) {
      setSelectedTime(date);
    } else {
      setShowTimePicker(false);
    }
  };

  const openTimePicker = (task) => {
    setSelectedTaskForNotification(task);
    setShowTaskInput(false);
    setShowTimePicker(true);
  };

  const scheduleNotification = async (task, date) => {
    try {
      const now = new Date();
      const timeUntilNotification = date.getTime() - now.getTime();

      if (timeUntilNotification > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Reminder",
            body: task.task,
          },
          trigger: {
            seconds: Math.floor(timeUntilNotification / 1000),
          },
        });

        const updatedTasks = taskList.map((t) =>
          t.id === task.id
            ? { ...t, notificationSet: true, reminderTime: date.toISOString() }
            : t
        );
        setTaskList(updatedTasks);
        saveTasks(updatedTasks);

        return Promise.resolve();
      } else {
        return Promise.reject(
          new Error("Selected time must be in the future.")
        );
      }
    } catch (error) {
      return Promise.reject(error);
    }
  };

  const loadTasks = async () => {
    try {
      const storedTasks = await AsyncStorage.getItem("tasks");
      if (storedTasks) {
        const parsedTasks = JSON.parse(storedTasks);
        setTaskList(parsedTasks);
      }
    } catch (e) {
      console.error("Failed to load tasks.");
    }
  };

  const saveTasks = async (tasks) => {
    try {
      await AsyncStorage.setItem("tasks", JSON.stringify(tasks));
    } catch (e) {
      console.error("Failed to save tasks.");
    }
  };

  const addTask = () => {
    if (!task.trim()) {
      Alert.alert("Please enter a task");
      return;
    }

    const newTaskList = [
      {
        id: Date.now().toString(),
        task,
        completed: false,
        notificationSet: false,
        reminderTime: null,
      },
      ...taskList,
    ];
    const sortedTaskList = sortTasks(newTaskList);
    setTaskList(sortedTaskList);
    saveTasks(sortedTaskList);
    setTask("");
  };

  const deleteTask = (id) => {
    const filteredTasks = taskList.filter((item) => item.id !== id);
    const sortedTaskList = sortTasks(filteredTasks);
    setTaskList(sortedTaskList);
    saveTasks(sortedTaskList);
  };

  const updateTask = (id, newTask) => {
    const updatedTasks = taskList.map((item) =>
      item.id === id ? { ...item, task: newTask } : item
    );
    const sortedTaskList = sortTasks(updatedTasks);
    setTaskList(sortedTaskList);
    saveTasks(sortedTaskList);
  };

  const toggleTaskComplete = (id) => {
    const updatedTasks = taskList.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    const sortedTaskList = sortTasks(updatedTasks);
    setTaskList(sortedTaskList);
    saveTasks(sortedTaskList);
  };

  const sortTasks = (tasks) => {
    return tasks.sort((a, b) => a.completed - b.completed);
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setModalVisible(true);
  };

  const renderRightActions = (id) => (
    <TouchableOpacity
      style={styles.deleteButtonContainer}
      onPress={() => deleteTask(id)}
    >
      <Text style={styles.deleteButtonText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => {
    const reminderTime = item.reminderTime ? new Date(item.reminderTime) : null;

    return (
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        <TouchableOpacity onPress={() => openEditModal(item)}>
          <View style={styles.taskContainer}>
            <TouchableOpacity
              onPress={() => toggleTaskComplete(item.id)}
              style={styles.circleContainer}
            >
              <View
                style={[
                  styles.circle,
                  item.completed && styles.circleCompleted,
                ]}
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
              onPress={() => openTimePicker(item)}
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

  const getFormattedDate = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${month}/${day}`;
  };

  const scheduleClearTasksAtMidnight = () => {
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0
    );

    const timeUntilMidnight = nextMidnight.getTime() - now.getTime();

    setTimeout(() => {
      clearTasks();
      scheduleClearTasksAtMidnight();
    }, timeUntilMidnight);
  };

  const clearTasks = () => {
    setTaskList([]);
    saveTasks([]);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <KeyboardAvoidingView
          style={[styles.container, { paddingBottom: keyboardHeight }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <StatusBar style="dark" />
          <Text style={styles.title}>To-Do {getFormattedDate()}</Text>
          <FlatList
            data={taskList}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.taskList}
          />

          {showTimePicker ? (
            <View style={styles.timePickerContainer}>
              <DateTimePicker
                mode="time"
                value={selectedTime}
                display="spinner"
                onChange={onTimeChange}
                style={styles.timePicker}
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  scheduleNotification(
                    selectedTaskForNotification,
                    selectedTime
                  )
                    .then(() => {
                      Alert.alert(
                        "Reminder Set",
                        "Your reminder has been set successfully."
                      );
                      setShowTimePicker(false);
                      setShowTaskInput(true);
                    })
                    .catch((error) => {
                      console.error("Error scheduling notification:", error);
                      Alert.alert(
                        "Error",
                        error.message ||
                          "There was an issue setting the reminder."
                      );
                    });
                }}
              >
                <Text style={styles.addButtonText}>Set Reminder</Text>
              </TouchableOpacity>
            </View>
          ) : (
            showTaskInput && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={task}
                  onChangeText={(text) => setTask(text)}
                  placeholder="Enter your task here..."
                />
                <TouchableOpacity style={styles.addButton} onPress={addTask}>
                  <Text style={styles.addButtonText}>Add Task</Text>
                </TouchableOpacity>
              </View>
            )
          )}

          <Modal
            visible={modalVisible}
            transparent={true}
            animationType="slide"
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Edit Task</Text>
                <TextInput
                  style={styles.modalInput}
                  value={selectedTask?.task}
                  onChangeText={(text) =>
                    setSelectedTask({ ...selectedTask, task: text })
                  }
                />
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={() => {
                    updateTask(selectedTask.id, selectedTask.task);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalSaveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
    lineHeight: 36,
  },
  taskList: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  inputContainer: {
    paddingHorizontal: 20,
    backgroundColor: "#F5F5F5",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#FFF",
    fontSize: 16,
    color: "#333",
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: "#4169e1",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 25,
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "500",
  },
  infoIcon: {
    marginLeft: "auto",
    marginRight: 10,
  },
  reminderText: {
    color: "orange",
    fontSize: 14,
    marginLeft: 10,
    marginRight: 10,
    flexWrap: "wrap",
    flexShrink: 1,
  },

  taskContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 15,
    backgroundColor: "#FFF",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 10,
  },
  taskInfoContainer: {
    flexDirection: "row",
    flex: 1,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },

  taskText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginRight: 10,
    flexWrap: "wrap",
  },
  taskTextCompleted: {
    textDecorationLine: "line-through",
    color: "#A9A9A9",
  },
  circleContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4169e1",
  },
  circleCompleted: {
    backgroundColor: "#4169e1",
  },
  deleteButtonContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 75,
    backgroundColor: "#FF6347",
    borderRadius: 10,
    marginVertical: 5,
    top: -5,
  },
  deleteButtonText: {
    color: "#FFF",
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    marginBottom: 250,
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#FFF",
    fontSize: 16,
    color: "#333",
    marginBottom: 10,
  },
  modalSaveButton: {
    backgroundColor: "#4169e1",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  modalSaveButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "500",
  },
});