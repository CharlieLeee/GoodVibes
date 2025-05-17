# Todo List Application Structure

## Data Model

### Task
- **id**: Unique identifier for each task
- **user_id**: Identifier of the user who owns the task
- **title**: Short name/title of the task
- **description**: Detailed description of the task (optional)
- **deadline**: Due date and time for the task (optional)
- **priority**: Task priority level (low, medium, high)
- **completed**: Boolean flag indicating if task is completed
- **subtasks**: List of subtasks for this task
- **created_at**: Timestamp when the task was created
- **updated_at**: Timestamp when the task was last updated

### Subtask
- **id**: Unique identifier for each subtask
- **task_id**: ID of the parent task
- **title**: Title of the subtask (defaults to description if not provided)
- **description**: Detailed description of the subtask
- **completed**: Boolean flag indicating if subtask is completed
- **deadline**: Due date and time for the subtask (optional)
- **order**: Integer representing the display order of subtasks
- **created_at**: Timestamp when the subtask was created

### User
- **id**: Unique identifier for each user
- **username**: Username for the user
- **created_at**: Timestamp when the user was created

## Workflow

1. **User Authentication**
   - Create or login with a username
   - System generates or retrieves user ID

2. **Task Management**
   - Create tasks with title, description, deadline, and priority
   - View list of all tasks with their completion status
   - Update task details (title, description, deadline, priority)
   - Mark tasks as complete/incomplete
   - Delete tasks

3. **Subtask Management**
   - Create subtasks for a task with title, description, and deadline
   - View list of subtasks for each task
   - Update subtask details
   - Mark subtasks as complete/incomplete
   - Delete subtasks

4. **Task Views**
   - List View: Shows all tasks in a list format with subtasks
   - Calendar View: Shows tasks organized by date
   - Timeline View: Shows tasks organized in a timeline format

## API Endpoints

### User Endpoints
- `POST /api/users`: Create a new user
- `GET /api/users/{user_id}`: Get user by ID
- `GET /api/users/name/{username}`: Get user by username

### Task Endpoints
- `POST /api/tasks`: Create a new task
- `GET /api/tasks/{task_id}`: Get task by ID
- `GET /api/tasks/user/{user_id}`: Get all tasks for a user
- `PUT /api/tasks/{task_id}`: Update a task
- `DELETE /api/tasks/{task_id}`: Delete a task

### Subtask Endpoints
- `POST /api/tasks/{task_id}/subtasks`: Create a new subtask
- `PUT /api/tasks/{task_id}/subtasks/{subtask_id}`: Update a subtask
- `DELETE /api/tasks/{task_id}/subtasks/{subtask_id}`: Delete a subtask

## Frontend Components

1. **Navigation**
   - Tabs for Tasks, Calendar, Timeline, and Statistics views

2. **Task Input**
   - Form for creating new tasks
   - Voice input option

3. **Task List**
   - Display of all tasks with completion status
   - Task cards with detailed information
   - Subtask list within each task card

4. **Task Card**
   - Task details display (title, description, deadline, priority)
   - Task completion toggle
   - Subtask management (add, toggle completion, edit)
   - Task edit and delete options

5. **Calendar View**
   - Monthly, weekly, and daily calendar views
   - Tasks displayed according to their deadlines

6. **Timeline View**
   - Tasks organized chronologically
   - Visual representation of task deadlines and progress

## Current Status

### Implemented Features
- Basic data models for tasks, subtasks, and users
- Full CRUD operations for tasks and subtasks
- Multiple view options (list, calendar, timeline)
- User management system
- Frontend components for all major views

### Missing Features
1. **User Authentication System**
   - No proper login/logout functionality
   - No password protection
   - No user session management

2. **Data Validation and Error Handling**
   - Limited validation for user inputs
   - Basic error handling could be improved

3. **Responsive Design**
   - Mobile optimization could be improved

4. **Offline Support**
   - No local storage or caching for offline use

5. **Task Filters and Search**
   - No functionality to filter tasks by various criteria
   - No search functionality to find specific tasks

6. **Drag and Drop Functionality**
   - No drag-and-drop interface for reordering tasks/subtasks
   - No drag-and-drop for moving tasks between different dates

7. **Data Export/Import**
   - No functionality to export or import task data

8. **Notifications**
   - No reminder notifications for upcoming deadlines

## Next Steps

1. Implement a proper authentication system with secure login
2. Add comprehensive data validation and error handling
3. Develop responsive design for mobile devices
4. Implement task filtering and search functionality
5. Add drag-and-drop interfaces for task management
6. Create notification system for task deadlines
7. Add data export/import functionality
8. Implement offline support with local storage 