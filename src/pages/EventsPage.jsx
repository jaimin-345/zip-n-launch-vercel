import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Play, Search, BookOpen, Clock, Loader2 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { format, isFuture } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';

const LiveEventCard = ({ event, onSelect }) => {
  return (
    <motion.div
      layoutId={`event-card-${event.id}`}
      onClick={() => onSelect(event)}
      className="relative rounded-lg overflow-hidden cursor-pointer group"
      whileHover={{ scale: 1.03 }}
    >
      <img  alt={event.name} className="w-full h-full object-cover aspect-[4/3] transition-transform duration-300 group-hover:scale-105" src="https://images.unsplash.com/photo-1691257790470-b5e4e80ca59f" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
      <div className="absolute bottom-0 left-0 p-4 text-white">
        <Badge className="bg-red-500 text-white mb-2 animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
          LIVE NOW
        </Badge>
        <h3 className="font-bold text-lg">{event.name}</h3>
        <p className="text-sm text-white/80">{event.location}</p>
      </div>
    </motion.div>
  );
};

const EventCard = ({ event }) => {
    const { toast } = useToast();

    const getPatternButton = () => {
        if (!event.pattern_book_id) {
            return <Button variant="secondary" size="sm" disabled><BookOpen className="h-4 w-4 mr-2" /> No Patterns</Button>;
        }

        // This logic would be more complex, checking publish dates on the linked project
        const isLive = true; 
        
        const handlePatternClick = (e) => {
            e.preventDefault();
            if (isLive) {
                toast({ title: `Viewing patterns for ${event.name}` });
            } else {
                toast({ 
                    title: "Patterns Not Yet Available",
                    description: `Patterns for this event are not yet published.`,
                });
            }
        };

        return (
            <Button
                onClick={handlePatternClick}
                variant="default"
                size="sm"
                className="bg-green-500 hover:bg-green-600"
            >
                <BookOpen className="h-4 w-4 mr-2" />
                View Patterns
            </Button>
        );
    };
    
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
        >
            <Card className="bg-secondary border-border hover:border-primary/50 transition-all duration-300 group h-full flex flex-col">
                <CardHeader className="p-0">
                    <Link to={`/event-detail/${event.id}`}>
                        <div className="aspect-video relative overflow-hidden rounded-t-lg">
                           <img  alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src="https://images.unsplash.com/photo-1691257790470-b5e4e80ca59f" />
                            {event.thumbnail_url && <img src={event.thumbnail_url} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
                            <div className="absolute top-2 right-2">
                                <Badge variant={event.status === 'upcoming' ? 'secondary' : 'outline'} className="backdrop-blur-sm bg-black/30 text-white">
                                    {event.status === 'upcoming' ? 'Upcoming' : 'Recent'}
                                </Badge>
                            </div>
                        </div>
                    </Link>
                </CardHeader>
                <CardContent className="pt-4 flex-grow">
                    <Link to={`/event-detail/${event.id}`}>
                        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{event.name}</CardTitle>
                    </Link>
                    <div className="text-sm text-muted-foreground mt-2 space-y-2">
                        <div className="flex items-center"><Calendar className="h-4 w-4 mr-2" />{format(new Date(event.start_date), 'MMM d, yyyy')} - {format(new Date(event.end_date), 'MMM d, yyyy')}</div>
                        <div className="flex items-center"><MapPin className="h-4 w-4 mr-2" />{event.location}</div>
                        {event.status === 'upcoming' && (
                            <div className="flex items-center">
                                <BookOpen className="h-4 w-4 mr-2" />
                                {event.project?.status === 'Publication' ? (
                                    <span className="text-green-600 dark:text-green-400">Patterns Published</span>
                                ) : (
                                    <span className="text-amber-600 dark:text-amber-400">Patterns Pending</span>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="pt-4 flex items-center justify-between">
                    <Link to={`/event-detail/${event.id}`} className="flex-1">
                        <Button variant="ghost" size="sm">View Details</Button>
                    </Link>
                    {getPatternButton()}
                </CardFooter>
            </Card>
        </motion.div>
    );
};

const EventsPage = () => {
  const [allEvents, setAllEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShow, setSelectedShow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchEvents = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('events')
            .select(`
                *,
                project:pattern_book_id (
                    id,
                    project_name,
                    status
                )
            `)
            .order('start_date', { ascending: false });
        if (error) {
            toast({ title: 'Error fetching events', description: error.message, variant: 'destructive' });
        } else {
            setAllEvents(data);
            const live = data.filter(e => e.status === 'live');
            if (live.length > 0) {
                setSelectedShow(live[0]);
            }
        }
        setIsLoading(false);
    };
    fetchEvents();
  }, [toast]);

  const liveEvents = allEvents.filter(e => e.status === 'live');
  const upcomingEvents = allEvents.filter(e => e.status === 'upcoming');
  const recentEvents = allEvents.filter(e => e.status === 'recent');

  const handleSelectShow = (show) => {
    setSelectedShow(show);
  };
  
  const handlePatternSelect = (pattern) => {
    toast({
      title: "🚧 Pattern viewing isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
      description: `Pattern: ${pattern.name}`,
    });
  };

  const filteredUpcoming = upcomingEvents.filter(event => event.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredRecent = recentEvents.filter(event => event.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isLoading) {
    return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Events</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Watch live shows, discover upcoming events, and review results from recent competitions.
          </p>
        </motion.div>

        {liveEvents.length > 0 && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-center">Live Now</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <motion.div className="lg:col-span-2 relative aspect-video rounded-xl overflow-hidden bg-black" layoutId={`event-card-${selectedShow?.id}`}>
                {selectedShow && <img  alt={selectedShow.name} className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1601944179066-29786cb9d32a" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-center justify-center">
                    <Button size="lg" variant="ghost" className="bg-white/20 hover:bg-white/30 text-white h-20 w-20 rounded-full backdrop-blur-sm">
                        <Play className="h-10 w-10" />
                    </Button>
                </div>
              </motion.div>
              <div className="lg:col-span-1 space-y-4">
                <Card className="glass-effect border-border h-full flex flex-col">
                  <CardHeader>
                    <CardTitle>{selectedShow?.name}</CardTitle>
                    <CardDescription>{selectedShow?.currentClass || 'Live Feed'}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                     <div className="space-y-3">
                      {/* This part would need live data */}
                      <p className="text-sm text-muted-foreground">Live class data coming soon.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {liveEvents.map(event => (
                    <LiveEventCard key={event.id} event={event} onSelect={handleSelectShow} />
                ))}
            </div>
          </section>
        )}

        <section className="mb-16">
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-3xl font-bold">Upcoming Events</h2>
                 <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input placeholder="Search events..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                 </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredUpcoming.map(event => (
                    <EventCard key={event.id} event={event} />
                ))}
            </div>
             {filteredUpcoming.length === 0 && <p className="text-muted-foreground col-span-full text-center">No upcoming events match your search.</p>}
        </section>

        <section>
            <h2 className="text-3xl font-bold mb-6">Recent Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredRecent.map(event => (
                    <EventCard key={event.id} event={event} />
                ))}
            </div>
            {filteredRecent.length === 0 && <p className="text-muted-foreground col-span-full text-center">No recent events match your search.</p>}
        </section>

      </main>
    </div>
  );
};

export default EventsPage;