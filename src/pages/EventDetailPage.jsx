import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Award, BookOpen, Share2, Twitter, Facebook, ExternalLink, Clock, Users, Trophy, Loader2, Building2, Mail, Phone, FileText, Image as ImageIcon } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { events } from '@/lib/eventsData';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';

const EventDetailPage = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projectData, setProjectData] = useState(null);
  const [patternsData, setPatternsData] = useState([]);
  const [scoresheetsData, setScoresheetsData] = useState([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchEventData = async () => {
      setIsLoading(true);
      try {
        // First try to find in events table
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (eventError) {
          console.error('Error fetching event:', eventError);
        }

        if (eventData) {
          setEvent(eventData);
          setIsLoading(false);
          return;
        }

        // If not found in events, try projects table
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (projectError) {
          console.error('Error fetching project:', projectError);
          toast({
            title: 'Error',
            description: 'Failed to load event details',
            variant: 'destructive',
          });
        }

        if (project && project.project_data) {
          const projectDataObj = project.project_data;
          
          // Convert project to event-like format
          const eventFromProject = {
            id: project.id,
            name: project.project_name || 'Untitled Show',
            startDate: projectDataObj.startDate || project.created_at,
            endDate: projectDataObj.endDate || project.created_at,
            location: projectDataObj.showLocation || projectDataObj.location || projectDataObj.venueName || projectDataObj.venueAddress || 'Location TBD',
            status: project.status === 'Publication' ? 'upcoming' : 'recent',
            pattern_book_id: project.id,
            project: { id: project.id, status: project.status },
            isFromProjects: true,
            association: projectDataObj.associations ? Object.keys(projectDataObj.associations).join(', ') : null,
            projectData: projectDataObj, // Store full project_data for display
          };

          setEvent(eventFromProject);
          setProjectData(projectDataObj);
          
          // Fetch patterns and scoresheets data
          if (projectDataObj.patternSelections || projectDataObj.disciplines) {
            fetchPatternsAndScoresheets(projectDataObj);
          }
        } else {
          // Fallback to static events data
          const foundEvent = events.find(e => e.id.toString() === id);
          setEvent(foundEvent);
        }
      } catch (error) {
        console.error('Error fetching event data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load event details',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchPatternsAndScoresheets = async (projectDataObj) => {
      setIsLoadingAssets(true);
      try {
        const patterns = [];
        const scoresheets = [];
        
        // Process disciplines and their pattern selections
        if (projectDataObj.disciplines && projectDataObj.patternSelections) {
          for (const discipline of projectDataObj.disciplines) {
            if (!discipline.pattern && !discipline.scoresheet) continue;
            
            const disciplineKey = discipline.id || discipline.name;
            const disciplineSelections = projectDataObj.patternSelections[disciplineKey] || 
                                        projectDataObj.patternSelections[discipline.id] ||
                                        projectDataObj.patternSelections[discipline.name];
            
            if (!disciplineSelections) continue;
            
            // Process pattern groups
            if (discipline.patternGroups && Array.isArray(discipline.patternGroups)) {
              for (const group of discipline.patternGroups) {
                const groupKey = group.id || `pattern-group-${group.name}`;
                const patternSelection = disciplineSelections[groupKey] || 
                                       disciplineSelections[group.id] ||
                                       disciplineSelections[group.name];
                
                if (patternSelection && patternSelection.patternId) {
                  const numericPatternId = typeof patternSelection.patternId === 'number' 
                    ? patternSelection.patternId 
                    : parseInt(patternSelection.patternId);
                  
                  if (numericPatternId) {
                    // Fetch pattern image
                    const { data: patternMedia } = await supabase
                      .from('tbl_pattern_media')
                      .select('image_url')
                      .eq('pattern_id', numericPatternId)
                      .maybeSingle();
                    
                    const { data: patternInfo } = await supabase
                      .from('tbl_patterns')
                      .select('pdf_file_name, pattern_version')
                      .eq('id', numericPatternId)
                      .maybeSingle();
                    
                    patterns.push({
                      discipline: discipline.name,
                      group: group.name,
                      divisions: group.divisions || [],
                      patternId: numericPatternId,
                      patternName: patternSelection.patternName || patternInfo?.pdf_file_name || `Pattern ${numericPatternId}`,
                      imageUrl: patternMedia?.image_url || null,
                      version: patternSelection.version || patternInfo?.pattern_version || null,
                    });
                  }
                }
                
                // Fetch scoresheet for this group
                if (discipline.scoresheet && group.divisions && group.divisions.length > 0) {
                  const division = group.divisions[0];
                  const assocId = division.assocId || discipline.association_id;
                  
                  if (assocId) {
                    const { data: scoresheetData } = await supabase
                      .from('tbl_scoresheet')
                      .select('id, image_url, file_name, discipline')
                      .eq('association_abbrev', assocId)
                      .ilike('discipline', `%${discipline.name}%`)
                      .maybeSingle();
                    
                    if (scoresheetData) {
                      scoresheets.push({
                        discipline: discipline.name,
                        group: group.name,
                        divisions: group.divisions.map(d => d.division || d.name || d),
                        scoresheetId: scoresheetData.id,
                        imageUrl: scoresheetData.image_url || null,
                        fileName: scoresheetData.file_name || null,
                      });
                    }
                  }
                }
              }
            }
          }
        }
        
        setPatternsData(patterns);
        setScoresheetsData(scoresheets);
      } catch (error) {
        console.error('Error fetching patterns and scoresheets:', error);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    fetchEventData();
  }, [id, toast]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="text-foreground h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
            <p className="text-muted-foreground">The event you're looking for doesn't exist.</p>
            <Button asChild className="mt-4">
              <Link to="/events">Back to Events</Link>
            </Button>
          </div>
        </div>
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
              {event.association && (
                <Badge className="mb-2 bg-primary/80 backdrop-blur-sm text-primary-foreground">{event.association}</Badge>
              )}
              <h1 className="text-3xl md:text-5xl font-bold">{event.name}</h1>
              <div className="flex items-center text-lg mt-2 gap-4 flex-wrap">
                {event.startDate && (
                  <span className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" /> 
                    {format(new Date(event.startDate), 'MMM d, yyyy')} 
                    {event.endDate && ` - ${format(new Date(event.endDate), 'MMM d, yyyy')}`}
                  </span>
                )}
                {event.location && (
                  <span className="flex items-center gap-2"><MapPin className="h-5 w-5" /> {event.location}</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Project Data Details - Show when event is from projects table */}
            {event.isFromProjects && projectData && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
                <Card className="bg-secondary border-border">
                  <CardHeader>
                    <CardTitle>Show Details</CardTitle>
                    <CardDescription>Complete information about this show</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Show Name */}
                    {projectData.showName && (
                      <div>
                        <h3 className="font-semibold text-primary mb-1">Show Name</h3>
                        <p className="text-foreground">{projectData.showName}</p>
                      </div>
                    )}

                    {/* Show Type */}
                    {projectData.showType && (
                      <div>
                        <h3 className="font-semibold text-primary mb-1">Show Type</h3>
                        <Badge variant="outline">{projectData.showType}</Badge>
                      </div>
                    )}

                    {/* Venue Information */}
                    {(projectData.venueName || projectData.venueAddress) && (
                      <div>
                        <h3 className="font-semibold text-primary mb-1">Venue</h3>
                        {projectData.venueName && <p className="text-foreground">{projectData.venueName}</p>}
                        {projectData.venueAddress && <p className="text-muted-foreground text-sm">{projectData.venueAddress}</p>}
                      </div>
                    )}

                    {/* Associations */}
                    {projectData.associations && Object.keys(projectData.associations).length > 0 && (
                      <div>
                        <h3 className="font-semibold text-primary mb-2">Associations</h3>
                        <div className="flex flex-wrap gap-2">
                          {Object.keys(projectData.associations).filter(key => projectData.associations[key]).map(assoc => (
                            <Badge key={assoc} variant="outline">{assoc}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Disciplines */}
                    {projectData.disciplines && projectData.disciplines.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-primary mb-2">Disciplines</h3>
                        <div className="flex flex-wrap gap-2">
                          {projectData.disciplines.map((discipline, idx) => (
                            <Badge key={idx} variant="outline">{discipline.name || discipline}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Officials/Judges */}
                    {projectData.officials && projectData.officials.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-primary mb-2">Officials</h3>
                        <div className="space-y-1">
                          {projectData.officials.map((official, idx) => (
                            <div key={idx} className="text-sm text-foreground">
                              {typeof official === 'string' ? official : official.name || official.email || 'Official'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Judges */}
                    {(() => {
                      const allJudges = [];
                      
                      // Collect judges from associationJudges
                      if (projectData.associationJudges) {
                        Object.values(projectData.associationJudges).forEach(data => {
                          if (data.judges && Array.isArray(data.judges)) {
                            data.judges.forEach(judge => {
                              if (judge.name) {
                                allJudges.push(judge.name);
                              }
                            });
                          }
                        });
                      }
                      
                      // Collect judges from officials
                      if (projectData.officials && Array.isArray(projectData.officials)) {
                        projectData.officials.forEach(official => {
                          if (typeof official === 'string' && official.trim()) {
                            allJudges.push(official.trim());
                          } else if (official && official.name && official.name.trim()) {
                            allJudges.push(official.name.trim());
                          }
                        });
                      }
                      
                      // Remove duplicates
                      const uniqueJudges = [...new Set(allJudges)];
                      
                      if (uniqueJudges.length > 0) {
                        return (
                          <div>
                            <h3 className="font-semibold text-primary mb-2">Judges</h3>
                            <div className="space-y-1">
                              {uniqueJudges.map((judgeName, idx) => (
                                <div key={idx} className="text-sm text-foreground">
                                  {judgeName}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Event Highlights - Show patterns, scoresheets, divisions, and judges */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
              <Card className="bg-secondary border-border">
                <CardHeader>
                  <CardTitle>Event Highlights</CardTitle>
                  {event.isFromProjects && <CardDescription>Patterns, scoresheets, divisions, and judges for this event</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Patterns and Scoresheets */}
                  {event.isFromProjects && projectData && (
                    <>
                      {/* Patterns */}
                      {patternsData.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-primary mb-3 flex items-center">
                            <FileText className="h-5 w-5 mr-2" /> Patterns
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {patternsData.map((pattern, idx) => (
                              <div key={idx} className="border border-border rounded-lg p-3 bg-background/50">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-foreground">{pattern.patternName}</p>
                                    <p className="text-sm text-muted-foreground">{pattern.discipline} - {pattern.group}</p>
                                    {pattern.version && (
                                      <Badge variant="outline" className="mt-1 text-xs">Version: {pattern.version}</Badge>
                                    )}
                                  </div>
                                </div>
                                {pattern.imageUrl ? (
                                  <img 
                                    src={pattern.imageUrl} 
                                    alt={pattern.patternName}
                                    className="w-full h-32 object-contain rounded border border-border mt-2 bg-white"
                                  />
                                ) : (
                                  <div className="w-full h-32 bg-muted rounded border border-border mt-2 flex items-center justify-center">
                                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                                {pattern.divisions && pattern.divisions.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs text-muted-foreground mb-1">Divisions:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {pattern.divisions.map((div, divIdx) => (
                                        <Badge key={divIdx} variant="secondary" className="text-xs">
                                          {typeof div === 'object' ? (div.division || div.name || div.id) : div}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Scoresheets */}
                      {scoresheetsData.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-primary mb-3 flex items-center">
                            <FileText className="h-5 w-5 mr-2" /> Score Sheets
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {scoresheetsData.map((scoresheet, idx) => (
                              <div key={idx} className="border border-border rounded-lg p-3 bg-background/50">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-foreground">{scoresheet.fileName || 'Score Sheet'}</p>
                                    <p className="text-sm text-muted-foreground">{scoresheet.discipline} - {scoresheet.group}</p>
                                  </div>
                                </div>
                                {scoresheet.imageUrl ? (
                                  <img 
                                    src={scoresheet.imageUrl} 
                                    alt={scoresheet.fileName || 'Score Sheet'}
                                    className="w-full h-32 object-contain rounded border border-border mt-2 bg-white"
                                  />
                                ) : (
                                  <div className="w-full h-32 bg-muted rounded border border-border mt-2 flex items-center justify-center">
                                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                                {scoresheet.divisions && scoresheet.divisions.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs text-muted-foreground mb-1">Divisions:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {scoresheet.divisions.map((div, divIdx) => (
                                        <Badge key={divIdx} variant="secondary" className="text-xs">
                                          {typeof div === 'object' ? (div.division || div.name || div.id) : div}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* All Divisions Summary */}


                      {/* Judges Summary */}
                      {(() => {
                        const allJudges = [];
                        
                        // Collect judges from associationJudges
                        if (projectData.associationJudges) {
                          Object.values(projectData.associationJudges).forEach(data => {
                            if (data.judges && Array.isArray(data.judges)) {
                              data.judges.forEach(judge => {
                                if (judge.name && judge.name.trim()) {
                                  allJudges.push(judge.name.trim());
                                }
                              });
                            }
                          });
                        }
                        
                        // Collect judges from officials
                        if (projectData.officials && Array.isArray(projectData.officials)) {
                          projectData.officials.forEach(official => {
                            if (typeof official === 'string' && official.trim()) {
                              allJudges.push(official.trim());
                            } else if (official && official.name && official.name.trim()) {
                              allJudges.push(official.name.trim());
                            }
                          });
                        }
                        
                        // Remove duplicates
                        const uniqueJudges = [...new Set(allJudges)];
                        
                        if (uniqueJudges.length > 0) {
                          return (
                            <div>
                              <h3 className="font-semibold text-primary mb-3 flex items-center">
                                <Users className="h-5 w-5 mr-2" /> Judges
                              </h3>
                              <div className="space-y-1">
                                {uniqueJudges.map((judgeName, idx) => (
                                  <div key={idx} className="text-sm text-foreground">
                                    {judgeName}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {isLoadingAssets && (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="ml-2 text-muted-foreground">Loading patterns and scoresheets...</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Fallback for regular events */}
                  {!event.isFromProjects && (
                    <>
                      <div className="flex flex-wrap justify-start gap-6 text-foreground/80">
                        {event.totalEntries && (
                          <div className="flex items-center">
                            <Users className="h-5 w-5 mr-2" />
                            <span>{event.totalEntries} Entries</span>
                          </div>
                        )}
                        {event.totalPrizes && (
                          <div className="flex items-center">
                            <Trophy className="h-5 w-5 mr-2" />
                            <span>{event.totalPrizes} in Prizes</span>
                          </div>
                        )}
                      </div>
                      {event.classes && event.classes.length > 0 && (
                        <div className="pt-4">
                          <h3 className="font-semibold text-primary mb-2">Featured Classes</h3>
                          <div className="flex flex-wrap gap-2">
                              {event.classes.slice(0, 4).map((c, idx) => (
                                <Badge key={idx} variant="outline">{c.name || c}</Badge>
                              ))}
                              {event.classes.length > 4 && <Badge variant="outline">+{event.classes.length - 4} more</Badge>}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Class Schedule - Show for regular events */}
            {event.classes && event.classes.length > 0 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
                <Card className="bg-secondary border-border">
                   <CardHeader>
                    <CardTitle>Class Schedule</CardTitle>
                    <CardDescription>Today's competition schedule</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {event.classes.map((classItem, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 * index }}
                        className="flex items-center justify-between p-3 bg-background/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <h3 className="text-foreground font-medium">{classItem.name || classItem}</h3>
                          {classItem.time && (
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center"><Clock className="h-4 w-4 mr-1" />{classItem.time}</span>
                              {classItem.ring && <span>{classItem.ring}</span>}
                              {classItem.entries && <span>{classItem.entries} entries</span>}
                            </div>
                          )}
                        </div>
                        <Badge variant={event.status === 'live' ? 'default' : 'secondary'} className={event.status === 'live' ? 'bg-green-500' : ''}>
                          {event.status === 'live' ? 'Live Now' : 'Completed'}
                        </Badge>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}
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