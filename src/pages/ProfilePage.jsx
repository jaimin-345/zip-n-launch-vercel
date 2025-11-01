import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, User, AlertTriangle } from 'lucide-react';

const ProfilePage = () => {
    const { user, loading, updateUserProfile, openAuthModal } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [mobile, setMobile] = useState('');

    useEffect(() => {
        if (!loading && !user) {
            // Redirect or show login prompt if not logged in
        } else if (user) {
            setFirstName(user.user_metadata?.first_name || '');
            setLastName(user.user_metadata?.last_name || '');
            setMobile(user.user_metadata?.mobile || '');
        }
    }, [user, loading, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const metadata = {
            first_name: firstName,
            last_name: lastName,
            mobile: mobile,
            full_name: `${firstName} ${lastName}`.trim(),
        };

        await updateUserProfile(metadata);
        setIsSubmitting(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="container mx-auto px-4 py-8 text-center">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <Card className="max-w-lg mx-auto">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-center gap-2"><AlertTriangle className="h-6 w-6 text-destructive" /> Access Denied</CardTitle>
                                <CardDescription>You need to be logged in to edit your profile.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="mb-4">Please log in or create an account to continue.</p>
                                <Button onClick={() => openAuthModal('login')}>
                                    <User className="mr-2 h-4 w-4" /> Login / Sign Up
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </main>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Edit Profile - EquiPatterns</title>
                <meta name="description" content="Manage your profile details." />
            </Helmet>
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="container mx-auto px-4 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="max-w-2xl mx-auto"
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-3xl">Edit Profile</CardTitle>
                                <CardDescription>Update your personal information. Your email is <span className="font-semibold">{user.email}</span>.</CardDescription>
                            </CardHeader>
                            <form onSubmit={handleSubmit}>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="first-name">First Name</Label>
                                            <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="last-name">Last Name</Label>
                                            <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="mobile">Mobile Number</Label>
                                        <Input id="mobile" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="(123) 456-7890" />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </motion.div>
                </main>
            </div>
        </>
    );
};

export default ProfilePage;