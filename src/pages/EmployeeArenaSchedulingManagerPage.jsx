import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { 
    Users, Building, Hotel, Briefcase, Calendar, Clock, Plane, ClipboardList, 
    Radio, MessageSquare, DollarSign, FileText, Search, Settings 
} from 'lucide-react';

const EmployeeArenaSchedulingManagerPage = () => {
    const { toast } = useToast();

    const handleFeatureClick = (featureName) => {
        toast({
            title: `🚀 ${featureName}`,
            description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
        });
    };

    const features = [
        { name: "Employee Management", icon: Users, description: "Manage all staff, roles, and certifications.", link: "#" },
        { name: "Venue & Arena Setup", icon: Building, description: "Configure show venues and specific arenas.", link: "#" },
        { name: "Hotel Management", icon: Hotel, description: "Manage hotel blocks and staff accommodation.", link: "#" },
        { name: "Demand Planning", icon: Briefcase, description: "Create staffing templates and generate assignments.", link: "#" },
        { name: "Live Schedule Board", icon: Calendar, description: "Drag-and-drop scheduling with conflict checks.", link: "#" },
        { name: "Timesheet & Payroll", icon: Clock, description: "Track hours, manage approvals, and export for payroll.", link: "#" },
        { name: "Travel Coordination", icon: Plane, description: "Organize flights, rentals, and arrivals.", link: "#" },
        { name: "Task Management", icon: ClipboardList, description: "Assign and track micro-tasks for each shift.", link: "#" },
        { name: "Equipment Checkout", icon: Radio, description: "Track radios, laptops, and other equipment.", link: "#" },
        { name: "Communications Log", icon: MessageSquare, description: "Audit log for all SMS/email notifications.", link: "#" },
        { name: "Pay Rate Configuration", icon: DollarSign, description: "Set hourly, daily, and per-show pay rates.", link: "#" },
        { name: "Comprehensive Reporting", icon: FileText, description: "Generate reports for payroll, occupancy, and more.", link: "#" },
        { name: "Universal Search", icon: Search, description: "Faceted search across all scheduling data.", link: "#" },
        { name: "System Settings", icon: Settings, description: "Configure roles, pay rates, and templates.", link: "#" },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <>
            <Helmet>
                <title>Employee & Arena Scheduling Manager - Horse Show Manager</title>
                <meta name="description" content="Efficiently manage staff and arena schedules for horse shows." />
            </Helmet>
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
                                    Employee & Arena Scheduling
                                </h1>
                                <p className="text-xl text-muted-foreground max-w-3xl mt-2">
                                    Your central command for all show staffing and scheduling logistics.
                                </p>
                            </div>
                            <Button asChild variant="outline">
                                <Link to="/horse-show-manager">Back to Manager</Link>
                            </Button>
                        </div>
                    </motion.div>
                    
                    <motion.div 
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {features.map((feature) => (
                             <motion.div key={feature.name} variants={itemVariants}>
                                <Card className="h-full flex flex-col hover:border-primary/70 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                                    <CardHeader>
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-primary/10 rounded-lg">
                                                <feature.icon className="h-6 w-6 text-primary" />
                                            </div>
                                            <CardTitle>{feature.name}</CardTitle>
                                        </div>
                                        <CardDescription className="pt-2 min-h-[40px]">{feature.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="mt-auto">
                                        <Button className="w-full" onClick={() => handleFeatureClick(feature.name)}>
                                            Open
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </main>
            </div>
        </>
    );
};

export default EmployeeArenaSchedulingManagerPage;