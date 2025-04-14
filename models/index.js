const User = require('./User');
const Project = require('./Project');
const Task = require('./Task');
const Comment = require('./Comment');

// Define relationships between models

// User-Project relationship (User can create many projects)
User.hasMany(Project, { as: 'projects', foreignKey: 'creatorId', onDelete: 'CASCADE' });
Project.belongsTo(User, { as: 'creator', foreignKey: 'creatorId', onDelete: 'CASCADE' });

// User-Task relationship (User can be assigned to many tasks)
User.hasMany(Task, { as: 'assignedTasks', foreignKey: 'assigneeId', onDelete: 'CASCADE' });
Task.belongsTo(User, { as: 'assignee', foreignKey: 'assigneeId', onDelete: 'CASCADE' });

// Project-Task relationship (Project can have many tasks)
Project.hasMany(Task, { foreignKey: 'projectId', onDelete: 'CASCADE' });
Task.belongsTo(Project, { foreignKey: 'projectId', onDelete: 'CASCADE' });

// User-Comment relationship (User can make many comments)
User.hasMany(Comment, { as: 'comments', foreignKey: 'userId', onDelete: 'CASCADE' });
Comment.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });

// Task-Comment relationship (Task can have many comments)
Task.hasMany(Comment, { as: 'comments', foreignKey: 'taskId', onDelete: 'CASCADE' });
Comment.belongsTo(Task, { foreignKey: 'taskId', onDelete: 'CASCADE' });

module.exports = {
  User,
  Project,
  Task,
  Comment
};