const User = require('./User');
const Project = require('./Project');
const Task = require('./Task');
const Comment = require('./Comment');

// Define relationships between models

// User-Project relationship (User can create many projects)
User.hasMany(Project, { as: 'projects', foreignKey: 'creatorId' });
Project.belongsTo(User, { as: 'creator', foreignKey: 'creatorId' });

// User-Task relationship (User can be assigned to many tasks)
User.hasMany(Task, { as: 'assignedTasks', foreignKey: 'assigneeId' });
Task.belongsTo(User, { as: 'assignee', foreignKey: 'assigneeId' });

// Project-Task relationship (Project can have many tasks)
Project.hasMany(Task, { foreignKey: 'projectId' });
Task.belongsTo(Project, { foreignKey: 'projectId' });

// User-Comment relationship (User can make many comments)
User.hasMany(Comment, { as: 'comments', foreignKey: 'userId' });
Comment.belongsTo(User, { foreignKey: 'userId' });

// Task-Comment relationship (Task can have many comments)
Task.hasMany(Comment, { as: 'comments', foreignKey: 'taskId' });
Comment.belongsTo(Task, { foreignKey: 'taskId' });

module.exports = {
  User,
  Project,
  Task,
  Comment
};