// WebSocket connection and UI management
document.addEventListener('DOMContentLoaded', () => {
    // DOM elements - Tabs
    const tabUsers = document.getElementById('tab-users');
    const tabProjects = document.getElementById('tab-projects');
    const tabTasks = document.getElementById('tab-tasks');
    const sectionUsers = document.getElementById('section-users');
    const sectionProjects = document.getElementById('section-projects');
    const sectionTasks = document.getElementById('section-tasks');
    
    // DOM elements - Connection status
    const connectionStatus = document.getElementById('connection-status');
    const connectionText = document.getElementById('connection-text');
    
    // DOM elements - Users
    const userForm = document.getElementById('user-form');
    const username = document.getElementById('username');
    const fullname = document.getElementById('fullname');
    const email = document.getElementById('email');
    const usersList = document.getElementById('users-list');
    const userTemplate = document.getElementById('user-template');
    
    // DOM elements - Projects
    const projectForm = document.getElementById('project-form');
    const projectName = document.getElementById('project-name');
    const projectDescription = document.getElementById('project-description');
    const projectDeadline = document.getElementById('project-deadline');
    const projectsList = document.getElementById('projects-list');
    const projectTemplate = document.getElementById('project-template');
    const projectSelect = document.getElementById('project-select');
    
    // DOM elements - Tasks
    const taskForm = document.getElementById('task-form');
    const taskTitle = document.getElementById('task-title');
    const taskDescription = document.getElementById('task-description');
    const taskPriority = document.getElementById('task-priority');
    const taskDueDate = document.getElementById('task-due-date');
    const taskAssignee = document.getElementById('task-assignee');
    const taskList = document.getElementById('task-list');
    const taskTemplate = document.getElementById('task-template');
    
    // DOM elements - Task Modal
    const taskModal = document.getElementById('task-modal');
    const modalTaskTitle = document.getElementById('modal-task-title');
    const modalTaskStatus = document.getElementById('modal-task-status');
    const modalTaskAssignee = document.getElementById('modal-task-assignee');
    const modalTaskDescription = document.getElementById('modal-task-description');
    const closeModal = document.getElementById('close-modal');
    const commentsList = document.getElementById('comments-list');
    const commentForm = document.getElementById('comment-form');
    const commentContent = document.getElementById('comment-content');
    const commentTemplate = document.getElementById('comment-template');
    
    // App state
    let socket;
    let clientId = null;
    let users = [];
    let projects = [];
    let tasks = [];
    let selectedProjectId = null;
    let currentUser = null;
    let currentTask = null;
    
    // Connect to WebSocket server
    function connectWebSocket() {
        // Change to wss:// if using secure WebSocket
        socket = new WebSocket('ws://localhost:3000');
        
        // Connection opened
        socket.addEventListener('open', (event) => {
            updateConnectionStatus(true, 'Conectado al servidor');
            fetchInitialData();
        });
        
        // Connection closed
        socket.addEventListener('close', (event) => {
            updateConnectionStatus(false, 'Desconectado del servidor');
            // Try to reconnect after 5 seconds
            setTimeout(connectWebSocket, 5000);
        });
        
        // Connection error
        socket.addEventListener('error', (event) => {
            updateConnectionStatus(false, 'Error de conexión');
            console.error('WebSocket error:', event);
        });
        
        // Listen for messages
        socket.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            console.log('Mensaje del servidor:', message);
            
            handleServerMessage(message);
        });
    }
    
    // Update connection status indicator
    function updateConnectionStatus(isConnected, message) {
        if (isConnected) {
            connectionStatus.classList.remove('bg-red-500', 'bg-yellow-500');
            connectionStatus.classList.add('bg-green-500');
        } else {
            connectionStatus.classList.remove('bg-green-500', 'bg-yellow-500');
            connectionStatus.classList.add('bg-red-500');
        }
        connectionText.textContent = message;
    }
    
    // Handle messages from the server
    function handleServerMessage(message) {
        switch (message.type) {
            case 'connection':
                clientId = message.id;
                console.log(`Conectado con ID de cliente: ${clientId}`);
                break;
                
            case 'new_user':
                addUserToUI(message.user);
                // Update assignee dropdown in task form
                updateAssigneeDropdown();
                break;
                
            case 'new_project':
                addProjectToUI(message.project);
                updateProjectDropdown();
                break;
                
            case 'new_task':
                addTaskToUI(message.task);
                break;
                
            case 'task_updated':
                updateTaskInUI(message.task);
                if (currentTask && currentTask.id === message.task.id) {
                    updateTaskModal(message.task);
                }
                break;
                
            case 'new_comment':
                if (currentTask && currentTask.id === message.comment.taskId) {
                    addCommentToUI(message.comment);
                }
                break;
                
            default:
                console.log('Tipo de mensaje desconocido:', message.type);
        }
    }
    
    // Fetch initial data from HTTP API
    function fetchInitialData() {
        Promise.all([
            fetch('http://localhost:3000/api/users').then(res => res.json()),
            fetch('http://localhost:3000/api/projects').then(res => res.json())
        ])
        .then(([usersData, projectsData]) => {
            users = usersData;
            projects = projectsData;
            
            renderUsers();
            renderProjects();
            updateProjectDropdown();
            updateAssigneeDropdown();
        })
        .catch(error => {
            console.error('Error fetching initial data:', error);
        });
    }
    
    // ----- USER FUNCTIONS -----
    
    // Render all users
    function renderUsers() {
        usersList.innerHTML = '';
        
        if (users.length === 0) {
            usersList.innerHTML = '<p class="text-gray-500 text-center">No hay usuarios registrados</p>';
            return;
        }
        
        users.forEach(user => {
            const userElement = userTemplate.content.cloneNode(true);
            
            userElement.querySelector('.user-username').textContent = user.username;
            userElement.querySelector('.user-email').textContent = user.email;
            userElement.querySelector('.user-fullname').textContent = user.fullName;
            
            usersList.appendChild(userElement);
        });
    }
    
    // Add a user to the UI
    function addUserToUI(user) {
        // Check if user already exists
        if (users.some(u => u.id === user.id)) {
            updateUserInUI(user);
            return;
        }
        
        users.push(user);
        renderUsers();
    }
    
    // Update a user in the UI
    function updateUserInUI(updatedUser) {
        const index = users.findIndex(user => user.id === updatedUser.id);
        if (index !== -1) {
            users[index] = updatedUser;
            renderUsers();
        }
    }
    
    // Update assignee dropdown in task form
    function updateAssigneeDropdown() {
        taskAssignee.innerHTML = '<option value="">Sin asignar</option>';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.username;
            taskAssignee.appendChild(option);
        });
    }
    
    // ----- PROJECT FUNCTIONS -----
    
    // Render all projects
    function renderProjects() {
        projectsList.innerHTML = '';
        
        if (projects.length === 0) {
            projectsList.innerHTML = '<p class="text-gray-500 text-center">No hay proyectos disponibles</p>';
            return;
        }
        
        projects.forEach(project => {
            const projectElement = projectTemplate.content.cloneNode(true);
            
            projectElement.querySelector('.project-name').textContent = project.name;
            projectElement.querySelector('.project-description').textContent = project.description || 'Sin descripción';
            
            const deadlineElement = projectElement.querySelector('.project-deadline');
            if (project.deadline) {
                const deadline = new Date(project.deadline);
                deadlineElement.textContent = `Fecha límite: ${deadline.toLocaleDateString()}`;
            } else {
                deadlineElement.textContent = 'Sin fecha límite';
            }
            
            const viewTasksBtn = projectElement.querySelector('.view-tasks-btn');
            viewTasksBtn.addEventListener('click', () => {
                selectedProjectId = project.id;
                switchToTab('tasks');
                projectSelect.value = project.id;
                loadProjectTasks(project.id);
            });
            
            projectsList.appendChild(projectElement);
        });
    }
    
    // Add a project to the UI
    function addProjectToUI(project) {
        // Check if project already exists
        if (projects.some(p => p.id === project.id)) {
            updateProjectInUI(project);
            return;
        }
        
        projects.push(project);
        renderProjects();
    }
    
    // Update a project in the UI
    function updateProjectInUI(updatedProject) {
        const index = projects.findIndex(project => project.id === updatedProject.id);
        if (index !== -1) {
            projects[index] = updatedProject;
            renderProjects();
        }
    }
    
    // Update project dropdown in task section
    function updateProjectDropdown() {
        projectSelect.innerHTML = '';
        
        if (projects.length === 0) {
            projectSelect.innerHTML = '<option value="">No hay proyectos disponibles</option>';
            return;
        }
        
        projectSelect.innerHTML = '<option value="">Seleccione un proyecto</option>';
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectSelect.appendChild(option);
        });
        
        if (selectedProjectId) {
            projectSelect.value = selectedProjectId;
        }
    }
    
    // ----- TASK FUNCTIONS -----
    
    // Render tasks for selected project
    function renderTasks() {
        taskList.innerHTML = '';
        
        if (tasks.length === 0) {
            taskList.innerHTML = '<p class="text-gray-500 text-center">No hay tareas en este proyecto</p>';
            return;
        }
        
        tasks.forEach(task => {
            const taskElement = taskTemplate.content.cloneNode(true);
            const taskItem = taskElement.querySelector('.task-item');
            
            // Set task details
            taskElement.querySelector('.task-title').textContent = task.title;
            taskElement.querySelector('.task-description').textContent = task.description || 'Sin descripción';
            
            // Set status color and text
            const statusElement = taskElement.querySelector('.task-status');
            statusElement.textContent = getStatusText(task.status);
            setStatusStyles(statusElement, task.status);
            
            // Set priority indicator
            const priorityBadge = taskElement.querySelector('.task-priority-badge');
            setPriorityStyles(priorityBadge, task.priority);
            
            // Set due date
            const dueElement = taskElement.querySelector('.task-due');
            if (task.dueDate) {
                const dueDate = new Date(task.dueDate);
                dueElement.textContent = `Fecha límite: ${dueDate.toLocaleDateString()}`;
            } else {
                dueElement.textContent = '';
            }
            
            // Set assignee
            const assigneeElement = taskElement.querySelector('.task-assignee');
            if (task.assigneeId) {
                const assignedUser = users.find(user => user.id === task.assigneeId);
                assigneeElement.textContent = assignedUser ? assignedUser.username : `Usuario ${task.assigneeId}`;
            } else {
                assigneeElement.textContent = 'Sin asignar';
            }
            
            // Open task modal on click
            taskItem.addEventListener('click', () => {
                openTaskModal(task);
            });
            
            taskList.appendChild(taskElement);
        });
    }
    
    // Add a task to the UI
    function addTaskToUI(task) {
        // Only add if task belongs to selected project
        if (task.projectId !== selectedProjectId && selectedProjectId !== null) {
            return;
        }
        
        // Check if task already exists
        if (tasks.some(t => t.id === task.id)) {
            updateTaskInUI(task);
            return;
        }
        
        tasks.push(task);
        renderTasks();
    }
    
    // Update a task in the UI
    function updateTaskInUI(updatedTask) {
        const index = tasks.findIndex(task => task.id === updatedTask.id);
        if (index !== -1) {
            tasks[index] = updatedTask;
            renderTasks();
        }
    }
    
    // Load tasks for selected project
    function loadProjectTasks(projectId) {
        if (!projectId) {
            tasks = [];
            renderTasks();
            return;
        }
        
        document.querySelector('.task-form-container').classList.remove('hidden');
        
        // Try to get tasks from projects array first
        const project = projects.find(p => p.id == projectId);
        if (project && project.Tasks && project.Tasks.length > 0) {
            tasks = project.Tasks;
            renderTasks();
            return;
        }
        
        // Otherwise fetch tasks for this project from API
        fetch(`/api/projects/${projectId}/tasks`)
            .then(response => response.json())
            .then(data => {
                tasks = data;
                renderTasks();
            })
            .catch(error => {
                console.error('Error fetching tasks:', error);
                tasks = [];
                renderTasks();
            });
    }
    
    // Open task modal with details and comments
    function openTaskModal(task) {
        currentTask = task;
        
        modalTaskTitle.textContent = task.title;
        modalTaskDescription.textContent = task.description || 'Sin descripción';
        modalTaskStatus.value = task.status || 'pending';
        
        if (task.assigneeId) {
            const assignedUser = users.find(user => user.id === task.assigneeId);
            modalTaskAssignee.textContent = assignedUser ? assignedUser.username : `Usuario ${task.assigneeId}`;
        } else {
            modalTaskAssignee.textContent = 'Sin asignar';
        }
        
        // Fetch comments for this task
        fetchTaskComments(task.id);
        
        taskModal.classList.remove('hidden');
    }
    
    // Update task modal with new data
    function updateTaskModal(task) {
        if (!currentTask || currentTask.id !== task.id) {
            return;
        }
        
        modalTaskStatus.value = task.status || 'pending';
        
        if (task.assigneeId) {
            const assignedUser = users.find(user => user.id === task.assigneeId);
            modalTaskAssignee.textContent = assignedUser ? assignedUser.username : `Usuario ${task.assigneeId}`;
        } else {
            modalTaskAssignee.textContent = 'Sin asignar';
        }
    }
    
    // ----- COMMENT FUNCTIONS -----
    
    // Fetch comments for a task
    function fetchTaskComments(taskId) {
        commentsList.innerHTML = '<p class="text-gray-500 text-center">Cargando comentarios...</p>';
        
        fetch(`http://localhost:3000/api/tasks/${taskId}/comments`)
            .then(response => response.json())
            .then(comments => {
                renderComments(comments);
            })
            .catch(error => {
                console.error('Error fetching comments:', error);
                commentsList.innerHTML = '<p class="text-gray-500 text-center">Error al cargar comentarios</p>';
            });
    }
    
    // Render comments for current task
    function renderComments(comments) {
        commentsList.innerHTML = '';
        
        if (!comments || comments.length === 0) {
            commentsList.innerHTML = '<p class="text-gray-500 text-sm italic">No hay comentarios para esta tarea</p>';
            return;
        }
        
        comments.forEach(comment => {
            addCommentToUI(comment);
        });
    }
    
    // Add a comment to the UI
    function addCommentToUI(comment) {
        // Remove "no comments" message if it exists
        const noCommentsMsg = commentsList.querySelector('.text-gray-500.text-sm.italic');
        if (noCommentsMsg) {
            noCommentsMsg.remove();
        }
        
        const commentElement = commentTemplate.content.cloneNode(true);
        
        // Set comment user
        let username = 'Usuario desconocido';
        if (comment.User) {
            username = comment.User.username;
        } else if (comment.userId) {
            const user = users.find(u => u.id === comment.userId);
            if (user) {
                username = user.username;
            }
        }
        
        commentElement.querySelector('.comment-username').textContent = username;
        commentElement.querySelector('.comment-content').textContent = comment.content;
        
        // Format date if available
        if (comment.createdAt) {
            const date = new Date(comment.createdAt);
            commentElement.querySelector('.comment-date').textContent = date.toLocaleString();
        } else {
            commentElement.querySelector('.comment-date').textContent = 'Ahora';
        }
        
        // Add at the top for newest first
        commentsList.insertBefore(commentElement, commentsList.firstChild);
    }
    
    // ----- HELPER FUNCTIONS -----
    
    // Switch between tabs
    function switchToTab(tabName) {
        // Hide all sections
        sectionUsers.classList.add('hidden');
        sectionProjects.classList.add('hidden');
        sectionTasks.classList.add('hidden');
        
        // Reset all tab styles
        tabUsers.classList.remove('border-blue-500', 'text-blue-500');
        tabUsers.classList.add('border-transparent', 'text-gray-500');
        tabProjects.classList.remove('border-blue-500', 'text-blue-500');
        tabProjects.classList.add('border-transparent', 'text-gray-500');
        tabTasks.classList.remove('border-blue-500', 'text-blue-500');
        tabTasks.classList.add('border-transparent', 'text-gray-500');
        
        // Show selected section and highlight tab
        if (tabName === 'users') {
            sectionUsers.classList.remove('hidden');
            tabUsers.classList.remove('border-transparent', 'text-gray-500');
            tabUsers.classList.add('border-blue-500', 'text-blue-500');
        } else if (tabName === 'projects') {
            sectionProjects.classList.remove('hidden');
            tabProjects.classList.remove('border-transparent', 'text-gray-500');
            tabProjects.classList.add('border-blue-500', 'text-blue-500');
        } else if (tabName === 'tasks') {
            sectionTasks.classList.remove('hidden');
            tabTasks.classList.remove('border-transparent', 'text-gray-500');
            tabTasks.classList.add('border-blue-500', 'text-blue-500');
        }
    }
    
    // Get human-readable status text
    function getStatusText(status) {
        const statusMap = {
            'pending': 'Pendiente',
            'in_progress': 'En Progreso',
            'completed': 'Completada'
        };
        return statusMap[status] || 'Pendiente';
    }
    
    // Set status style classes
    function setStatusStyles(element, status) {
        // Remove existing status classes
        element.classList.remove('bg-gray-100', 'text-gray-800', 'bg-yellow-100', 'text-yellow-800', 'bg-green-100', 'text-green-800');
        
        // Add appropriate classes based on status
        if (status === 'completed') {
            element.classList.add('bg-green-100', 'text-green-800');
        } else if (status === 'in_progress') {
            element.classList.add('bg-yellow-100', 'text-yellow-800');
        } else {
            element.classList.add('bg-gray-100', 'text-gray-800');
        }
    }
    
    // Set priority style classes
    function setPriorityStyles(element, priority) {
        if (priority === 'high') {
            element.classList.add('bg-red-500');
        } else if (priority === 'medium') {
            element.classList.add('bg-yellow-500');
        } else {
            element.classList.add('bg-blue-500');
        }
    }
    
    // Format date to local string
    function formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString();
    }
    
    // ----- EVENT LISTENERS -----
    
    // Tab navigation
    tabUsers.addEventListener('click', () => switchToTab('users'));
    tabProjects.addEventListener('click', () => switchToTab('projects'));
    tabTasks.addEventListener('click', () => switchToTab('tasks'));
    
    // User form submission
    userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Send new user to server via WebSocket
        socket.send(JSON.stringify({
            type: 'create_user',
            data: {
                username: username.value,
                fullName: fullname.value,
                email: email.value
            }
        }));
        
        // Clear form
        userForm.reset();
    });
    
    // Project form submission
    projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Send new project to server via WebSocket
        socket.send(JSON.stringify({
            type: 'create_project',
            data: {
                name: projectName.value,
                description: projectDescription.value,
                deadline: projectDeadline.value || null
            }
        }));
        
        // Clear form
        projectForm.reset();
    });
    
    // Project selection change
    projectSelect.addEventListener('change', (e) => {
        selectedProjectId = e.target.value ? parseInt(e.target.value) : null;
        
        if (!selectedProjectId) {
            document.querySelector('.task-form-container').classList.add('hidden');
            tasks = [];
            renderTasks();
        } else {
            document.querySelector('.task-form-container').classList.remove('hidden');
            loadProjectTasks(selectedProjectId);
        }
    });
    
    // Task form submission
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!selectedProjectId) {
            alert('Por favor seleccione un proyecto primero');
            return;
        }
        
        // Send new task to server via WebSocket
        socket.send(JSON.stringify({
            type: 'create_task',
            data: {
                title: taskTitle.value,
                description: taskDescription.value,
                priority: taskPriority.value,
                dueDate: taskDueDate.value || null,
                assigneeId: taskAssignee.value || null,
                projectId: selectedProjectId,
                status: 'pending'
            }
        }));
        
        // Clear form
        taskForm.reset();
    });
    
    // Task status change in modal
    modalTaskStatus.addEventListener('change', (e) => {
        if (!currentTask) return;
        
        // Send status update to server via WebSocket
        socket.send(JSON.stringify({
            type: 'update_task',
            data: {
                id: currentTask.id,
                status: modalTaskStatus.value
            }
        }));
    });
    
    // Comment form submission
    commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!currentTask) return;
        
        // Get current user (for simplicity, let's use first user or create a mock user)
        const currentUserId = users.length > 0 ? users[0].id : 1;
        
        // Send new comment to server via WebSocket
        socket.send(JSON.stringify({
            type: 'new_comment',
            data: {
                content: commentContent.value,
                taskId: currentTask.id,
                userId: currentUserId
            }
        }));
        
        // Clear form
        commentForm.reset();
    });
    
    // Modal close button
    closeModal.addEventListener('click', () => {
        taskModal.classList.add('hidden');
        currentTask = null;
    });
    
    // Initialize connection
    connectWebSocket();
});