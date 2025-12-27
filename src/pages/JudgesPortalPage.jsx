import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gavel, FileText, Search, Star, BookOpen, Download, Eye } from 'lucide-react';

const JudgesPortalPage = () => {
    return (
        <>
            <Helmet>
                <title>Judges Portal - EquiPatterns</title>
                <meta name="description" content="Portal for judges to access patterns, scoresheets, and resources." />
            </Helmet>
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="container mx-auto px-4 py-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="max-w-6xl mx-auto"
                    >
                        {/* Header Section */}
                        <div className="text-center mb-12">
                            <motion.div
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6"
                            >
                                <Gavel className="h-10 w-10 text-primary" />
                            </motion.div>
                            <h1 className="text-4xl font-bold mb-4">Judges Portal</h1>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                Your dedicated portal for accessing patterns, scoresheets, and managing your judge resources.
                            </p>
                        </div>

                        {/* Quick Access Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                            >
                                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                                <Search className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <CardTitle className="text-lg">Quick Search</CardTitle>
                                        </div>
                                        <CardDescription>
                                            Find patterns and scoresheets quickly
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button className="w-full" variant="outline">
                                            <Search className="mr-2 h-4 w-4" />
                                            Search Now
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                            >
                                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                                <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                                            </div>
                                            <CardTitle className="text-lg">Score Sheets</CardTitle>
                                        </div>
                                        <CardDescription>
                                            Access and download score sheets
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button className="w-full" variant="outline">
                                            <FileText className="mr-2 h-4 w-4" />
                                            View Sheets
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.5 }}
                            >
                                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                                <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <CardTitle className="text-lg">Pattern Library</CardTitle>
                                        </div>
                                        <CardDescription>
                                            Browse official rulebook patterns
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button className="w-full" variant="outline">
                                            <BookOpen className="mr-2 h-4 w-4" />
                                            Browse Patterns
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.6 }}
                            >
                                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                                                <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                            </div>
                                            <CardTitle className="text-lg">Favorite Patterns</CardTitle>
                                        </div>
                                        <CardDescription>
                                            Manage your saved patterns
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button className="w-full" variant="outline">
                                            <Star className="mr-2 h-4 w-4" />
                                            View Favorites
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.7 }}
                            >
                                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                                <Download className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                            </div>
                                            <CardTitle className="text-lg">Download Pack</CardTitle>
                                        </div>
                                        <CardDescription>
                                            Download all required materials
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button className="w-full" variant="outline">
                                            <Download className="mr-2 h-4 w-4" />
                                            Download
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.8 }}
                            >
                                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                                                <Eye className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                                            </div>
                                            <CardTitle className="text-lg">Recent Activity</CardTitle>
                                        </div>
                                        <CardDescription>
                                            View your recent patterns and sheets
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button className="w-full" variant="outline">
                                            <Eye className="mr-2 h-4 w-4" />
                                            View Activity
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>

                        {/* Welcome Message */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.9 }}
                        >
                            <Card className="bg-muted/50">
                                <CardHeader>
                                    <CardTitle>Welcome to Judges Portal</CardTitle>
                                    <CardDescription>
                                        Access all your judge resources in one place
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground mb-4">
                                        This portal provides you with quick access to patterns, scoresheets, and tools designed specifically for judges. 
                                        Use the cards above to navigate to different sections and manage your judge resources efficiently.
                                    </p>
                                    <div className="flex gap-2">
                                        <Button>
                                            <Gavel className="mr-2 h-4 w-4" />
                                            Get Started
                                        </Button>
                                        <Button variant="outline">
                                            Learn More
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                </main>
            </div>
        </>
    );
};

export default JudgesPortalPage;

