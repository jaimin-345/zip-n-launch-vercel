import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Video, BookOpen, Calendar, ShieldCheck, Zap, ArrowRight, UserCheck, BarChart, CheckCircle, FileText } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import Footer from '@/components/Footer';
import { useMediaConfig } from '@/contexts/MediaConfigContext';

const HomePage = () => {
  const [liveShows, setLiveShows] = useState([]);
  const { toast } = useToast();
  const { config: mediaConfig } = useMediaConfig();

  useEffect(() => {
    const sampleShows = [{
      id: 1,
      name: 'Spring Championship',
      dates: 'Aug 15-18, 2025',
      association: 'AQHA',
      status: 'live',
      image: 'Horse show arena with a reining competition in progress'
    }, {
      id: 2,
      name: 'Youth Regional Finals',
      dates: 'Aug 22-25, 2025',
      association: 'APHA',
      status: 'upcoming',
      image: 'Youth rider on a paint horse in a showmanship class'
    }, {
      id: 3,
      name: 'Summer Slide',
      dates: 'Aug 29 - Sep 1, 2025',
      association: 'NRHA',
      status: 'upcoming',
      image: 'Horse performing a sliding stop in an arena'
    }];
    setLiveShows(sampleShows);
  }, []);
  const handleWatchLive = show => {
    toast({
      title: `Redirecting to ${show.name}`,
      description: "🚧 Live stream feature is not yet implemented."
    });
  };
  const handleOpenBook = show => {
    toast({
      title: `Opening pattern book for ${show.name}`,
      description: "🚧 Live pattern book feature is not yet implemented."
    });
  };
  const sponsors = [{
    name: 'Equine Excellence Feed',
    logo: 'Equine Excellence Feed company logo with a horse silhouette'
  }, {
    name: 'Wellington Tack Shop',
    logo: 'Wellington Tack Shop logo featuring horse tack'
  }, {
    name: 'Champion Trailers',
    logo: 'Champion Trailers logo with a horse trailer graphic'
  }, {
    name: 'ProStride Supplements',
    logo: 'ProStride Supplements logo with a dynamic icon'
  }, {
    name: 'SaddleUp Apparel',
    logo: 'SaddleUp Apparel logo with a stylized saddle'
  }];
  const testimonials = [{
    name: 'John D., Show Organizer',
    quote: "EquiPatterns revolutionized how we manage our shows. The automated pattern books and QR codes save us hours of work."
  }, {
    name: 'Jane S., Judge',
    quote: "The AI-generated score sheets are incredibly accurate and consistent. It's a game-changer for judging."
  }, {
    name: 'Emily R., Trainer',
    quote: "My students love the live pattern books. They can follow along in real-time, which is a fantastic learning tool."
  }];

  const backgroundImageUrl = mediaConfig.home_page?.url;
  
  return (
    <div 
      style={backgroundImageUrl ? { backgroundImage: `url(${backgroundImageUrl})` } : undefined} 
      className="bg-cover bg-fixed bg-center min-h-screen"
    >
      <Navigation />

      <main className="bg-background/80 backdrop-blur-sm">
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight">Professionally curated patterns for every class</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">Create association-compliant pattern books & score sheets</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <Link to="/pattern-book-builder" className="block">
                  <div className="space-y-6">
                    <Badge variant="outline" className="text-primary border-primary">Management & Judges</Badge>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Pattern Book Builder</h2>
                    <p className="text-lg text-muted-foreground">Stop Formatting. Start Showing. Generate a pattern book in minutes.</p>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3"><ShieldCheck className="h-6 w-6 text-primary flex-shrink-0 mt-1" /><span className="text-muted-foreground">Automated pattern generation </span></li>
                        <li className="flex items-start gap-3"><Zap className="h-6 w-6 text-primary flex-shrink-0 mt-1" /><span className="text-muted-foreground">Build better shows, faster</span></li>
                        <li className="flex items-start gap-3"><FileText className="h-6 w-6 text-primary flex-shrink-0 mt-1" /><span className="text-muted-foreground">Score sheets populated </span></li>
                    </ul>
                    <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Link to="/pattern-book-builder">Pattern Book Builder <ArrowRight className="ml-2 h-5 w-5" /></Link>
                    </Button>
                  </div>
                </Link>
                <div className="space-y-6">
                <Badge variant="outline" className="text-primary border-primary">For Designers</Badge>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Monetize your abilities and share your creativity with the industry.</h2>
                <p className="text-lg text-muted-foreground">License your patterns, and start to earn now.</p>
                <ul className="space-y-4">
                    <li className="flex items-start gap-3"><UserCheck className="h-6 w-6 text-primary flex-shrink-0 mt-1" /><span className="text-muted-foreground">Simple upload and licensing process.</span></li>
                    <li className="flex items-start gap-3"><BarChart className="h-6 w-6 text-primary flex-shrink-0 mt-1" /><span className="text-muted-foreground">Transparent revenue sharing and analytics.</span></li>
                    <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" /><span className="text-muted-foreground">Reach thousands of show organizers and riders.</span></li>
                </ul>
                <Button asChild size="lg" variant="outline">
                    <Link to="/contributor-portal">License Your Patterns <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-secondary/80">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                Trusted by the Best in the Sport
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                Top riders, organizers, and judges rely on EquiPatterns for their events.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => <Card key={index} className="bg-card/90 border-border">
                  <CardContent className="pt-6">
                    <blockquote className="text-muted-foreground">
                      "{testimonial.quote}"
                    </blockquote>
                  </CardContent>
                  <CardFooter>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                  </CardFooter>
                </Card>)}
            </div>
            <div className="mt-12 text-center">
              <Button variant="link" asChild>
                <Link to="#">Read Our Case Studies <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
              Support the Brands That Support the Sport
            </h2>
             <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Partner with us to reach riders, trainers, and fans — in the arena and online.
            </p>
            <div className="mt-8 flow-root">
              <div className="-mt-4 -ml-8 flex flex-wrap justify-center">
                {sponsors.map(sponsor => <div key={sponsor.name} className="mt-4 ml-8 flex flex-grow flex-shrink-0 items-center justify-center lg:flex-grow-0">
                    <div className="h-12 w-32 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">{sponsor.name}</div>
                  </div>)}
              </div>
            </div>
            <div className="mt-12">
              <Button asChild size="lg">
                <Link to="/sponsorship">Become a Sponsor</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-secondary/80">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                Live & Upcoming Shows
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                Watch live events and access pattern books in real-time.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {liveShows.map((show, index) => <motion.div key={show.id} initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.5,
              delay: index * 0.1
            }}>
                  <Card className="bg-card/90 border-border hover:border-primary/50 transition-all duration-300 flex flex-col h-full">
                    <CardHeader>
                      <div className="aspect-video relative mb-4 bg-muted rounded-lg flex items-center justify-center">
                        <span className="text-muted-foreground text-sm px-4 text-center">{show.image}</span>
                        <Badge className={`absolute top-2 right-2 ${show.status === 'live' ? 'bg-red-600 text-white' : 'bg-primary/80 text-primary-foreground'}`}>
                          {show.status.toUpperCase()}
                        </Badge>
                      </div>
                      <CardTitle className="text-foreground">{show.name}</CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span>{show.association}</span>
                        <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {show.dates}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="mt-auto flex gap-2">
                      <Button onClick={() => handleWatchLive(show)} className="w-full bg-primary/20 text-primary hover:bg-primary/30">
                        <Video className="mr-2 h-4 w-4" /> Watch Live
                      </Button>
                      <Button onClick={() => handleOpenBook(show)} variant="outline" className="w-full">
                        <BookOpen className="mr-2 h-4 w-4" /> Pattern Book
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>)}
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default HomePage;