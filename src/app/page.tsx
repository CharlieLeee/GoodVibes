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
		title: "Project Alpha Kickoff",
		description: "Plan and initiate Project Alpha.",
		priority: "High", // Updated priority
		status: "needsAction", // Updated status from "Pending"
		progress: 0,
		createdDate: "2023-01-10",
		dueDate: "2023-02-28",
		tags: ["project", "planning", "alpha"],
		subtasks: [
			{ id: "s1-1", title: "Define project scope", completed: false, dueDate: "2023-01-20" }, // name to title
			{ id: "s1-2", title: "Assemble project team", completed: false, dueDate: "2023-01-25" }, // name to title
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
			{ id: "2.1", title: "Design database schema", completed: true, dueDate: "2025-05-17" }, // name to title
			{ id: "2.2", title: "Implement API endpoints", completed: false, dueDate: "2025-05-22" }, // name to title
			{ id: "2.3", title: "Write unit tests", completed: false, dueDate: "2025-05-24" }, // name to title
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
			{ id: "4.1", title: "Draft campaign brief", completed: false, dueDate: "2025-05-25" }, // name to title
			{ id: "4.2", title: "Create ad visuals", completed: false, dueDate: "2025-05-28" }, // name to title
			{ id: "4.3", title: "Schedule social media posts", completed: false, dueDate: "2025-05-30" }, // name to title
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
              localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, tokenResponse.access_token);
              localStorage.setItem(GOOGLE_SIGN_IN_STATUS_KEY, "true");
              console.log("Google Access Token:", tokenResponse.access_token);
              // Fetch Google Tasks after successful sign-in
              fetchGoogleTasks(tokenResponse.access_token);
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
        // Fetch Google Tasks if signed in
        fetchGoogleTasks(storedGoogleToken);
      }
		}
	}, [hasMounted]); // Depend on hasMounted

  // Function to update Google Task status
  const updateGoogleTaskStatus = async (taskId: string, taskListId: string, completed: boolean, etag?: string, preventRefetch?: boolean) => {
    console.log(`[updateGoogleTaskStatus] Called with: taskId=${taskId}, taskListId=${taskListId}, completed=${completed}, etag=${etag}, preventRefetch=${preventRefetch}`);
    if (!googleAccessToken) {
      console.error("[updateGoogleTaskStatus] No Google access token available for updating task.");
      return;
    }

    let currentEtag = etag; 

    if (!currentEtag) {
        const foundTask = tasks.find(t => t.googleId === taskId && t.taskListId === taskListId);
        if (foundTask) {
            currentEtag = foundTask.etag;
        } else {
            const parentTaskWithSubtask = tasks.find(t => t.subtasks.some(st => st.googleId === taskId && st.taskListId === taskListId));
            if (parentTaskWithSubtask) {
                const foundSubtask = parentTaskWithSubtask.subtasks.find(st => st.googleId === taskId && st.taskListId === taskListId);
                currentEtag = foundSubtask?.etag;
            }
        }
        console.log(`[updateGoogleTaskStatus] ETag was not passed directly, found locally: ${currentEtag}`);
    }


    if (!currentEtag) {
      console.warn(`[updateGoogleTaskStatus] ETag not found for task ${taskId} in list ${taskListId}, update will proceed without If-Match header.`);
    } else {
      console.log(`[updateGoogleTaskStatus] Using ETag for If-Match: ${currentEtag}`);
    }
    
    const requestBody = {
      id: taskId,
      status: completed ? "completed" : "needsAction",
    };
    console.log(`[updateGoogleTaskStatus] Request body for PATCH to tasks/${taskId} in list ${taskListId}:`, requestBody);

    try {
      const response = await fetch(`https://www.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          "Authorization": `Bearer ${googleAccessToken}`,
          "Content-Type": "application/json",
          ...(currentEtag && { "If-Match": currentEtag }), 
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`[updateGoogleTaskStatus] PATCH response status for tasks/${taskId}: ${response.status}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to parse error JSON" }));
        console.error(`[updateGoogleTaskStatus] Error updating Google Task ${taskId} status:`, response.status, errorData);
        if (response.status === 401) {
          handleGoogleSignOut(); // Sign out will clear token and reset tasks
          alert("Your Google session has expired. Please sign in again.");
        } else if (response.status === 412) {
            alert("The task was modified elsewhere. Refreshing data. Please try your change again.");
        }
        // Re-fetch to sync state after an error, unless prevented
        if (googleAccessToken && !preventRefetch) fetchGoogleTasks(googleAccessToken); 
        return; // Indicate failure or throw an error if preferred
      }

      const updatedGoogleTask = await response.json();
      console.log(`[updateGoogleTaskStatus] Google Task ${taskId} status updated successfully:`, updatedGoogleTask);

      // Re-fetch to sync state with new etag etc., unless prevented
      if (googleAccessToken && !preventRefetch) fetchGoogleTasks(googleAccessToken);

    } catch (error) {
      console.error(`[updateGoogleTaskStatus] Exception while updating Google Task ${taskId} status:`, error);
      // Re-fetch to sync state after an exception, unless prevented
      if (googleAccessToken && !preventRefetch) fetchGoogleTasks(googleAccessToken); 
    }
  };

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
    console.log(`[toggleSubtaskCompletion] Called for parent taskId: ${taskId}, subtaskId: ${subtaskId}`);

    let subtaskToUpdateDetails: {
        googleId: string;
        taskListId: string;
        newCompletedStatus: boolean;
        etag?: string;
    } | null = null;

    // First, find the subtask and determine its new state and Google Task details
    const currentTasks = tasks; // Get current tasks state from closure
    for (const task of currentTasks) {
        if (task.id === taskId) {
            const subtask = task.subtasks.find(st => st.id === subtaskId);
            if (subtask) {
                // Check if it's a Google Task by looking for googleId and taskListId
                if (subtask.googleId && subtask.taskListId) {
                    subtaskToUpdateDetails = {
                        googleId: subtask.googleId,
                        taskListId: subtask.taskListId,
                        newCompletedStatus: !subtask.completed, // This is the state to send to Google
                        etag: subtask.etag,
                    };
                }
                console.log(`[toggleSubtaskCompletion] Found subtask. Details for Google update (if applicable):`, subtaskToUpdateDetails ? JSON.parse(JSON.stringify(subtaskToUpdateDetails)) : "Not a Google Task or missing IDs");
                break; // Found parent task and subtask, no need to search further
            }
        }
    }

    // Now, update the local state
    setTasks((prevTasks) =>
        prevTasks.map((task) => {
            if (task.id === taskId) {
                const newSubtasks = task.subtasks.map((subtask) => {
                    if (subtask.id === subtaskId) {
                        // This toggles the local state for the UI
                        return { ...subtask, completed: !subtask.completed, title: subtask.title };
                    }
                    return subtask;
                });

                const completedCount = newSubtasks.filter((st) => st.completed).length;
                const newProgress =
                    newSubtasks.length > 0
                        ? Math.round((completedCount / newSubtasks.length) * 100)
                        : task.subtasks.length === 0 && task.status === "completed"
                        ? 100
                        : 0;
                let newStatus: "needsAction" | "completed" = task.status;
                if (newSubtasks.length > 0) {
                    newStatus = (completedCount === newSubtasks.length) ? "completed" : "needsAction";
                }
                if (task.status === "completed" && completedCount < (newSubtasks?.length || 0)) {
                    newStatus = "needsAction";
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

    // After local state update is queued, if it's a Google Task and we have details, update it on Google
    if (isGoogleSignedIn && googleAccessToken && subtaskToUpdateDetails) {
        console.log(`[toggleSubtaskCompletion] Attempting to update Google Subtask with collected details:`, subtaskToUpdateDetails);
        updateGoogleTaskStatus(
            subtaskToUpdateDetails.googleId,
            subtaskToUpdateDetails.taskListId,
            subtaskToUpdateDetails.newCompletedStatus,
            subtaskToUpdateDetails.etag
        );
    } else {
        console.log("[toggleSubtaskCompletion] Skipping Google Subtask update. Conditions not met (not signed in, no token, or not a Google subtask with necessary IDs):", {
            isGoogleSignedIn,
            hasToken: !!googleAccessToken,
            subtaskDetailsFoundAndValid: !!subtaskToUpdateDetails
        });
    }
	};

	const toggleTaskCompletion = (taskId: string) => {
    console.log(`[toggleTaskCompletion] Called for taskId: ${taskId}`);

    let taskToUpdateDetails: {
        googleId: string;
        taskListId: string;
        newCompletedStatus: boolean;
        etag?: string;
    } | null = null;

    // First, find the task and determine its new state and Google Task details
    const currentTasks = tasks; // Get current tasks state from closure
    const taskToProcess = currentTasks.find(t => t.id === taskId && (!t.subtasks || t.subtasks.length === 0));

    if (taskToProcess) {
        // Check if it's a Google Task by looking for googleId and taskListId
        if (taskToProcess.googleId && taskToProcess.taskListId) {
            taskToUpdateDetails = {
                googleId: taskToProcess.googleId,
                taskListId: taskToProcess.taskListId,
                newCompletedStatus: !(taskToProcess.status === "completed"), // This is the state to send to Google
                etag: taskToProcess.etag,
            };
        }
        console.log(`[toggleTaskCompletion] Found task. Details for Google update (if applicable):`, taskToUpdateDetails ? JSON.parse(JSON.stringify(taskToUpdateDetails)) : "Not a Google Task or missing IDs");
    }

    // Now, update the local state
    setTasks((prevTasks) =>
        prevTasks.map((task) => {
            if (task.id === taskId && (!task.subtasks || task.subtasks.length === 0)) {
                // This toggles the local state for the UI
                const newStatus = !(task.status === "completed") ? "completed" : "needsAction";
                const newProgress = newStatus === "completed" ? 100 : 0;
                return { ...task, status: newStatus, progress: newProgress };
            }
            return task;
        })
    );

    // After local state update is queued, if it's a Google Task and we have details, update it on Google
    if (isGoogleSignedIn && googleAccessToken && taskToUpdateDetails) {
        console.log(`[toggleTaskCompletion] Attempting to update Google Task with collected details:`, taskToUpdateDetails);
        updateGoogleTaskStatus(
            taskToUpdateDetails.googleId,
            taskToUpdateDetails.taskListId,
            taskToUpdateDetails.newCompletedStatus,
            taskToUpdateDetails.etag
        );
    } else {
        console.log("[toggleTaskCompletion] Skipping Google Task update. Conditions not met (not signed in, no token, or not a Google task with necessary IDs):", {
            isGoogleSignedIn,
            hasToken: !!googleAccessToken,
            taskDetailsFoundAndValid: !!taskToUpdateDetails
        });
    }
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
        localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
        localStorage.removeItem(GOOGLE_SIGN_IN_STATUS_KEY);
        setTasks(initialTasks); // Reset to initial local tasks or an empty array
        console.log("Google token revoked and session cleared from localStorage.");
      });
    } else {
      localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
      localStorage.removeItem(GOOGLE_SIGN_IN_STATUS_KEY);
      setIsGoogleSignedIn(false);
      setTasks(initialTasks); // Reset to initial local tasks or an empty array
    }
  };

  // Function to fetch Google Tasks
  const fetchGoogleTasks = async (token: string) => {
    console.log("Fetching Google Tasks...");
    if (!token) {
      console.warn("[fetchGoogleTasks] No token provided. Aborting.");
      // Optionally sign out if token is expected but missing
      // handleGoogleSignOut(); 
      return;
    }
    try {
      const taskListsResponse = await fetch("https://www.googleapis.com/tasks/v1/users/@me/lists", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!taskListsResponse.ok) {
        const errorData = await taskListsResponse.json();
        console.error("Error fetching Google Task Lists:", taskListsResponse.status, errorData);
        if (taskListsResponse.status === 401) {
          // Token might be invalid or expired, sign out
          handleGoogleSignOut(); // Call sign out to clear local state
          alert("Your Google session has expired or is invalid. Please sign in again.");
        }
        return;
      }
      const taskListsData = await taskListsResponse.json();
      const rawGoogleItems: any[] = []; // To store all task items from all lists
      const taskListIds: string[] = []; // To store task list IDs

      if (taskListsData.items) {
        for (const list of taskListsData.items) {
          taskListIds.push(list.id); // Store the task list ID
          const tasksResponse = await fetch(`https://www.googleapis.com/tasks/v1/lists/${list.id}/tasks?showCompleted=true&showHidden=true`, { // Added showCompleted and showHidden
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });
          if (!tasksResponse.ok) {
            const errorData = await tasksResponse.json();
            console.error(`Error fetching tasks for list ${list.title} (${list.id}):`, tasksResponse.status, errorData);
            continue;
          }
          const tasksData = await tasksResponse.json();
          if (tasksData.items) {
            // Add taskListId to each task item before pushing
            const itemsWithTaskListId = tasksData.items.map((item: any) => ({ ...item, taskListId: list.id }));
            rawGoogleItems.push(...itemsWithTaskListId);
          }
        }
      }

      // Process rawGoogleItems to build hierarchy
      const tasksMap = new Map<string, Task>();
      const topLevelTasks: Task[] = [];

      // First pass: map all items to Task objects and store in tasksMap
      for (const item of rawGoogleItems) {
        const mappedTask: Task = {
          id: item.id,
          googleId: item.id,
          taskListId: item.taskListId, // Store taskListId
          etag: item.etag,
          title: item.title || "Untitled Task",
          description: item.notes,
          status: item.status === "completed" ? "completed" : "needsAction",
          dueDate: item.due ? new Date(item.due).toISOString().split('T')[0] : undefined,
          createdDate: item.updated ? new Date(item.updated).toISOString().split('T')[0] : undefined, // Format createdDate
          priority: "Medium", // Default priority
          tags: [], // Initialize as empty
          subtasks: [], // Initialize as empty
          link: item.selfLink,
          // rawGoogleTask: item, // Uncomment if you want to store the full object
        };
        tasksMap.set(item.id, mappedTask);
        // Removed population of originalGoogleStatuses as task.status is used directly later
      }

      // Second pass: link subtasks to their parents
      for (const item of rawGoogleItems) {
        const currentTask = tasksMap.get(item.id);
        if (!currentTask) continue;

        if (item.parent && tasksMap.has(item.parent)) {
          const parentTask = tasksMap.get(item.parent);
          if (parentTask) {
            // currentTask is the Task representation of the subtask item
            const subtaskObject: Subtask = {
              id: currentTask.id, // Subtask's own Google ID
              googleId: currentTask.googleId, // Should also be the subtask's Google ID
              taskListId: currentTask.taskListId, // Store taskListId for subtask
              etag: currentTask.etag, // Store etag for subtask
              title: currentTask.title,
              completed: currentTask.status === "completed",
              dueDate: currentTask.dueDate,
            };
            parentTask.subtasks.push(subtaskObject);
          }
        } else {
          topLevelTasks.push(currentTask);
        }
      }
      
      const tasksToSyncToGoogle: Array<{ taskId: string, taskListId: string, newStatus: "completed" | "needsAction", etag?: string }> = [];

      // Update progress and status for tasks with subtasks based on subtask completion
      // Also, identify parent tasks whose status on Google needs to be updated based on subtask completion.
      for (const task of topLevelTasks) {
        const originalGoogleStatus = task.status; // Status as fetched from Google and mapped

        if (task.subtasks.length > 0) {
          const completedSubtasks = task.subtasks.filter(st => st.completed).length;
          task.progress = Math.round((completedSubtasks / task.subtasks.length) * 100);
          
          let derivedStatus: "completed" | "needsAction" = "needsAction";
          if (completedSubtasks === task.subtasks.length) {
            derivedStatus = "completed";
          }
          // If not all subtasks are complete, parent should be needsAction (already default)

          // If the derived status for the parent differs from what Google has, queue it for update.
          if (derivedStatus !== originalGoogleStatus) {
            if (task.googleId && task.taskListId) {
              console.log(`[fetchGoogleTasks] Parent task '${task.title}' (${task.googleId}) status on Google is '${originalGoogleStatus}', but derived status based on subtasks is '${derivedStatus}'. Queuing for update.`);
              tasksToSyncToGoogle.push({ 
                taskId: task.googleId, 
                taskListId: task.taskListId, 
                newStatus: derivedStatus, 
                etag: task.etag 
              });
            }
          }
          // Update the local task object's status to the derived status for UI consistency before setTasks
          task.status = derivedStatus;
        }
      }

      console.log("[fetchGoogleTasks] Processed top-level Google Tasks with hierarchy. Tasks to sync with Google:", tasksToSyncToGoogle);
      // Update UI with potentially modified parent task statuses (derived locally)
      // Ensure setTasks is called even if topLevelTasks is empty to clear existing tasks if needed
      if (hasMounted) { // Only call setTasks if component is mounted
         setTasks(topLevelTasks);
      }


      // After setTasks (to update UI quickly), sync parent tasks whose status needs to change on Google
      if (tasksToSyncToGoogle.length > 0 && googleAccessToken) { // Check googleAccessToken again
        console.log(`[fetchGoogleTasks] Syncing ${tasksToSyncToGoogle.length} parent tasks to Google.`);
        const syncPromises = tasksToSyncToGoogle.map(taskToSync =>
          updateGoogleTaskStatus(
            taskToSync.taskId, 
            taskToSync.taskListId, 
            taskToSync.newStatus === "completed", // Convert to boolean for updateGoogleTaskStatus
            taskToSync.etag, 
            true // preventRefetch = true for these individual updates
          )
        );
        
        try {
            await Promise.all(syncPromises);
            console.log("[fetchGoogleTasks] All parent task syncs attempted.");
        } catch (syncError) {
            console.error("[fetchGoogleTasks] Error during batch parent task sync:", syncError);
        } finally {
            // If parent sync operations were attempted by this run of fetchGoogleTasks,
            // do one final refetch to ensure consistency with Google, especially ETags.
            if (tasksToSyncToGoogle.length > 0 && googleAccessToken) { // Check token again
                 console.log(`[fetchGoogleTasks] Parent syncs were attempted for ${tasksToSyncToGoogle.length} tasks. Performing final data refresh.`);
                 fetchGoogleTasks(googleAccessToken); // Conditional recursive call
            }
        }
      }

    } catch (error) {
      console.error("Exception while fetching Google Tasks:", error);
      if (error instanceof Error && error.message.includes("401")) { // Basic check for auth error
        handleGoogleSignOut();
        alert("Your Google session may have expired. Please sign in again.");
      }
      // Potentially set tasks to empty or an error state
      // setTasks([]); 
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
