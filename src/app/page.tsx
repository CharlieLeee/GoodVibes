"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import TaskList from "@/components/TaskList";
import SupportPanel from "@/components/SupportPanel";
import ChatPanel from "@/components/ChatPanel";
import CalendarView from "@/components/CalendarView";
import { Task, Subtask } from "@/components/TaskList";

// Initial tasks data - this will now be managed in this component
const initialTasks: Task[] = [
	{
		id: "1",
		title: "Project Alpha Kickoff", // Changed from name to title
		description: "Plan and initiate Project Alpha.",
		priority: "High Priority",
		status: "Pending",
		tags: ["project", "planning"],
		progress: 0,
		dueDate: "2025-05-20",
		createdDate: "2025-05-16",
		subtasks: [],
	},
	{
		id: "2",
		title: "Develop Feature X", // Changed from name to title
		description: "Complete the development of Feature X for the new module.",
		priority: "Medium Priority",
		status: "In Progress",
		tags: ["development", "feature"],
		progress: 33,
		// No task-level due date, subtasks have their own
		createdDate: "2025-05-10",
		subtasks: [
			{ id: "2.1", name: "Design database schema", completed: true, dueDate: "2025-05-17" },
			{ id: "2.2", name: "Implement API endpoints", completed: false, dueDate: "2025-05-22" },
			{ id: "2.3", name: "Write unit tests", completed: false, dueDate: "2025-05-24" },
		],
	},
	{
		id: "3",
		title: "User Testing Phase 1", // Changed from name to title
		description: "Conduct first round of user testing and gather feedback.",
		priority: "High Priority",
		status: "Pending",
		tags: ["testing", "feedback"],
		progress: 0,
		dueDate: "2025-06-01",
		createdDate: "2025-05-15",
		subtasks: [], // Added empty subtasks array for consistency
	},
	{
		id: "4",
		title: "Marketing Campaign Launch", // Changed from name to title
		description: "Prepare and launch the new marketing campaign.",
		priority: "Medium Priority",
		status: "Pending",
		tags: ["marketing", "launch"],
		progress: 0,
		createdDate: "2025-05-12",
		subtasks: [
			{ id: "4.1", name: "Draft campaign brief", completed: false, dueDate: "2025-05-25" },
			{ id: "4.2", name: "Create ad visuals", completed: false, dueDate: "2025-05-28" },
			{ id: "4.3", name: "Schedule social media posts", completed: false, dueDate: "2025-05-30" },
		],
	},
];

