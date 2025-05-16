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
const GOOGLE_ACCESS_TOKEN_KEY = "googleAccessToken_tasksAppData"; // New key
const GOOGLE_SIGN_IN_STATUS_KEY = "googleSignInStatus_tasksAppData"; // New key

// Placeholder for Google Client ID - REPLACE WITH YOUR ACTUAL CLIENT ID
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_API_SCOPE = "https://www.googleapis.com/auth/tasks";

// Initial tasks data - this will now be managed in this component
const initialTasks: Task[] = [
	{
		id: "1",
		title: "Project Alpha Kickoff", // Changed from name to title
		description: "Plan and initiate Project Alpha.",
		priority: "High Priority",
		status: "Pending",
		progress: 0,
		createdDate: "2023-01-10",
		dueDate: "2023-02-28",
		tags: ["project", "planning", "alpha"],
		subtasks: [
			{ id: "s1-1", name: "Define project scope", completed: false, dueDate: "2023-01-20" },
			{ id: "s1-2", name: "Assemble project team", completed: false, dueDate: "2023-01-25" },
		],
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
	// Initialize state with initialTasks for SSR and first client render
	const [tasks, setTasks] = useState<Task[]>(initialTasks);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
	const [hasMounted, setHasMounted] = useState(false);
	const [activeTab, setActiveTab] = useState<'todo' | 'calendar'>('todo');
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]); // State for expanded task IDs

  // Google Auth State
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [googleTokenClient, setGoogleTokenClient] = useState<any>(null);


	// Set hasMounted to true only on the client-side after initial render
	useEffect(() => {
		setHasMounted(true);

    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Initialize Google Token Client once script is loaded
      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID!,
          scope: GOOGLE_API_SCOPE,
          callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              setGoogleAccessToken(tokenResponse.access_token);
              setIsGoogleSignedIn(true);
              // Store token and sign-in status in localStorage
              localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, tokenResponse.access_token);
              localStorage.setItem(GOOGLE_SIGN_IN_STATUS_KEY, "true");
              console.log("Google Access Token:", tokenResponse.access_token);
            } else {
              console.error("Error obtaining Google access token:", tokenResponse);
              setIsGoogleSignedIn(false);
              setGoogleAccessToken(null);
              // Clear token and sign-in status from localStorage
              localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
              localStorage.removeItem(GOOGLE_SIGN_IN_STATUS_KEY);
            }
          },
        });
        setGoogleTokenClient(client);
      } else {
        console.error("Google Identity Services library not loaded correctly.");
      }
    };
    script.onerror = () => {
      console.error("Failed to load Google Identity Services script.");
    };
    document.body.appendChild(script);

    return () => {
      // Clean up script if component unmounts
      document.body.removeChild(script);
    };
	}, []);

	// Effect to load tasks and expanded state from local storage once the component has mounted
	useEffect(() => {
		if (hasMounted) {
			const storedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);
			if (storedTasks) {
				try {
					const parsedTasks = JSON.parse(storedTasks);
					setTasks(parsedTasks);
				} catch (error) {
					console.error("Error parsing tasks from local storage:", error);
				}
			}

      const storedExpandedIds = localStorage.getItem(EXPANDED_TASKS_LOCAL_STORAGE_KEY);
      if (storedExpandedIds) {
        try {
          const parsedExpandedIds = JSON.parse(storedExpandedIds);
          setExpandedTaskIds(parsedExpandedIds);
        } catch (error) {
          console.error("Error parsing expanded task IDs from local storage:", error);
        }
      }

      // Load Google Auth state from localStorage
      const storedGoogleToken = localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
      const storedGoogleSignInStatus = localStorage.getItem(GOOGLE_SIGN_IN_STATUS_KEY);

      if (storedGoogleToken && storedGoogleSignInStatus === "true") {
        setGoogleAccessToken(storedGoogleToken);
        setIsGoogleSignedIn(true);
        console.log("Restored Google session from localStorage");
      }
		}
	}, [hasMounted]); // Depend on hasMounted

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
		const task = tasks.find(t => t.id === taskId);
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

	// Function to handle saving the edited task
	const handleSaveTask = (updatedTask: Task) => {
		setTasks(prevTasks => prevTasks.map(task => task.id === updatedTask.id ? updatedTask : task));
		handleCloseEditModal();
	};

	// Function to handle deleting a task
	const handleDeleteTask = (taskId: string) => {
		if (window.confirm("Are you sure you want to delete this task and all its subtasks?")) {
			setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      // Also remove from expandedTaskIds if it was there
      setExpandedTaskIds(prevIds => prevIds.filter(id => id !== taskId));
		}
	};

  // Function to toggle task expansion state
  const handleToggleTaskExpansion = (taskId: string) => {
    setExpandedTaskIds(prevIds => 
      prevIds.includes(taskId) 
        ? prevIds.filter(id => id !== taskId) 
        : [...prevIds, taskId]
    );
  };

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

  // Google Sign-In Handler
  const handleGoogleSignIn = () => {
    if (googleTokenClient) {
      googleTokenClient.requestAccessToken();
    } else {
      console.error("Google Token Client not initialized.");
      // Optionally, try to re-initialize or prompt user to reload
    }
  };

  // Google Sign-Out Handler
  const handleGoogleSignOut = () => {
    if (googleAccessToken) {
      window.google.accounts.oauth2.revoke(googleAccessToken, () => {
        setGoogleAccessToken(null);
        setIsGoogleSignedIn(false);
        // Clear token and sign-in status from localStorage
        localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
        localStorage.removeItem(GOOGLE_SIGN_IN_STATUS_KEY);
        console.log("Google token revoked and session cleared from localStorage.");
      });
    } else {
      // If there's no access token in state, still ensure localStorage is clear
      localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
      localStorage.removeItem(GOOGLE_SIGN_IN_STATUS_KEY);
      setIsGoogleSignedIn(false); // Ensure UI reflects signed-out state
    }
  };


	// Conditional rendering for TaskList and CalendarView to avoid rendering with potentially mismatched state before client hydration
	if (!hasMounted) {
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
					{/* Tab Navigation & Google Sign-In */}
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
            <div>
              {isGoogleSignedIn ? (
                <button
                  onClick={handleGoogleSignOut}
                  className="py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Sign Out from Google
                </button>
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  disabled={!googleTokenClient}
                  className="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                >
                  Sign In with Google
                </button>
              )}
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
              expandedTaskIds={expandedTaskIds} // Pass down
              onToggleTaskExpansion={handleToggleTaskExpansion} // Pass down
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
