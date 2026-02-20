import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, Building, Plane, MessageSquare, ArrowLeft, Save } from 'lucide-react';

const EmployeeArenaSchedulingManagerPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleFeatureClick = (featureName) => {
        toast({
            title: featureName,
            description: "This feature is coming soon!",
        });
    };

    const features = [
        {
            name: "Employee Management",
            icon: Users,
            description: "Manage all staff, roles, and certifications.",
        },
        {
            name: "Venue & Arena Setup",
            icon: Building,
            description: "Configure show venues and specific arenas.",
        },
        {
            name: "Travel Management",
            icon: Plane,
            description: "Hotels, flights, and rental cars — your complete travel hub.",
        },
        // Equipment Checkout moved to Horse Show Management section
        // {
        //     name: "Equipment Checkout",
        //     icon: Radio,
        //     description: "Check in/out radios, laptops, and gear with real-time status tracking.",
        // },
        {
            name: "Communications Log",
            icon: MessageSquare,
            description: "Audit log for all SMS and email notifications.",
        },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <>
            <Helmet>
                <title>Employee & Arena Scheduling - Horse Show Manager</title>
                <meta name="description" content="Manage staff, venues, travel, equipment, and communications for horse shows." />
            </Helmet>
            <div className="min-h-screen bg-background">
                <Navigation />

                <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex justify-between items-center mb-6">
                        <Button variant="outline" onClick={() => navigate('/horse-show-manager')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Manager
                        </Button>
                    </div>
                    {/* Module cards — 2-3 column centered grid */}
                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {features.map((feature) => (
                            <motion.div key={feature.name} variants={itemVariants}>
                                <Card className="h-full flex flex-col hover:border-primary/70 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-primary/10 rounded-lg">
                                                <feature.icon className="h-6 w-6 text-primary" />
                                            </div>
                                            <CardTitle className="text-lg">{feature.name}</CardTitle>
                                        </div>
                                        <CardDescription className="pt-2">{feature.description}</CardDescription>
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