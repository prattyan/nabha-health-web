import React, { useState } from 'react';
import { CheckCircle, Circle, AlertCircle, Plus, Trash2, Edit2, Calendar } from 'lucide-react';
import { StorageService } from '../../services/storageService';
import type { AdminTask } from '../../types/admin';

interface AdminTasksCardProps {
  adminId: string;
  isLoading?: boolean;
}

export default function AdminTasksCard({ adminId, isLoading = false }: AdminTasksCardProps) {
  const storageService = StorageService.getInstance();
  const [showAddTask, setShowAddTask] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'monitoring' as 'monitoring' | 'maintenance' | 'reporting' | 'compliance',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    dueDate: '',
  });

  const getTasks = (): AdminTask[] => {
    try {
      const tasksStr = storageService.getItem('admin_tasks');
      const tasks = tasksStr ? JSON.parse(tasksStr) : [];
      return tasks.filter((task: AdminTask) => task.assignedTo === adminId);
    } catch {
      return [];
    }
  };

  const saveTasks = (tasks: AdminTask[]) => {
    try {
      const allTasks = JSON.parse(storageService.getItem('admin_tasks') || '[]');
      const otherTasks = allTasks.filter((task: AdminTask) => task.assignedTo !== adminId);
      storageService.setItem('admin_tasks', JSON.stringify([...otherTasks, ...tasks]));
    } catch {
      storageService.setItem('admin_tasks', JSON.stringify(tasks));
    }
  };

  const handleAddTask = () => {
    if (!newTask.title.trim() || !newTask.dueDate) {
      alert('Please fill in title and due date');
      return;
    }

    const task: AdminTask = {
      id: `TASK-${Date.now()}`,
      title: newTask.title,
      description: newTask.description,
      category: newTask.category,
      priority: newTask.priority,
      status: 'pending',
      assignedTo: adminId,
      createdAt: new Date().toISOString(),
      dueDate: newTask.dueDate,
    };

    const tasks = getTasks();
    saveTasks([...tasks, task]);

    // Log activity
    const activities = JSON.parse(storageService.getItem('activity_logs') || '[]');
    activities.push({
      id: Date.now().toString(),
      action: 'Task Created',
      timestamp: new Date().toISOString(),
      userId: adminId,
      details: `Created task: ${newTask.title}`,
    });
    storageService.setItem('activity_logs', JSON.stringify(activities));

    setNewTask({
      title: '',
      description: '',
      category: 'monitoring',
      priority: 'medium',
      dueDate: '',
    });
    setShowAddTask(false);
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: AdminTask['status']) => {
    const tasks = getTasks();
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            status: newStatus,
            completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
          }
        : task
    );
    saveTasks(updatedTasks);

    // Log activity
    const activities = JSON.parse(storageService.getItem('activity_logs') || '[]');
    activities.push({
      id: Date.now().toString(),
      action: 'Task Updated',
      timestamp: new Date().toISOString(),
      userId: adminId,
      details: `Updated task status to: ${newStatus}`,
    });
    storageService.setItem('activity_logs', JSON.stringify(activities));
  };

  const handleDeleteTask = (taskId: string) => {
    const tasks = getTasks();
    const filteredTasks = tasks.filter(task => task.id !== taskId);
    saveTasks(filteredTasks);

    // Log activity
    const activities = JSON.parse(storageService.getItem('activity_logs') || '[]');
    activities.push({
      id: Date.now().toString(),
      action: 'Task Deleted',
      timestamp: new Date().toISOString(),
      userId: adminId,
      details: `Deleted task: ${taskId}`,
    });
    storageService.setItem('activity_logs', JSON.stringify(activities));
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const tasks = getTasks();
  const filteredTasks = filterStatus === 'all' 
    ? tasks 
    : tasks.filter(task => task.status === filterStatus);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;

  const getPriorityColor = (priority: AdminTask['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getStatusColor = (status: AdminTask['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in_progress':
        return 'text-blue-600';
      case 'blocked':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getCategoryIcon = (category: AdminTask['category']) => {
    switch (category) {
      case 'monitoring':
        return '📊';
      case 'maintenance':
        return '🔧';
      case 'reporting':
        return '📄';
      case 'compliance':
        return '✅';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">My Admin Tasks</h3>
          <button
            onClick={() => setShowAddTask(!showAddTask)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </button>
        </div>

        {/* Task Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Total Tasks</p>
            <p className="text-2xl font-bold text-blue-600">{tasks.length}</p>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-2xl font-bold text-purple-600">{inProgressCount}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          </div>
        </div>
      </div>

      {/* Add Task Form */}
      {showAddTask && (
        <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-indigo-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Create New Task</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Task title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Task description"
                rows={3}
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newTask.category}
                  onChange={(e) => setNewTask({ ...newTask, category: e.target.value as AdminTask['category'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="monitoring">Monitoring</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="reporting">Reporting</option>
                  <option value="compliance">Compliance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as AdminTask['priority'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleAddTask}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Create Task
              </button>
              <button
                onClick={() => setShowAddTask(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex border-b">
          {(['all', 'pending', 'in_progress', 'completed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-3 font-medium text-sm ${
                filterStatus === status
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Tasks List */}
        <div className="p-6 space-y-4">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3 flex-1">
                    <button
                      onClick={() =>
                        handleUpdateTaskStatus(
                          task.id,
                          task.status === 'completed' ? 'pending' : 'completed'
                        )
                      }
                      className={getStatusColor(task.status)}
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <Circle className="h-6 w-6" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xl">{getCategoryIcon(task.category)}</span>
                        <h4
                          className={`font-semibold text-gray-900 ${
                            task.status === 'completed' ? 'line-through text-gray-500' : ''
                          }`}
                        >
                          {task.title}
                        </h4>
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        {task.completedAt && (
                          <>
                            <span>•</span>
                            <span>Completed: {new Date(task.completedAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                      className={`p-2 rounded hover:bg-blue-50 ${
                        task.status === 'in_progress' ? 'bg-blue-100' : ''
                      }`}
                      title="Mark as in progress"
                    >
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 rounded hover:bg-red-50"
                      title="Delete task"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                {filterStatus === 'all' 
                  ? 'No tasks yet. Create one to get started!' 
                  : `No ${filterStatus.replace('_', ' ')} tasks`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
