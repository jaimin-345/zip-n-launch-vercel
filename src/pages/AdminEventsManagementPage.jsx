import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Navigation from '@/components/Navigation';
import AdminBackButton from '@/components/admin/AdminBackButton';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Link as LinkIcon,
} from 'lucide-react';

const EMPTY_EVENT = {
  id: null,
  name: '',
  start_date: '',
  end_date: '',
  location: '',
  status: 'upcoming',
  thumbnail_url: '',
  showWebsite: '',
  showFacebook: '',
  venue_name: '',
  venue_address: '',
  show_type: '',
  associations: '',
  disciplines: '',
  officials: '',
  judges: '',
};

const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'live', label: 'Live' },
  { value: 'recent', label: 'Recent' },
];

const AdminEventsManagementPage = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState(EMPTY_EVENT);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) {
        toast({
          title: 'Error loading events',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setEvents(data || []);
      }
      setIsLoading(false);
    };

    fetchEvents();
  }, [toast]);

  const openCreateDialog = () => {
    setEditingEvent(null);
    setFormData(EMPTY_EVENT);
    setDialogOpen(true);
  };

  const openEditDialog = (event) => {
    setEditingEvent(event);
    setFormData({
      id: event.id,
      name: event.name || '',
      start_date: event.start_date ? event.start_date.slice(0, 10) : '',
      end_date: event.end_date ? event.end_date.slice(0, 10) : '',
      location: event.location || '',
      status: event.status || 'upcoming',
      thumbnail_url: event.thumbnail_url || '',
      showWebsite: event.show_website || event.showWebsite || '',
      showFacebook: event.show_facebook || event.showFacebook || '',
      venue_name: event.venue_name || '',
      venue_address: event.venue_address || '',
      show_type: event.show_type || '',
      associations: event.associations ? (Array.isArray(event.associations) ? event.associations.join(', ') : JSON.stringify(event.associations)) : '',
      disciplines: event.disciplines ? (Array.isArray(event.disciplines) ? event.disciplines.join(', ') : JSON.stringify(event.disciplines)) : '',
      officials: event.officials ? JSON.stringify(event.officials, null, 2) : '',
      judges: event.judges ? (Array.isArray(event.judges) ? event.judges.join(', ') : JSON.stringify(event.judges)) : '',
    });
    setDialogOpen(true);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);

    // Parse JSON fields
    const parseJsonField = (value) => {
      if (!value || !value.trim()) return null;
      try {
        return JSON.parse(value);
      } catch {
        // If not valid JSON, treat as comma-separated list
        const items = value.split(',').map(item => item.trim()).filter(item => item);
        return items.length > 0 ? items : null;
      }
    };

    const parseOfficials = (value) => {
      if (!value || !value.trim()) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    };

    const payload = {
      name: formData.name,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      location: formData.location || null,
      status: formData.status,
      thumbnail_url: formData.thumbnail_url || null,
      show_website: formData.showWebsite || null,
      show_facebook: formData.showFacebook || null,
      venue_name: formData.venue_name || null,
      venue_address: formData.venue_address || null,
      show_type: formData.show_type || null,
      associations: parseJsonField(formData.associations),
      disciplines: parseJsonField(formData.disciplines),
      officials: parseOfficials(formData.officials),
      judges: parseJsonField(formData.judges),
    };

    let error;
    if (editingEvent?.id) {
      ({ error } = await supabase.from('events').update(payload).eq('id', editingEvent.id));
    } else {
      ({ error } = await supabase.from('events').insert(payload));
    }

    if (error) {
      toast({
        title: 'Error saving event',
        description: error.message,
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    toast({
      title: 'Event saved',
      description: editingEvent ? 'Event updated successfully.' : 'New event created.',
    });

    // Reload list
    const { data: refreshed } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: false });
    setEvents(refreshed || []);

    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      toast({
        title: 'Error deleting event',
        description: error.message,
        variant: 'destructive',
      });
      setDeletingId(null);
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);
    toast({ title: 'Event deleted' });
  };

  return (
    <>
      <Helmet>
        <title>Event Management - Admin</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AdminBackButton />
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold">Event Management</h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  Create and manage events that appear on the public Events page.
                </p>
              </div>
            </div>
            <Button onClick={openCreateDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Events ({events.length})</CardTitle>
              <CardDescription>These events feed the `/events` page for visitors.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  No events found. Click &quot;Add Event&quot; to create one.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Links</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {event.start_date
                              ? `${event.start_date?.slice(0, 10)} — ${event.end_date?.slice(0, 10)}`
                              : 'TBD'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {event.location || 'TBD'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              event.status === 'live'
                                ? 'default'
                                : event.status === 'upcoming'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {event.status || 'upcoming'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {(event.show_website || event.showWebsite) && (
                            <div className="flex items-center gap-1">
                              <LinkIcon className="h-3 w-3" />
                              <span className="truncate max-w-[180px]">
                                {(event.show_website || event.showWebsite).replace(/^https?:\/\//, '')}
                              </span>
                            </div>
                          )}
                          {(event.show_facebook || event.showFacebook) && (
                            <div className="flex items-center gap-1">
                              <LinkIcon className="h-3 w-3" />
                              <span className="truncate max-w-[180px]">Facebook</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(event)}
                            className="mr-1"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(event.id)}
                            disabled={deletingId === event.id}
                            className="text-destructive"
                          >
                            {deletingId === event.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
                <DialogDescription>
                  These fields control how the event appears on the public Events page.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-2 pr-2">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-4">Basic Information</h4>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Event Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="e.g., Spring Championship Show"
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date *</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => handleChange('start_date', e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date *</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => handleChange('end_date', e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleChange('location', e.target.value)}
                        placeholder="City, State / Venue"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => handleChange('status', value)}
                      >
                        <SelectTrigger id="status" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Media & Links */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-4">Media & Links</h4>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                    <Input
                      id="thumbnail_url"
                      value={formData.thumbnail_url}
                      onChange={(e) => handleChange('thumbnail_url', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">URL to the event thumbnail image</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="showWebsite">Show Website</Label>
                      <Input
                        id="showWebsite"
                        value={formData.showWebsite}
                        onChange={(e) => handleChange('showWebsite', e.target.value)}
                        placeholder="https://example.com"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="showFacebook">Facebook Event Link</Label>
                      <Input
                        id="showFacebook"
                        value={formData.showFacebook}
                        onChange={(e) => handleChange('showFacebook', e.target.value)}
                        placeholder="https://facebook.com/events/..."
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6 mt-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Show Details</h3>
                    <p className="text-sm text-muted-foreground mb-6">Additional information about the event (all fields are optional)</p>
                  </div>
                  
                  {/* Venue Information Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-foreground">Venue Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="venue_name">Venue Name</Label>
                        <Input
                          id="venue_name"
                          value={formData.venue_name}
                          onChange={(e) => handleChange('venue_name', e.target.value)}
                          placeholder="e.g., Oklahoma City Fairgrounds"
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="show_type">Show Type</Label>
                        <Select
                          value={formData.show_type}
                          onValueChange={(value) => handleChange('show_type', value)}
                        >
                          <SelectTrigger id="show_type" className="w-full">
                            <SelectValue placeholder="Select show type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single-day">Single Day</SelectItem>
                            <SelectItem value="multi-day">Multi-Day</SelectItem>
                            <SelectItem value="weekend">Weekend</SelectItem>
                            <SelectItem value="week-long">Week Long</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue_address">Venue Address</Label>
                      <Textarea
                        id="venue_address"
                        value={formData.venue_address}
                        onChange={(e) => handleChange('venue_address', e.target.value)}
                        placeholder="e.g., 1234 OKC Lane, Oklahoma City, OK 73111"
                        rows={2}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Associations Section */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-1">Associations</h4>
                      <p className="text-xs text-muted-foreground mb-2">Enter association names separated by commas</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="associations">Association Names</Label>
                      <Textarea
                        id="associations"
                        value={formData.associations}
                        onChange={(e) => handleChange('associations', e.target.value)}
                        placeholder="e.g., AQHA, APHA, NSBA, IBHA"
                        rows={2}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">Example: AQHA, APHA, NSBA</p>
                    </div>
                  </div>

                  {/* Disciplines Section */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-1">Disciplines</h4>
                      <p className="text-xs text-muted-foreground mb-2">List all disciplines featured in this event</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="disciplines">Discipline Names</Label>
                      <Textarea
                        id="disciplines"
                        value={formData.disciplines}
                        onChange={(e) => handleChange('disciplines', e.target.value)}
                        placeholder="e.g., Western Pleasure, Reining, Trail, Showmanship at Halter"
                        rows={4}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">Enter one discipline per line or separate by commas</p>
                    </div>
                  </div>

                  {/* Officials Section */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-1">Officials</h4>
                      <p className="text-xs text-muted-foreground mb-2">Enter officials in JSON format with their roles</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="officials">Officials (JSON Format)</Label>
                      <Textarea
                        id="officials"
                        value={formData.officials}
                        onChange={(e) => handleChange('officials', e.target.value)}
                        placeholder='{"show_manager": "John Doe", "show_secretary": "Jane Smith", "trail_course_designer": "Bob Johnson"}'
                        rows={5}
                        className="w-full font-mono text-sm"
                      />
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Format: {"{"}"role": "Name"{"}"}</p>
                        <p>Example: {"{"}"show_manager": "John Doe", "show_secretary": "Jane Smith"{"}"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Judges Section */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-1">Judges</h4>
                      <p className="text-xs text-muted-foreground mb-2">List all judges for this event</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="judges">Judge Names</Label>
                      <Textarea
                        id="judges"
                        value={formData.judges}
                        onChange={(e) => handleChange('judges', e.target.value)}
                        placeholder="e.g., Judge 1, Judge 2, Judge 3"
                        rows={3}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">Enter judge names separated by commas or one per line</p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </>
  );
};

export default AdminEventsManagementPage;


