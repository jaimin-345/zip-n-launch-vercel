import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AuthModal = () => {
    const { isAuthModalOpen, authModalInitialTab, closeAuthModal, signIn, signUp, sendPasswordResetEmail } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(authModalInitialTab);
    const [view, setView] = useState('tabs'); // 'tabs' or 'forgot_password'
    
    // Form States
    const [signInEmail, setSignInEmail] = useState('');
    const [signInPassword, setSignInPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showSignInPassword, setShowSignInPassword] = useState(false);
    
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [signUpEmail, setSignUpEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [signUpPassword, setSignUpPassword] = useState('');
    const [showSignUpPassword, setShowSignUpPassword] = useState(false);

    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

    useEffect(() => {
        if (isAuthModalOpen) {
            setView('tabs');
            setActiveTab(authModalInitialTab);
        }
    }, [isAuthModalOpen, authModalInitialTab]);

    const handleSignIn = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const { error } = await signIn(signInEmail, signInPassword);
        if (!error) {
            toast({ title: "Welcome back!", description: "You've been successfully signed in." });
            // 'rememberMe' is handled by Supabase's localStorage strategy by default
            closeAuthModal();
        }
        setIsLoading(false);
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        if (signUpPassword.length < 6) {
            toast({ title: "Weak Password", description: "Your password must be at least 6 characters long.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        const { error } = await signUp(signUpEmail, signUpPassword, { firstName, lastName, mobile });
        if (!error) {
            // Toast is shown in context based on confirmation email requirement
            closeAuthModal();
        }
        setIsLoading(false);
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        await sendPasswordResetEmail(forgotPasswordEmail);
        setIsLoading(false);
        setView('tabs');
    };
    
    const onOpenChange = (open) => {
        if (!open) {
            closeAuthModal();
            // Reset all form fields
            setSignInEmail('');
            setSignInPassword('');
            setRememberMe(false);
            setFirstName('');
            setLastName('');
            setSignUpEmail('');
            setMobile('');
            setSignUpPassword('');
            setForgotPasswordEmail('');
            setIsLoading(false);
            setShowSignInPassword(false);
            setShowSignUpPassword(false);
        }
    };
    
    const pageVariants = {
      initial: { opacity: 0, x: 50 },
      in: { opacity: 1, x: 0 },
      out: { opacity: 0, x: -50 },
    };

    const pageTransition = {
      type: 'tween',
      ease: 'anticipate',
      duration: 0.4,
    };

    return (
        <Dialog open={isAuthModalOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                <AnimatePresence initial={false} mode="wait">
                    {view === 'tabs' && (
                        <motion.div key="tabs" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                            <DialogHeader className="p-6 pb-0">
                                <DialogTitle className="text-2xl font-bold">Welcome!</DialogTitle>
                                <DialogDescription>
                                    Sign in or create an account to unlock all features.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="p-6">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="signin">Sign In</TabsTrigger>
                                        <TabsTrigger value="signup">Sign Up</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="signin" className="pt-4">
                                        <form onSubmit={handleSignIn} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="email-signin">Email</Label>
                                                <Input id="email-signin" type="email" placeholder="you@example.com" required value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="password-signin">Password</Label>
                                                <div className="relative">
                                                    <Input id="password-signin" type={showSignInPassword ? "text" : "password"} required value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} />
                                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowSignInPassword(!showSignInPassword)}>
                                                        {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={setRememberMe} />
                                                    <Label htmlFor="remember-me" className="text-sm font-normal">Remember me</Label>
                                                </div>
                                                <Button variant="link" type="button" onClick={() => setView('forgot_password')} className="p-0 h-auto text-sm">Forgot password?</Button>
                                            </div>
                                            <Button type="submit" className="w-full" disabled={isLoading}>
                                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sign In'}
                                            </Button>
                                        </form>
                                    </TabsContent>
                                    <TabsContent value="signup" className="pt-4">
                                        <form onSubmit={handleSignUp} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="first-name">First Name</Label>
                                                    <Input id="first-name" placeholder="John" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="last-name">Last Name</Label>
                                                    <Input id="last-name" placeholder="Doe" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email-signup">Email</Label>
                                                <Input id="email-signup" type="email" placeholder="you@example.com" required value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="mobile">Mobile Number (Optional)</Label>
                                                <Input id="mobile" type="tel" placeholder="(123) 456-7890" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="password-signup">Password</Label>
                                                 <div className="relative">
                                                    <Input id="password-signup" type={showSignUpPassword ? "text" : "password"} required value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} />
                                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowSignUpPassword(!showSignUpPassword)}>
                                                        {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground">Must be at least 6 characters.</p>
                                            </div>
                                             <Button type="submit" className="w-full" disabled={isLoading}>
                                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create Account'}
                                            </Button>
                                        </form>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </motion.div>
                    )}
                    {view === 'forgot_password' && (
                        <motion.div key="forgot" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                            <DialogHeader className="p-6 pb-0">
                                <DialogTitle className="text-2xl font-bold">Forgot Password?</DialogTitle>
                                <DialogDescription>
                                    Enter your email and we'll send you a link to reset it.
                                </DialogDescription>
                            </DialogHeader>
                             <div className="p-6">
                                <form onSubmit={handleForgotPassword} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email-forgot">Email</Label>
                                        <Input id="email-forgot" type="email" placeholder="you@example.com" required value={forgotPasswordEmail} onChange={(e) => setForgotPasswordEmail(e.target.value)} />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Reset Link'}
                                    </Button>
                                    <Button variant="link" type="button" onClick={() => setView('tabs')} className="w-full">Back to Sign In</Button>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
};

export default AuthModal;