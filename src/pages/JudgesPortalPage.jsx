import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Calendar, FileText, Loader2, Bell, CheckCircle, Gavel } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const JudgesPortalPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState([]);
  const [assignedPatterns, setAssignedPatterns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch notifications for the current user
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.email) {
        setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('judge_notifications')
          .select('*')
          .eq('judge_email', user.email)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setNotifications(data || []);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setIsLoading(false);
      }
    };
    
    fetchNotifications();
  }, [user?.email]);
  
  // Fetch project data for assigned patterns
  useEffect(() => {
    const fetchAssignedPatterns = async () => {
      if (notifications.length === 0) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Get unique project IDs from notifications
        const projectIds = [...new Set(notifications.map(n => n.project_id))];
        
        // Fetch project data for each project
        const { data: projects, error } = await supabase
          .from('projects')
          .select('id, project_name, project_data')
          .in('id', projectIds);
        
        if (error) throw error;
        
        // Extract patterns from project_data
        const patterns = [];
        
        projects?.forEach(project => {
          const data = project.project_data;
          if (!data) return;
          
          const startDate = data.startDate;
          const endDate = data.endDate;
          const showName = data.showName || project.project_name;
          
          // Extract patterns from patternSelections
          if (data.patternSelections) {
            Object.entries(data.patternSelections).forEach(([disciplineKey, disciplinePatterns]) => {
              if (typeof disciplinePatterns === 'object' && disciplineKey !== '0') {
                Object.entries(disciplinePatterns).forEach(([groupKey, patternData]) => {
                  if (patternData?.patternName) {
                    // Find discipline name from disciplines array
                    const discipline = data.disciplines?.find(d => d.id === disciplineKey);
                    const disciplineName = discipline?.name || disciplineKey.split('-')[0] || 'Unknown';
                    
                    patterns.push({
                      id: `${project.id}-${patternData.patternId}-${groupKey}`,
                      projectId: project.id,
                      projectName: showName,
                      patternName: patternData.patternName,
                      patternId: patternData.patternId,
                      version: patternData.version || 'ALL',
                      discipline: disciplineName,
                      startDate,
                      endDate,
                      maneuversRange: patternData.maneuversRange
                    });
                  }
                });
              }
            });
          }
        });
        
        setAssignedPatterns(patterns);
      } catch (err) {
        console.error('Error fetching assigned patterns:', err);
        toast({
          title: 'Error',
          description: 'Failed to load assigned patterns',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAssignedPatterns();
  }, [notifications, toast]);
  
  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return format(parseISO(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };
  
  // Handle view pattern - navigate to pattern book builder in judge view mode
  const handleViewPattern = (pattern) => {
    // Mark notification as read
    const notification = notifications.find(n => n.project_id === pattern.projectId);
    if (notification && !notification.is_read) {
      supabase
        .from('judge_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notification.id)
        .then(() => {
          setNotifications(prev => 
            prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
          );
        });
    }
    
    // Navigate to pattern book builder with judge view mode
    navigate(`/pattern-book-builder?projectId=${pattern.projectId}&judgeView=true`);
  };
  
  // Get unread notification count
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Judges Portal | EquiPatterns</title>
        <meta name="description" content="Access your assigned patterns and show information" />
      </Helmet>
      
      <Navigation />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Gavel className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Judges Portal</h1>
              <p className="text-muted-foreground mt-1">
                View your assigned patterns and show information
              </p>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1 px-3 py-1.5">
              <Bell className="h-4 w-4" />
              {unreadCount} new assignment{unreadCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        {/* Assigned Patterns Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Assigned Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !user ? (
              <div className="text-center py-12 text-muted-foreground">
                <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Please Sign In</p>
                <p className="text-sm mt-1">Sign in to view your pattern assignments.</p>
              </div>
            ) : assignedPatterns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Assigned Patterns</p>
                <p className="text-sm mt-1">You don't have any pattern assignments yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Show Name</TableHead>
                      <TableHead>Pattern Name</TableHead>
                      <TableHead>Discipline</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Start Date
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          End Date
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedPatterns.map((pattern) => {
                      const notification = notifications.find(n => n.project_id === pattern.projectId);
                      const isRead = notification?.is_read;
                      
                      return (
                        <TableRow 
                          key={pattern.id}
                          className={!isRead ? 'bg-primary/5' : ''}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {!isRead && (
                                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                              )}
                              {pattern.projectName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {pattern.patternName}
                            </code>
                          </TableCell>
                          <TableCell>{pattern.discipline}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{pattern.version}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(pattern.startDate)}</TableCell>
                          <TableCell>{formatDate(pattern.endDate)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleViewPattern(pattern)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Recent Notifications */}
        {notifications.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.slice(0, 5).map((notification) => (
                  <div 
                    key={notification.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      notification.is_read ? 'bg-background' : 'bg-primary/5 border-primary/20'
                    }`}
                  >
                    {notification.is_read ? (
                      <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    ) : (
                      <Bell className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{notification.project_name}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default JudgesPortalPage;
