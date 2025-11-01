import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Users, BarChart2, DollarSign, Settings, Layers, Code, HardDrive, FileText, Bot, PenTool } from 'lucide-react';
import Navigation from '@/components/Navigation';

const AdminPage = () => {
  const tools = [
    { name: 'User Management', path: '/admin/users', icon: Users, description: 'Manage users, roles, and permissions.' },
    { name: 'Role Management', path: '/admin/roles', icon: Settings, description: 'Configure user roles and their capabilities.' },
    { name: 'Show Management', path: '/admin/show-management', icon: BookOpen, description: 'Oversee all shows and events.' },
    { name: 'Association Management', path: '/admin/associations', icon: Layers, description: 'Manage recognized associations.' },
    { name: 'Discipline Management', path: '/admin/disciplines', icon: Code, description: 'Administer show disciplines.' },
    { name: 'Division Management', path: '/admin/divisions', icon: HardDrive, description: 'Organize and manage divisions.' },
    { name: 'Division Level Management', path: '/admin/division-levels', icon: BarChart2, description: 'Set up levels within divisions.' },
    { name: 'Sponsorship Packages', path: '/admin/sponsorship-packages', icon: DollarSign, description: 'Create and manage sponsorship tiers.' },
    { name: 'Pattern Extractor', path: '/admin/pattern-extractor', icon: Bot, description: 'AI-powered PDF pattern data extraction.' },
    { name: 'Manual Pattern Entry', path: '/admin/manual-pattern-entry', icon: PenTool, description: 'Manually input pattern data.' },
    { name: 'Pattern Review', path: '/admin/pattern-review', icon: FileText, description: 'Review and approve submitted patterns.' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Admin Dashboard</h1>
          <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">Welcome, Admin. Here are your tools to manage the platform.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool, index) => (
            <motion.div
              key={tool.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={tool.path} className="block h-full">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 p-6 flex flex-col h-full border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary">
                  <div className="flex items-center mb-4">
                    <div className="bg-primary/10 p-3 rounded-full mr-4">
                      <tool.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{tool.name}</h2>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 flex-grow">{tool.description}</p>
                  <div className="mt-4 text-right">
                    <span className="text-primary font-semibold">Go to tool &rarr;</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminPage;