import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Info, Calendar, DollarSign, Building2, List, BarChart2, Users, Briefcase, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { useToast } from '@/components/ui/use-toast';

const modules = [
  {
    icon: PlusCircle,
    title: 'Create New Show',
    description: 'Start a new horse show project from scratch.',
    link: '/horse-show-manager/create',
  },
  {
    icon: Info,
    title: 'Show Information',
    description: 'Manage general details, venue, and staff for a show.',
    link: '/horse-show-manager/show-information',
  },
  {
    icon: Calendar,
    title: 'Employee/Arena Scheduling',
    description: 'Efficiently manage staff and arena schedules.',
    link: '/horse-show-manager/employee-scheduling',
  },
  {
    icon: DollarSign,
    title: 'Horse Show Financials',
    description: 'Track revenue, expenses, and overall profitability.',
    link: '#',
    unimplemented: true,
  },
  {
    icon: Building2,
    title: 'Stalling Service Manager',
    description: 'Handle stall, RV, and vendor reservations.',
    link: '/horse-show-manager/stalling-service-manager',
  },
  {
    icon: List,
    title: 'My Shows',
    description: 'View and manage all your created horse shows.',
    link: '/admin/show-management',
  },
  {
    icon: BarChart2,
    title: 'Show Analytics',
    description: 'Analyze entry data, class popularity, and trends.',
    link: '#',
    unimplemented: true,
  },
  {
    icon: Users,
    title: 'Exhibitor Management',
    description: 'Manage exhibitor information and entries.',
    link: '#',
    unimplemented: true,
  },
];

const ModuleCard = ({ icon: Icon, title, description, link, unimplemented }) => {
  const { toast } = useToast();

  const handleClick = (e) => {
    if (unimplemented) {
      e.preventDefault();
      toast({
        title: 'Coming Soon!',
        description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
      });
    }
  };

  return (
    <motion.div whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }} className="h-full">
      <Card className="h-full flex flex-col text-center items-center justify-between p-6">
        <CardHeader className="p-0 items-center">
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-2 mb-4 flex-grow">
          <p className="text-muted-foreground">{description}</p>
        </CardContent>
        <Button asChild onClick={handleClick}>
          <Link to={link}>Get Started</Link>
        </Button>
      </Card>
    </motion.div>
  );
};

const HorseShowManagerPage = () => {
  return (
    <>
      <Helmet>
        <title>Horse Show Manager - EquiPatterns</title>
        <meta name="description" content="Your all-in-one solution for seamless horse show administration." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-sky-400">
              Horse Show Manager
            </h1>
            <p className="text-xl text-muted-foreground">
              Your all-in-one solution for seamless horse show administration.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {modules.map((module, index) => (
              <motion.div 
                key={module.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ModuleCard {...module} />
              </motion.div>
            ))}
          </div>

          {/* Employee Management Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-12"
          >
            <Card className="p-6">
              <CardHeader className="p-0 mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Briefcase className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-semibold">Employee Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-secondary/50 p-2 rounded-full">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg">Contract Management</h3>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">
                      Manage employee contracts, agreements, and documentation.
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      View Contracts
                    </Button>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default HorseShowManagerPage;