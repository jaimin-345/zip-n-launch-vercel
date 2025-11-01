import React from 'react';
import { Helmet } from 'react-helmet-async';
import Navigation from '@/components/Navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, UserCheck, Briefcase, CreditCard, Map, Phone as MobileIcon, MessageSquare, GitMerge, PackagePlus, Users, TrendingUp, BarChart, Smartphone, HeartHandshake, Server, Link as LinkIcon, ShieldCheck, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

const StallingServiceManagerPage = () => {
    const { toast } = useToast();

    const handleFeatureClick = (featureName) => {
        toast({
            title: `🚀 ${featureName}`,
            description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
        });
    };

    const managementFeatures = [
        { name: "Stall & RV Reservations", icon: Home, description: "Manage online reservations for stalls and RV spots." },
        { name: "Assignment & Scheduling", icon: UserCheck, description: "Flexible options for stall and RV spot assignment." },
        { name: "Trade Show Vendors", icon: Briefcase, description: "Handle vendor booth registration and management." },
        { name: "Integrated Payments & Finance", icon: CreditCard, description: "Track all financial transactions in one dashboard." },
    ];

    const uxFeatures = [
        { name: "Interactive Facility Maps", icon: Map, description: "Visual maps for users to select specific stall or RV locations." },
        { name: "Mobile Accessibility", icon: MobileIcon, description: "Ensure the platform is seamless on all mobile devices." },
        { name: "Smooth Check-In & Communication", icon: MessageSquare, description: "Streamline on-site check-in and automated communications." },
    ];

    const innovativeFeatures = [
        { name: "Horse Show Integration", icon: GitMerge, description: "Integrate with show entry systems for a unified experience." },
        { name: "Add-On Products & Services", icon: PackagePlus, description: "Offer pre-orders for shavings, feed, and other services." },
        { name: "Group and Trainer Tools", icon: Users, description: "Enable group reservations and management for trainers." },
        { name: "Dynamic Pricing & Incentives", icon: TrendingUp, description: "Implement early-bird pricing and dynamic rate adjustments." },
        { name: "Data Analytics & Optimization", icon: BarChart, description: "Provide insights on occupancy, revenue, and popular add-ons." },
        { name: "Enhanced On-Site Experience", icon: Smartphone, description: "Offer a digital 'stall dashboard' for exhibitors." },
        { name: "Community & Networking", icon: HeartHandshake, description: "Connect exhibitors with a community bulletin board." },
    ];

    const globalFeatures = [
        { name: "Scalability for All Sizes", icon: Server, description: "Handle events from small local shows to large international ones." },
        { name: "Integration with Other Systems", icon: LinkIcon, description: "Connect with entry, scoring, and membership databases." },
        { name: "Data Security & Reliability", icon: ShieldCheck, description: "Ensure paramount security for payments and personal data." },
        { name: "Global Support & Localization", icon: Globe, description: "Multi-language, multi-currency, and regional support." },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <>
            <Helmet>
                <title>Stalling Service Manager - Horse Show Manager</title>
                <meta name="description" content="A comprehensive stalling and RV services platform for horse shows." />
            </Helmet>
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
                                    Stalling Service Manager
                                </h1>
                                <p className="text-xl text-muted-foreground max-w-3xl mt-2">
                                    Building a Stalling & RV Services Platform for Horse Shows.
                                </p>
                            </div>
                            <Button asChild variant="outline">
                                <Link to="/horse-show-manager">Back to Manager</Link>
                            </Button>
                        </div>
                    </motion.div>
                    
                    <div className="space-y-12">
                        <div>
                            <h2 className="text-3xl font-bold mb-6 border-b pb-3">All-in-One Management</h2>
                            <motion.div 
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                {managementFeatures.map((feature) => (
                                     <motion.div key={feature.name} variants={itemVariants}>
                                        <Card className="h-full flex flex-col hover:border-primary/70 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                                            <CardHeader className="flex flex-col items-center text-center">
                                                <div className="p-4 bg-primary/10 rounded-full mb-4">
                                                    <feature.icon className="h-8 w-8 text-primary" />
                                                </div>
                                                <CardTitle>{feature.name}</CardTitle>
                                                <CardDescription className="pt-2 min-h-[40px]">{feature.description}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="mt-auto flex justify-center">
                                                <Button onClick={() => handleFeatureClick(feature.name)}>Get Started</Button>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>

                        <div>
                            <h2 className="text-3xl font-bold mb-6 border-b pb-3">Intuitive User Experience</h2>
                            <motion.div 
                                className="grid grid-cols-1 md:grid-cols-3 gap-6"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                {uxFeatures.map((feature) => (
                                    <motion.div key={feature.name} variants={itemVariants}>
                                        <Card className="h-full flex flex-col hover:border-primary/70 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                                            <CardHeader className="flex flex-col items-center text-center">
                                                <div className="p-4 bg-primary/10 rounded-full mb-4">
                                                    <feature.icon className="h-8 w-8 text-primary" />
                                                </div>
                                                <CardTitle>{feature.name}</CardTitle>
                                                <CardDescription className="pt-2 min-h-[40px]">{feature.description}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="mt-auto flex justify-center">
                                                <Button onClick={() => handleFeatureClick(feature.name)}>Get Started</Button>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>

                        <div>
                            <h2 className="text-3xl font-bold mb-6 border-b pb-3">Innovative Features & Value-Added Services</h2>
                            <motion.div 
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                {innovativeFeatures.map((feature) => (
                                    <motion.div key={feature.name} variants={itemVariants}>
                                        <Card className="h-full flex flex-col hover:border-primary/70 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                                            <CardHeader className="flex flex-col items-center text-center">
                                                <div className="p-4 bg-primary/10 rounded-full mb-4">
                                                    <feature.icon className="h-8 w-8 text-primary" />
                                                </div>
                                                <CardTitle>{feature.name}</CardTitle>
                                                <CardDescription className="pt-2 min-h-[60px]">{feature.description}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="mt-auto flex justify-center">
                                                <Button onClick={() => handleFeatureClick(feature.name)}>Get Started</Button>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>

                        <div>
                            <h2 className="text-3xl font-bold mb-6 border-b pb-3">Scalability, Integration, & Global Considerations</h2>
                            <motion.div 
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                {globalFeatures.map((feature) => (
                                     <motion.div key={feature.name} variants={itemVariants}>
                                        <Card className="h-full flex flex-col hover:border-primary/70 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                                            <CardHeader className="flex flex-col items-center text-center">
                                                <div className="p-4 bg-primary/10 rounded-full mb-4">
                                                    <feature.icon className="h-8 w-8 text-primary" />
                                                </div>
                                                <CardTitle>{feature.name}</CardTitle>
                                                <CardDescription className="pt-2 min-h-[60px]">{feature.description}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="mt-auto flex justify-center">
                                                <Button onClick={() => handleFeatureClick(feature.name)}>Get Started</Button>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default StallingServiceManagerPage;