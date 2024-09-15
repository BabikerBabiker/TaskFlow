import AsyncStorage from "@react-native-async-storage/async-storage";
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
      { id: Date.now().toString(), task, completed: false },
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

  const renderItem = ({ item }) => (
    <Swipeable renderRightActions={() => renderRightActions(item.id)}>
      <TouchableOpacity onPress={() => openEditModal(item)}>
        <View style={styles.taskContainer}>
          <TouchableOpacity
            onPress={() => toggleTaskComplete(item.id)}
            style={styles.circleContainer}
          >
            <View
              style={[styles.circle, item.completed && styles.circleCompleted]}
            />
          </TouchableOpacity>
          <Text
            style={[
              styles.taskText,
              item.completed && styles.taskTextCompleted,
            ]}
          >
            {item.task}
          </Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

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
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter a task"
              value={task}
              onChangeText={setTask}
              onSubmitEditing={addTask}
              blurOnSubmit={false}
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.addButton} onPress={addTask}>
              <Text style={styles.addButtonText}>Add Task</Text>
            </TouchableOpacity>
          </View>

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
  taskContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#FFF",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 10,
    height: 60,
  },
  taskText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginRight: 10,
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
