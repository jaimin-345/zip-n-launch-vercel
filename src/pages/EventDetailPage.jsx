import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Award, BookOpen, Share2, Twitter, Facebook, ExternalLink, Clock, Users, Trophy } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { events } from '@/lib/eventsData';
import { format } from 'date-fns';

const EventDetailPage = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const foundEvent = events.find(e => e.id.toString() === id);
    setEvent(foundEvent);
  }, [id]);

  const handleShare = (platform) => {
    toast({
      title: 'Sharing Event!',
      description: `🚧 Sharing to ${platform} is not implemented yet.`,
    });
  };

  const getPatternStatus = () => {
    if (!event.patternBook) return null;

    if (event.patternBook.isLive) {
      return (
        <Button asChild className="w-full bg-green-500 hover:bg-green-600">
          <Link to={`/pattern-books/view/${event.patternBook.id}`}>
            <BookOpen className="h-4 w-4 mr-2" /> View Pattern Book
          </Link>
        </Button>
      );
    }
    return (
      <div className="text-center text-sm text-muted-foreground p-3 bg-secondary rounded-md">
        Patterns will be posted on {format(new Date(event.patternBook.publishDate), 'PPP')}
      </div>
    );
  };

  if (!event) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="text-foreground h-screen flex items-center justify-center">Loading event details...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="relative h-64 md:h-96 rounded-lg overflow-hidden mb-8">
            <img-replace alt={event.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-8 left-8 text-white">
              <Badge className="mb-2 bg-primary/80 backdrop-blur-sm text-primary-foreground">{event.association}</Badge>
              <h1 className="text-3xl md:text-5xl font-bold">{event.name}</h1>
              <div className="flex items-center text-lg mt-2 gap-4">
                <span className="flex items-center gap-2"><Calendar className="h-5 w-5" /> {format(new Date(event.startDate), 'MMM d, yyyy')} - {format(new Date(event.endDate), 'MMM d, yyyy')}</span>
                <span className="flex items-center gap-2"><MapPin className="h-5 w-5" /> {event.location}</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
              <Card className="bg-secondary border-border">
                <CardHeader>
                  <CardTitle>Event Highlights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="flex flex-wrap justify-start gap-6 text-foreground/80">
                      <div className="flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        <span>{event.totalEntries} Entries</span>
                      </div>
                      <div className="flex items-center">
                        <Trophy className="h-5 w-5 mr-2" />
                        <span>{event.totalPrizes} in Prizes</span>
                      </div>
                    </div>
                    <div className="pt-4">
                      <h3 className="font-semibold text-primary mb-2">Featured Classes</h3>
                      <div className="flex flex-wrap gap-2">
                          {(event.classes || []).slice(0, 4).map(c => <Badge key={c.name} variant="outline">{c.name}</Badge>)}
                          {(event.classes?.length || 0) > 4 && <Badge variant="outline">+{(event.classes.length || 0) - 4} more</Badge>}
                      </div>
                    </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
              <Card className="bg-secondary border-border">
                 <CardHeader>
                  <CardTitle>Class Schedule</CardTitle>
                  <CardDescription>Today's competition schedule</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(event.classes || []).map((classItem, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 * index }}
                      className="flex items-center justify-between p-3 bg-background/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="text-foreground font-medium">{classItem.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center"><Clock className="h-4 w-4 mr-1" />{classItem.time}</span>
                          <span>{classItem.ring}</span>
                          <span>{classItem.entries} entries</span>
                        </div>
                      </div>
                      <Badge variant={event.status === 'live' ? 'default' : 'secondary'} className={event.status === 'live' ? 'bg-green-500' : ''}>
                        {event.status === 'live' ? 'Live Now' : 'Completed'}
                      </Badge>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }}>
              <Card className="bg-secondary border-border">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getPatternStatus()}
                  <Button asChild variant="outline" className="w-full">
                    <a href={event.website} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" /> Visit Official Website
                    </a>
                  </Button>
                  <p className="text-xs text-muted-foreground pt-2 text-center">Share this event:</p>
                   <div className="flex justify-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleShare('Twitter')}><Twitter className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" onClick={() => handleShare('Facebook')}><Facebook className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" onClick={() => handleShare('Link')}><Share2 className="h-4 w-4" /></Button>
                   </div>
                </CardContent>
              </Card>
            </motion.div>

             <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.5 }}>
              <Card className="bg-secondary border-border">
                <CardHeader>
                  <CardTitle>Shareable Summary</CardTitle>
                   <CardDescription>Copy and paste to share.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="bg-background p-3 rounded-md text-sm text-muted-foreground">
                    Check out the highlights from {event.name}! Incredible performances in {event.classes?.map(c => c.name).slice(0, 2).join(' & ')}. Congratulations to all competitors! #EquiPatterns #{event.association} #{event.name.replace(/\s+/g, '')}
                   </div>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigator.clipboard.writeText(`Check out the highlights from ${event.name}! #EquiPatterns`).then(() => toast({title: "Copied to clipboard!"}))}>
                        Copy Summary
                    </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;