export default function Home() {
	// Initialize state with initialTasks. localStorage will be checked in useEffect.
	const [tasks, setTasks] = useState<Task[]>(initialTasks);
	const [isClient, setIsClient] = useState(false); // State to track client-side mount

	const [activeTab, setActiveTab] = useState<"todo" | "calendar">("todo");

	// Effect to load tasks from localStorage on client-side mount
	useEffect(() => {
		setIsClient(true); // Indicate that component has mounted on client
		const savedTasks = localStorage.getItem("tasks");
		if (savedTasks) {
			try {
				const parsedTasks = JSON.parse(savedTasks);
				setTasks(parsedTasks);
			} catch (error) {
				console.error("Error parsing tasks from localStorage:", error);
				// Optionally, reset to initialTasks or clear localStorage if corrupted
				// localStorage.removeItem('tasks'); 
				// setTasks(initialTasks);
			}
		}
	}, []); // Empty dependency array ensures this runs only once on mount

	// Save tasks to localStorage whenever they change, but only if on client
	useEffect(() => {
		if (isClient) {
			// Only run on client after initial mount and state reconciliation
			localStorage.setItem("tasks", JSON.stringify(tasks));
		}
	}, [tasks, isClient]);

	const toggleSubtaskCompletion = (taskId: string, subtaskId: string) => {
		setTasks((prevTasks) =>
			prevTasks.map((task) => {
				if (task.id === taskId) {
					const newSubtasks = task.subtasks.map((subtask) =>
						subtask.id === subtaskId
							? { ...subtask, completed: !subtask.completed }
							: subtask
					);

					const completedCount = newSubtasks.filter((st) => st.completed).length;
					const newProgress =
						newSubtasks.length > 0
							? Math.round((completedCount / newSubtasks.length) * 100)
							: task.subtasks.length === 0 && task.status === "Completed"
							? 100
							: 0; // Handle no subtasks case for progress

					let newStatus = task.status;
					if (newSubtasks.length > 0) {
						if (completedCount === newSubtasks.length) {
							newStatus = "Completed";
						} else if (completedCount > 0) {
							newStatus = "In Progress";
						} else {
							// Potentially revert to original status if needed, for now, "Pending" if no subtasks started
							// This logic might need to align with how initialTasks sets "Pending" vs "In Progress"
							const originalTask = initialTasks.find((t) => t.id === taskId);
							newStatus = originalTask?.status !== "Completed" ? (originalTask?.status || "Pending") : "Pending";
						}
					} else {
						// Task without subtasks
						// This part of logic might need adjustment if tasks without subtasks can be directly marked completed
						// For now, assume their status is managed differently or they don't use this toggle directly
					}

					// If a subtask was unchecked, and the task was "Completed", revert status
					if (task.status === "Completed" && completedCount < (task.subtasks?.length || 0)) {
						const originalTask = initialTasks.find((t) => t.id === taskId);
						newStatus = originalTask?.status !== "Completed" ? (originalTask?.status || "In Progress") : "In Progress";
					}

					return {
						...task,
						subtasks: newSubtasks,
						progress: newProgress,
						status: newStatus,
					};
				}
				return task;
			})
		);
	};

	// Handler for marking a task (without subtasks) as completed/pending directly
	// This is a new function to handle top-level task status changes if needed
	const toggleTaskCompletion = (taskId: string) => {
		setTasks((prevTasks) =>
			prevTasks.map((task) => {
				if (task.id === taskId && (!task.subtasks || task.subtasks.length === 0)) {
					const newStatus = task.status === "Completed" ? "Pending" : "Completed";
					const newProgress = newStatus === "Completed" ? 100 : 0;
					return { ...task, status: newStatus, progress: newProgress };
				}
				return task;
			})
		);
	};

	// Conditional rendering for TaskList and CalendarView to avoid rendering with potentially mismatched state before client hydration
	if (!isClient) {
		// Optionally render a loading state or null during SSR / pre-hydration to avoid mismatch
		// For simplicity, we can render the initial state, but the useEffect will correct it.
		// However, to be absolutely safe and prevent any flash of unhydrated content that *might* still mismatch
		// if initialTasks itself was dynamic (though it's not here), one might return null or a loader.
		// For this specific localStorage case, letting it render initialTasks and then update is usually fine.
	}

	return (
		<div className="flex flex-col h-screen bg-gray-100">
			<Header />
			<main className="flex flex-1 p-6 space-x-6 overflow-y-auto">
				<div className="flex-1 flex flex-col space-y-6">
					{/* Tab Navigation */}
					<div className="flex border-b">
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

					{/* Conditional Rendering based on activeTab */}
					{/* Ensure components that depend on 'tasks' state from localStorage are ready */}
					{isClient && activeTab === "todo" && (
						<TaskList
							tasks={tasks}
							onToggleSubtaskCompletion={toggleSubtaskCompletion}
							onToggleTaskCompletion={toggleTaskCompletion}
						/>
					)}
					{isClient && activeTab === "calendar" && <CalendarView tasks={tasks} />}

					{/* SupportPanel can be rendered immediately if it doesn't depend on localStorage state */}
					<SupportPanel />
				</div>
				<div className="w-1/3">
					{/* ChatPanel can be rendered immediately if it doesn't depend on localStorage state */}
					<ChatPanel />
				</div>
			</main>
		</div>
	);
}
