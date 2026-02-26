import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Check, Crown, Star, Zap, Loader2, BookOpen, Gift } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/components/ui/use-toast';

const membershipTiers = [
  {
    key: 'membership_founding_insider',
    name: 'Founding Insider',
    price: '$39.99',
    period: '/first year',
    renewalNote: 'Then $79/year after first year',
    badge: 'Limited — First 50',
    icon: Crown,
    highlighted: true,
    features: [
      'All standard membership features',
      'First year just $39.99, then $79/year',
      'Founding Insider badge on profile',
      '3 free pattern books per year',
      'Early access to new features',
      'Priority support',
    ],
  },
  {
    key: 'membership_founding_member',
    name: 'Founding Member',
    price: '$79.99',
    period: '/year',
    renewalNote: 'Renews annually at $79.99/year',
    badge: 'Next 950 Members',
    icon: Star,
    highlighted: false,
    features: [
      'All standard membership features',
      'Founding Member badge on profile',
      '3 free pattern books per year',
      'Early access to new features',
    ],
  },
  {
    key: 'membership_standard',
    name: 'Standard',
    price: '$99.99',
    period: '/year',
    renewalNote: 'Subject to change',
    badge: null,
    icon: Zap,
    highlighted: false,
    features: [
      'Full pattern library access',
      'Pattern Book Builder',
      'Horse Show Manager tools',
      '3 free pattern books per year',
      'Score sheet generator',
      'Community features',
    ],
  },
];

const patternBooks = [
  {
    key: 'pattern_book_basic',
    name: 'Pattern Book — Basic',
    subtitle: '4-H / Open / Single Judge',
    price: '$39.99',
    period: 'one-time',
    icon: BookOpen,
  },
  {
    key: 'pattern_book_full',
    name: 'Pattern Book — Full',
    subtitle: 'All associations & judges',
    price: '$99.99',
    period: '/month',
    icon: BookOpen,
  },
];

