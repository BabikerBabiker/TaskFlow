import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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
import styles from "./components/styles";

export default function App() {
  const [task, setTask] = useState("");
  const [taskList, setTaskList] = useState([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedTaskForNotification, setSelectedTaskForNotification] =
    useState(null);
  const [showTaskInput, setShowTaskInput] = useState(true);
  const [editedTask, setEditedTask] = useState("");

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
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } =
        await Notifications.requestPermissionsAsync();
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
        const sortedTasks = sortTasks(updatedTasks);
        setTaskList(sortedTasks);
        saveTasks(sortedTasks);

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

  const isReminderPastDue = (reminderTime) => {
    if (!reminderTime) return false;
    return new Date(reminderTime) < new Date();
  };

  const loadTasks = async () => {
    try {
      const storedTasks = await AsyncStorage.getItem("tasks");
      if (storedTasks) {
        const parsedTasks = JSON.parse(storedTasks);
        setTaskList(sortTasks(parsedTasks));
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
    setEditingTaskId(null);
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
    return tasks.sort((a, b) => {
      if (!a.reminderTime && !b.reminderTime) {
        return a.completed - b.completed;
      }

      if (a.reminderTime && !b.reminderTime) {
        return -1;
      }

      if (!a.reminderTime && b.reminderTime) {
        return 1;
      }

      return new Date(a.reminderTime) - new Date(b.reminderTime);
    });
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
    const isPastDue = isReminderPastDue(reminderTime);

    return (
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        <View style={styles.taskContainer}>
          <TouchableOpacity
            onPress={() => toggleTaskComplete(item.id)}
            style={styles.circleContainer}
          >
            <View
              style={[styles.circle, item.completed && styles.circleCompleted]}
            />
          </TouchableOpacity>
          <View style={styles.taskInfoContainer}>
            {editingTaskId === item.id ? (
              <TextInput
                style={styles.taskTextInput}
                value={editedTask}
                onChangeText={(text) => setEditedTask(text)}
                onBlur={() => {
                  updateTask(item.id, editedTask);
                  setEditingTaskId(null);
                }}
                onSubmitEditing={() => {
                  updateTask(item.id, editedTask);
                  setEditingTaskId(null);
                }}
                autoFocus
              />
            ) : (
              <Text
                style={[
                  styles.taskText,
                  item.completed && styles.taskTextCompleted,
                ]}
                onPress={() => {
                  setEditingTaskId(item.id);
                  setEditedTask(item.task);
                }}
              >
                {item.task}
              </Text>
            )}
            {item.notificationSet && reminderTime && (
              <Text
                style={[
                  styles.reminderText,
                  isPastDue && styles.reminderTextPastDue,
                ]}
              >
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
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </GestureHandlerRootView>
  );
}
