const http = require('http');
const { WebSocketServer } = require('ws');
const url = require('url');
const sequelize = require('./database');
const models = require('./models');

// Import models
const { User, Project, Task, Comment } = models;

// Create HTTP server
const server = http.createServer((req, res) => {
  // Simple HTTP API endpoints could be implemented here
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // Enhanced CORS headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow any origin
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }
  
  // API routes
  if (path === '/api/users' && req.method === 'GET') {
    // Get all users
    User.findAll({ attributes: { exclude: ['password'] } })
      .then(users => {
        res.statusCode = 200;
        res.end(JSON.stringify(users));
      })
      .catch(error => {
        console.error('Error fetching users:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Internal server error' }));
      });
  } 
  else if (path === '/api/projects' && req.method === 'GET') {
    // Get all projects with their tasks
    Project.findAll({ include: [{ model: Task }] })
      .then(projects => {
        res.statusCode = 200;
        res.end(JSON.stringify(projects));
      })
      .catch(error => {
        console.error('Error fetching projects:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Internal server error' }));
      });
  }
  else if (path.match(/^\/api\/tasks\/\d+\/comments$/) && req.method === 'GET') {
    // Get comments for a specific task
    const taskId = path.split('/')[3];
    
    Comment.findAll({
      where: { taskId },
      include: [{ model: User, attributes: ['id', 'username'] }]
    })
      .then(comments => {
        res.statusCode = 200;
        res.end(JSON.stringify(comments));
      })
      .catch(error => {
        console.error('Error fetching comments:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Internal server error' }));
      });
  }
  else {
    // Handle 404 Not Found
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Create WebSocket server with CORS options
const wss = new WebSocketServer({ 
  server,
  // WebSocket server CORS settings
  verifyClient: (info, callback) => {
    // Allow all origins for WebSocket connections
    // In production, you might want to restrict this
    callback(true);
  }
});

// Store active connections
const clients = new Map();

// WebSocket connection handler
wss.on('connection', async (ws, req) => {
  const id = Date.now();
  clients.set(id, ws);
  
  console.log(`New client connected: ${id}`);
  
  // Send welcome message to client
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to WebSocket server',
    id: id
  }));
  
  // Send all existing data to the newly connected client
  try {
    // Fetch all users
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    
    // Fetch all projects with their tasks
    const projects = await Project.findAll({
      include: [{ model: Task }]
    });
    
    // Fetch all tasks with their comments
    const tasks = await Task.findAll({
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'username'] }, // Specify alias 'assignee'
        { 
          model: Comment, as: 'comments', // Specify alias 'comments'
          include: [{ model: User, attributes: ['id', 'username'] }]
        }
      ]
    });
    
    // Send all the data to the client
    ws.send(JSON.stringify({
      type: 'initial_data',
      data: {
        users,
        projects,
        tasks
      }
    }));
    
    console.log(`Sent initial data to client ${id}`);
  } catch (error) {
    console.error('Error sending initial data:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Error loading initial data'
    }));
  }
  
  // Handle messages from client
  ws.on('message', async (messageBuffer) => {
    try {
      const message = JSON.parse(messageBuffer.toString());
      console.log(`Received message from client ${id}:`, message);
      
      // Handle different event types
      switch (message.type) {
        case 'create_task':
        case 'new_task':
          // Create a new task
          if (message.data && message.data.title && message.data.projectId) {
            const task = await Task.create({
              title: message.data.title,
              description: message.data.description || '',
              projectId: message.data.projectId,
              assigneeId: message.data.assigneeId || null,
              priority: message.data.priority || 'medium',
              dueDate: message.data.dueDate || null,
              status: message.data.status || 'pending'
            });
            
            // Broadcast to all clients
            broadcastMessage({
              type: 'new_task',
              task: task
            });
          }
          break;
          
        case 'update_task':
        case 'update_status':
        case 'task_updated':
          // Update a task
          if (message.data && message.data.id) {
            const task = await Task.findByPk(message.data.id);
            if (task) {
              await task.update(message.data);
              
              // Broadcast to all clients
              broadcastMessage({
                type: 'task_updated',
                task: task
              });
            }
          }
          break;
          
        case 'new_comment':
          // Create a new comment
          if (message.data && message.data.content && message.data.taskId && message.data.userId) {
            const comment = await Comment.create({
              content: message.data.content,
              taskId: message.data.taskId,
              userId: message.data.userId
            });
            
            // Get comment with user data
            const commentWithUser = await Comment.findByPk(comment.id, {
              include: [{ model: User, attributes: ['id', 'username'] }]
            });
            
            // Broadcast to all clients
            broadcastMessage({
              type: 'new_comment',
              comment: commentWithUser
            });
          }
          break;
          
        case 'user_joined_project':
          // Handle user joining a project
          if (message.data && message.data.userId && message.data.projectId) {
            // In a real app, you'd add the user to the project
            // For now, just broadcast the event
            broadcastMessage({
              type: 'user_joined_project',
              data: {
                userId: message.data.userId,
                projectId: message.data.projectId
              }
            });
          }
          break;

        case 'create_user':
        case 'new_user':
          // Create a new user
          if (message.data && message.data.username && message.data.email) {
            try {
              const user = await User.create({
                username: message.data.username,
                fullName: message.data.fullName || message.data.username,
                email: message.data.email,
                password: 'default_password' // Explicitly set a default password
              });
              
              // Remove password before sending to clients
              const userDataToSend = user.toJSON();
              delete userDataToSend.password;
              
              // Broadcast to all clients
              broadcastMessage({
                type: 'new_user',
                user: userDataToSend
              });
            } catch (error) {
              console.error('Error creating user:', error);
              // Send error message back to the client that attempted to create the user
              ws.send(JSON.stringify({
                type: 'error',
                message: `Failed to create user: ${error.message}`
              }));
            }
          }
          break;
          
        case 'create_project':
        case 'new_project':
          // Create a new project
          if (message.data && message.data.name) {
            const project = await Project.create({
              name: message.data.name,
              description: message.data.description || '',
              deadline: message.data.deadline || null
            });
            
            // Broadcast to all clients
            broadcastMessage({
              type: 'new_project',
              project: project
            });
          }
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      // Send error back to client
      ws.send(JSON.stringify({
        type: 'error',
        message: `Error processing your request: ${error.message}`
      }));
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    clients.delete(id);
    console.log(`Client disconnected: ${id}`);
  });
});

// Broadcast message to all connected clients
function broadcastMessage(message) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(data);
    }
  });
}

// Sync database and start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Sync models with database
    await sequelize.sync({ force: true }); // Use force: true for development
    console.log("Database synchronized");
    
    // Start the server
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`WebSocket server is running on ws://localhost:${PORT}`);
      console.log(`CORS enabled for all origins`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();