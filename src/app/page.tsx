"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import TaskList from "@/components/TaskList";
import SupportPanel from "@/components/SupportPanel";
import ChatPanel from "@/components/ChatPanel";
import CalendarView from "@/components/CalendarView";
import { Task, Subtask } from "@/components/TaskList";
import EditTaskModal from "@/components/EditTaskModal"; // Import the modal

// Define a key for local storage
const LOCAL_STORAGE_KEY = "tasksAppData";
const EXPANDED_TASKS_LOCAL_STORAGE_KEY = "expandedTaskIds_tasksAppData"; // New key

// Initial tasks data - this will now be managed in this component
const initialTasks: Task[] = [
	{
		id: "1",
		title: "Project Alpha Kickoff",
		description: "Plan and initiate Project Alpha.",
		priority: "High", // Updated priority
		status: "needsAction", // Updated status from "Pending"
		progress: 0,
		createdDate: "2023-01-10",
		dueDate: "2023-02-28",
		tags: ["project", "planning", "alpha"],
		subtasks: [
			{ 
				id: "s1-1", 
				title: "Define project scope", 
				description: "Define project scope",
				completed: false, 
				priority: "high",
				expected_work_load: 4,
				planned_start_time: "2023-01-18T09:00:00Z",
				planned_finish_time: "2023-01-18T17:00:00Z"
			},
			{ 
				id: "s1-2", 
				title: "Assemble project team", 
				description: "Assemble project team",
				completed: false, 
				priority: "medium",
				expected_work_load: 2,
				planned_start_time: "2023-01-19T09:00:00Z",
				planned_finish_time: "2023-01-19T13:00:00Z"
			},
		],
	},
	{
		id: "2",
		title: "Develop Feature X",
		description: "Complete the development of Feature X for the new module.",
		priority: "Medium", // Updated priority
		status: "needsAction", // Updated status from "In Progress"
		tags: ["development", "feature"],
		progress: 33,
		createdDate: "2025-05-10",
		subtasks: [
			{ 
				id: "2.1", 
				title: "Design database schema", 
				description: "Design database schema",
				completed: true, 
				priority: "high",
				expected_work_load: 6,
				planned_start_time: "2025-05-15T09:00:00Z",
				planned_finish_time: "2025-05-16T17:00:00Z"
			},
			{ 
				id: "2.2", 
				title: "Implement API endpoints", 
				description: "Implement API endpoints",
				completed: false, 
				priority: "medium",
				expected_work_load: 8,
				planned_start_time: "2025-05-17T09:00:00Z",
				planned_finish_time: "2025-05-19T17:00:00Z"
			},
			{ 
				id: "2.3", 
				title: "Write unit tests", 
				description: "Write unit tests",
				completed: false, 
				priority: "medium",
				expected_work_load: 4,
				planned_start_time: "2025-05-20T09:00:00Z",
				planned_finish_time: "2025-05-21T17:00:00Z"
			},
		],
	},
	{
		id: "3",
		title: "User Testing Phase 1",
		description: "Conduct first round of user testing and gather feedback.",
		priority: "High", // Updated priority
		status: "needsAction", // Updated status from "Pending"
		tags: ["testing", "feedback"],
		progress: 0,
		dueDate: "2025-06-01",
		createdDate: "2025-05-15",
		subtasks: [],
	},
	{
		id: "4",
		title: "Marketing Campaign Launch",
		description: "Prepare and launch the new marketing campaign.",
		priority: "Medium", // Updated priority
		status: "needsAction", // Updated status from "Pending"
		tags: ["marketing", "launch"],
		progress: 0,
		createdDate: "2025-05-12",
		subtasks: [
			{ 
				id: "4.1", 
				title: "Draft campaign brief", 
				description: "Draft campaign brief",
				completed: false, 
				priority: "high",
				expected_work_load: 3,
				planned_start_time: "2025-05-22T09:00:00Z",
				planned_finish_time: "2025-05-22T17:00:00Z"
			},
			{ 
				id: "4.2", 
				title: "Create ad visuals", 
				description: "Create ad visuals",
				completed: false, 
				priority: "high",
				expected_work_load: 6,
				planned_start_time: "2025-05-23T09:00:00Z",
				planned_finish_time: "2025-05-24T17:00:00Z"
			},
			{ 
				id: "4.3", 
				title: "Schedule social media posts", 
				description: "Schedule social media posts",
				completed: false, 
				priority: "medium",
				expected_work_load: 2,
				planned_start_time: "2025-05-25T09:00:00Z",
				planned_finish_time: "2025-05-25T13:00:00Z"
			},
		],
	},
];

