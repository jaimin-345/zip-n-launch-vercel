import React from 'react';
import { Helmet } from 'react-helmet-async';
import Navigation from '@/components/Navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, UserCheck, Briefcase, CreditCard, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Link, useNavigate } from 'react-router-dom';

const StallingServiceManagerPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleFeatureClick = (featureName) => {
        toast({
            title: featureName,
            description: "This feature is coming soon!",
        });
    };

    const features = [
        { name: "Stall & RV Reservations", icon: Home, description: "Manage online reservations for stalls and RV spots." },
        { name: "Assignment & Scheduling", icon: UserCheck, description: "Flexible options for stall and RV spot assignment." },
        { name: "Trade Show Vendors", icon: Briefcase, description: "Handle vendor booth registration and management." },
        { name: "Integrated Payments & Finance", icon: CreditCard, description: "Track all financial transactions in one dashboard." },
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
                <title>Stalling Service Manager - Horse Show Manager</title>
                <meta name="description" content="A comprehensive stalling and RV services platform for horse shows." />
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
                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
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

export default StallingServiceManagerPage;

/* ═══════════════════════════════════════════════════════════════════════════
   PRESERVED FEATURE DATA — kept for future implementation
   ═══════════════════════════════════════════════════════════════════════════

import { Map, Phone as MobileIcon, MessageSquare, GitMerge, PackagePlus, Users, TrendingUp, BarChart, Smartphone, HeartHandshake, Server, Link as LinkIcon, ShieldCheck, Globe } from 'lucide-react';

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

══════════════════════════════════════════════════════════════════════════ */