const PricingPage = () => {
  const { user, openAuthModal, isSubscribed, subscriptionTier } = useAuth();
  const { createCheckoutSession, checkoutLoading } = useSubscription();
  const { toast } = useToast();
  const [loadingKey, setLoadingKey] = useState(null);

  const handleSubscribe = async (tierKey) => {
    if (!user) {
      openAuthModal('signup');
      return;
    }

    if (isSubscribed) {
      toast({
        title: 'Already Subscribed',
        description: 'You already have an active membership. Manage it from your profile.',
      });
      return;
    }

    setLoadingKey(tierKey);
    try {
      await createCheckoutSession(tierKey);
    } catch (error) {
      toast({
        title: 'Checkout Error',
        description: error.message,
        variant: 'destructive',
      });
      setLoadingKey(null);
    }
  };

  const handlePurchase = async (productKey) => {
    if (!user) {
      openAuthModal('signup');
      return;
    }

    setLoadingKey(productKey);
    try {
      await createCheckoutSession(productKey);
    } catch (error) {
      toast({
        title: 'Checkout Error',
        description: error.message,
        variant: 'destructive',
      });
      setLoadingKey(null);
    }
  };

  const getTierBadgeForUser = (tierKey) => {
    if (!isSubscribed) return null;
    const tierMap = {
      membership_founding_insider: 'founding_insider',
      membership_founding_member: 'founding_member',
      membership_standard: 'standard',
    };
    if (subscriptionTier === tierMap[tierKey]) {
      return <Badge className="bg-green-600">Your Current Plan</Badge>;
    }
    return null;
  };

  return (
    <>
      <Helmet>
        <title>Pricing & Membership - EquiPatterns</title>
        <meta name="description" content="Choose a membership plan to access the full EquiPatterns platform. Founding members get exclusive perks and introductory pricing." />
      </Helmet>

      <div className="bg-background text-foreground">
        <Navigation />

        <main className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">

            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
                Simple, Transparent Pricing
              </h1>
              <p className="mt-4 max-w-3xl mx-auto text-lg sm:text-xl text-muted-foreground">
                Join the EquiPatterns community. Every membership includes 3 free pattern books per year.
              </p>
            </motion.div>

            {/* Membership highlight */}
            <div className="py-6 px-4 bg-secondary/50 rounded-lg mb-16">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <p className="text-3xl font-bold text-primary">3</p>
                  <p className="text-sm text-muted-foreground">Membership Tiers</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">
                    <Gift className="inline h-7 w-7" />
                  </p>
                  <p className="text-sm text-muted-foreground">3 Free Pattern Books/Year</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">
                    <Star className="inline h-7 w-7" />
                  </p>
                  <p className="text-sm text-muted-foreground">Founding Member Perks</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">Annual</p>
                  <p className="text-sm text-muted-foreground">Billing Cycle</p>
                </div>
              </div>
            </div>

            {/* Membership Tiers */}
            <h2 className="text-3xl font-bold text-center mb-10">Membership Plans</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-20">
              {membershipTiers.map((tier, index) => {
                const Icon = tier.icon;
                const isLoading = loadingKey === tier.key && checkoutLoading;
                const userBadge = getTierBadgeForUser(tier.key);

                return (
                  <motion.div
                    key={tier.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex"
                  >
                    <Card className={`w-full flex flex-col relative bg-secondary/50 border-2 ${tier.highlighted ? 'border-primary' : 'border-transparent'}`}>
                      {tier.badge && (
                        <Badge
                          variant={tier.highlighted ? 'default' : 'secondary'}
                          className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap"
                        >
                          {tier.badge}
                        </Badge>
                      )}
                      <CardHeader className="text-center">
                        <Icon className="h-10 w-10 mx-auto text-primary mb-2" />
                        <CardTitle className="text-xl">{tier.name}</CardTitle>
                        {userBadge && <div className="mt-1">{userBadge}</div>}
                        <CardDescription className="text-4xl font-bold text-primary mt-2">
                          {tier.price}
                          <span className="text-sm font-normal text-muted-foreground">{tier.period}</span>
                        </CardDescription>
                        <p className="text-xs text-muted-foreground mt-1">{tier.renewalNote}</p>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <ul className="space-y-3">
                          {tier.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-3">
                              <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-muted-foreground">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button
                          className="w-full"
                          variant="default"
                          disabled={isLoading || (isSubscribed && !!userBadge)}
                          onClick={() => handleSubscribe(tier.key)}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Redirecting...
                            </>
                          ) : isSubscribed && userBadge ? (
                            'Current Plan'
                          ) : (
                            'Get Started'
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Pattern Books */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h2 className="text-3xl font-bold text-center mb-4">A La Carte Pattern Books</h2>
              <p className="text-center text-muted-foreground mb-10">
                Members get 3 free pattern books per year. Additional books available below.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                {patternBooks.map((book) => {
                  const Icon = book.icon;
                  const isLoading = loadingKey === book.key && checkoutLoading;

                  return (
                    <Card key={book.key} className="bg-secondary/50">
                      <CardHeader className="text-center">
                        <Icon className="h-10 w-10 mx-auto text-primary mb-2" />
                        <CardTitle className="text-lg">{book.name}</CardTitle>
                        <CardDescription>{book.subtitle}</CardDescription>
                        <p className="text-3xl font-bold text-primary mt-2">
                          {book.price}
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            {book.period}
                          </span>
                        </p>
                      </CardHeader>
                      <CardFooter>
                        <Button
                          className="w-full"
                          variant="default"
                          disabled={isLoading}
                          onClick={() => handlePurchase(book.key)}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Redirecting...
                            </>
                          ) : (
                            'Purchase'
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </motion.div>

            {/* FAQ-style note */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-20 max-w-2xl mx-auto text-center"
            >
              <Card className="bg-secondary/50">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-3">Questions?</h3>
                  <p className="text-muted-foreground">
                    All memberships are billed annually and include access to the full EquiPatterns platform.
                    Founding Insider members enjoy a special first-year rate of $39.99.
                    Cancel anytime from your profile.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PricingPage;
