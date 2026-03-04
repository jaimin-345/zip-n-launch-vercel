import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft, Plane } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';

const EmployeeManagementPage = () => {
  return (
    <>
      <Helmet>
        <title>Employee Management - EquiPatterns</title>
        <meta name="description" content="Manage employees, contracts, and staff documentation." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mb-8"
          >
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/horse-show-manager">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Horse Show Manager
              </Link>
            </Button>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-sky-400">
              Employee Management
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage employees, contracts, and staff documentation.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
              className="h-full"
            >
              <Card className="h-full flex flex-col text-center items-center justify-between p-6">
                <CardHeader className="p-0 items-center">
                  <div className="bg-primary/10 p-3 rounded-full mb-4">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold">Contract Management</CardTitle>
                </CardHeader>
                <CardContent className="p-0 mt-2 mb-4 flex-grow">
                  <p className="text-muted-foreground">Manage employee contracts, agreements, and documentation.</p>
                </CardContent>
                <Button asChild>
                  <Link to="/horse-show-manager/employee-management/contracts">
                    Get Started
                  </Link>
                </Button>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
              className="h-full"
            >
              <Card className="h-full flex flex-col text-center items-center justify-between p-6">
                <CardHeader className="p-0 items-center">
                  <div className="bg-blue-500/10 p-3 rounded-full mb-4">
                    <Plane className="h-8 w-8 text-blue-500" />
                  </div>
                  <CardTitle className="text-xl font-semibold">Travel Management</CardTitle>
                </CardHeader>
                <CardContent className="p-0 mt-2 mb-4 flex-grow">
                  <p className="text-muted-foreground">Manage flights, hotels, and rental cars for show personnel.</p>
                </CardContent>
                <Button asChild>
                  <Link to="/horse-show-manager/travel-management">
                    Get Started
                  </Link>
                </Button>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    </>
  );
};

export default EmployeeManagementPage;