export default function Home() {
	// Initialize state with initialTasks for SSR and first client render
	const [tasks, setTasks] = useState<Task[]>(initialTasks);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
	const [hasMounted, setHasMounted] = useState(false);
	const [activeTab, setActiveTab] = useState<'todo' | 'calendar'>('todo');
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]); // State for expanded task IDs

	// Set hasMounted to true only on the client-side after initial render
	useEffect(() => {
		setHasMounted(true);
	}, []);

	// Effect to load tasks and expanded state from local storage once the component has mounted
	useEffect(() => {
		if (hasMounted) {
			const storedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);
			if (storedTasks) {
				try {
					const parsedTasks: Task[] = JSON.parse(storedTasks);
					setTasks(parsedTasks);
				} catch (error) {
					console.error("Error parsing tasks from local storage:", error);
					// localStorage.removeItem(LOCAL_STORAGE_KEY); // Optionally clear corrupted data
				}
			}

      const storedExpandedIds = localStorage.getItem(EXPANDED_TASKS_LOCAL_STORAGE_KEY);
      if (storedExpandedIds) {
        try {
          const parsedExpandedIds: string[] = JSON.parse(storedExpandedIds);
          setExpandedTaskIds(parsedExpandedIds);
        } catch (error) {
          console.error("Error parsing expanded task IDs from local storage:", error);
        }
      }
		}
	}, [hasMounted]);

	// Effect to save tasks to local storage whenever they change, but only if mounted
	useEffect(() => {
		if (hasMounted) {
			localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
		}
	}, [tasks, hasMounted]); // Depend on tasks and hasMounted

  // Effect to save expanded task IDs to local storage whenever they change, but only if mounted
  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem(EXPANDED_TASKS_LOCAL_STORAGE_KEY, JSON.stringify(expandedTaskIds));
    }
  }, [expandedTaskIds, hasMounted]);

	// Function to handle opening the edit modal
	const handleOpenEditModal = (taskId: string) => {
		const task = tasks.find((t: Task) => t.id === taskId);
		if (task) {
			setTaskToEdit(task);
			setIsEditModalOpen(true);
		}
	};

	// Function to handle closing the edit modal
	const handleCloseEditModal = () => {
		setIsEditModalOpen(false);
		setTaskToEdit(null);
	};

	// Function to handle saving an edited task
	const handleSaveTask = (updatedTask: Task) => {
		setTasks((prevTasks: Task[]) =>
			prevTasks.map((task: Task) => (task.id === updatedTask.id ? updatedTask : task))
		);
		setIsEditModalOpen(false); // Close modal after saving
	};

	// Function to handle deleting a task
	const handleDeleteTask = (taskId: string) => {
		setTasks((prevTasks: Task[]) => prevTasks.filter((task: Task) => task.id !== taskId));
    // Also remove from expandedTaskIds if it was expanded
    setExpandedTaskIds((prevIds: string[]) => prevIds.filter((id: string) => id !== taskId));
	};

  // Function to toggle task expansion
  const handleToggleTaskExpansion = (taskId: string) => {
    setExpandedTaskIds((prevIds: string[]) =>
      prevIds.includes(taskId)
        ? prevIds.filter((id: string) => id !== taskId)
        : [...prevIds, taskId]
    );
  };

	// Function to toggle the completion status of a subtask
	const toggleSubtaskCompletion = (taskId: string, subtaskId: string) => {
		setTasks((prevTasks: Task[]) =>
			prevTasks.map((task: Task) => {
				if (task.id === taskId && task.subtasks) {
					const updatedSubtasks = task.subtasks.map((subtask: Subtask) =>
						subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
					);
					const allSubtasksCompleted = updatedSubtasks.every((st: Subtask) => st.completed);
					return {
						...task,
						subtasks: updatedSubtasks,
						status: allSubtasksCompleted ? "completed" : task.status === "completed" ? "needsAction" : task.status,
            progress: allSubtasksCompleted ? 100 : Math.round(updatedSubtasks.filter((st: Subtask) => st.completed).length / updatedSubtasks.length * 100),
					};
				}
				return task;
			})
		);
	};

	// Function to toggle the completion status of a main task
	const toggleTaskCompletion = (taskId: string) => {
    setTasks((prevTasks: Task[]) =>
      prevTasks.map((task: Task) => {
        if (task.id === taskId) {
          const newStatus = task.status === "completed" ? "needsAction" : "completed";
          const newProgress = newStatus === "completed" ? 100 : 0;
          let updatedSubtasks = task.subtasks;
          if (newStatus === "completed" && task.subtasks) {
            updatedSubtasks = task.subtasks.map((st: Subtask) => ({ ...st, completed: true }));
          }

          return {
            ...task,
            status: newStatus,
            progress: newProgress,
            subtasks: updatedSubtasks,
          };
        }
        return task;
      })
    );
	};

	return (
		<div className="flex flex-col h-screen bg-gray-100">
			<Header />
			<main className="flex flex-1 p-6 space-x-6 overflow-y-auto">
				<div className="flex-1 flex flex-col space-y-6">
					{/* Tab Navigation */}
					<div className="flex justify-between items-center border-b">
            <div>
              <button
                className={`py-2 px-4 font-semibold ${activeTab === "todo" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("todo")}
              >
                To-Do List
              </button>
              <button
                className={`py-2 px-4 font-semibold ${activeTab === "calendar" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("calendar")}
              >
                Calendar
              </button>
            </div>
          </div>

					{/* Conditional Rendering based on activeTab */}
					{activeTab === "todo" && (
						<TaskList 
							tasks={tasks} 
							toggleSubtaskCompletion={toggleSubtaskCompletion} 
							toggleTaskCompletion={toggleTaskCompletion}
							onEditTask={handleOpenEditModal} 
							onDeleteTask={handleDeleteTask}
              expandedTaskIds={expandedTaskIds} 
              onToggleTaskExpansion={handleToggleTaskExpansion} 
						/>
					)}
					{activeTab === "calendar" && <CalendarView tasks={tasks} />}
				</div>

				<div className="w-full md:w-1/3 lg:w-1/4 space-y-6">
					<SupportPanel />
					<ChatPanel />
				</div>
			</main>
			{isEditModalOpen && taskToEdit && (
				<EditTaskModal
					isOpen={isEditModalOpen}
					onClose={handleCloseEditModal}
					task={taskToEdit}
					onSaveTask={handleSaveTask}
				/>
			)}
		</div>
	);
}
