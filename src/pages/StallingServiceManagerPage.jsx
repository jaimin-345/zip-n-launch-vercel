import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Loader2, Home, Hash, Calendar, ChevronRight, FolderOpen,
    MapPin, Plus, Trash2, Save, Check, X, Search, Users, DollarSign,
    Building2, Warehouse, Car, ShoppingCart, Edit2, AlertCircle, Wand2,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/components/ui/use-toast';

// ── Constants ──

const STALL_TYPES = [
    { id: 'standard', name: 'Standard Stall', icon: Home, defaultPrice: 75, defaultSize: '10x10' },
    { id: 'premium', name: 'Premium Stall', icon: Home, defaultPrice: 125, defaultSize: '12x12' },
    { id: 'grooming', name: 'Grooming Stall', icon: Home, defaultPrice: 50, defaultSize: '10x10' },
    { id: 'tack', name: 'Tack Stall', icon: Warehouse, defaultPrice: 60, defaultSize: '10x10' },
    { id: 'rv', name: 'RV Spot', icon: Car, defaultPrice: 45, defaultSize: 'Full hookup' },
];

const BOOKING_STATUSES = ['confirmed', 'pending', 'cancelled', 'checked_in', 'checked_out'];
const STATUS_COLORS = {
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    checked_in: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    checked_out: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

// ── Show Picker ──

const ShowPicker = ({ shows, onSelect }) => {
    const navigate = useNavigate();
    if (shows.length === 0) {
        return (
            <Card>
                <CardContent className="py-16 text-center">
                    <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Shows Found</h3>
                    <p className="text-sm text-muted-foreground mb-6">Create a horse show first.</p>
                    <Button onClick={() => navigate('/horse-show-manager/create-show')}>Create Horse Show</Button>
                </CardContent>
            </Card>
        );
    }
    return (
        <div className="space-y-3">
            {shows.map((show, i) => {
                const pd = show.project_data || {};
                return (
                    <motion.div key={show.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <button type="button" className="w-full text-left" onClick={() => onSelect(show)}>
                            <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                                <CardContent className="py-4 px-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-base truncate">{show.project_name || 'Untitled'}</h3>
                                                {pd.showNumber && <Badge variant="secondary" className="text-xs"><Hash className="h-3 w-3 mr-0.5" />#{pd.showNumber}</Badge>}
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                {pd.venueName && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{pd.venueName}</span>}
                                                {pd.startDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{pd.startDate}</span>}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground ml-4" />
                                    </div>
                                </CardContent>
                            </Card>
                        </button>
                    </motion.div>
                );
            })}
        </div>
    );
};

// ── Barn/Area Card ──

const BarnCard = ({ barn, onUpdate, onRemove }) => {
    const [expanded, setExpanded] = useState(true);
    const totalStalls = barn.stalls?.length || 0;
    const booked = (barn.stalls || []).filter(s => s.bookingId).length;

    return (
        <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        <Building2 className="h-4 w-4 text-primary" />
                        <Input
                            value={barn.name}
                            onChange={(e) => onUpdate('name', e.target.value)}
                            className="h-8 text-base font-semibold border-none shadow-none px-0 focus-visible:ring-0 max-w-xs"
                            placeholder="Barn/Area name..."
                        />
                        <Badge variant="outline" className="text-xs">
                            {totalStalls} stalls ({booked} booked)
                        </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
                            {expanded ? <X className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={onRemove}>
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            {expanded && (
                <CardContent className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Stall Type</Label>
                            <Select value={barn.stallType || 'standard'} onValueChange={(val) => onUpdate('stallType', val)}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STALL_TYPES.map(t => (
                                        <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Stall Count</Label>
                            <Input
                                type="number"
                                min={0}
                                value={barn.stallCount || 0}
                                onChange={(e) => {
                                    const count = parseInt(e.target.value) || 0;
                                    onUpdate('stallCount', count);
                                    // Auto-generate stall objects
                                    const existing = barn.stalls || [];
                                    if (count > existing.length) {
                                        const newStalls = [...existing];
                                        for (let i = existing.length; i < count; i++) {
                                            newStalls.push({
                                                id: uuidv4(),
                                                number: `${barn.name?.charAt(0) || 'S'}${i + 1}`,
                                                bookingId: null,
                                            });
                                        }
                                        onUpdate('stalls', newStalls);
                                    } else if (count < existing.length) {
                                        onUpdate('stalls', existing.slice(0, count));
                                    }
                                }}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Price / Night ($)</Label>
                            <Input
                                type="number"
                                min={0}
                                value={barn.pricePerNight || ''}
                                onChange={(e) => onUpdate('pricePerNight', parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs"
                                placeholder="$0"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Stall Size</Label>
                            <Input
                                value={barn.stallSize || ''}
                                onChange={(e) => onUpdate('stallSize', e.target.value)}
                                className="h-8 text-xs"
                                placeholder="e.g., 10x10"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Notes / Amenities</Label>
                        <Textarea
                            value={barn.notes || ''}
                            onChange={(e) => onUpdate('notes', e.target.value)}
                            className="text-xs min-h-[50px]"
                            placeholder="Water, electricity, fans, etc."
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={barn.hasElectricity || false}
                                onCheckedChange={(checked) => onUpdate('hasElectricity', checked)}
                            />
                            <Label className="text-xs">Electricity</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={barn.hasWater || false}
                                onCheckedChange={(checked) => onUpdate('hasWater', checked)}
                            />
                            <Label className="text-xs">Water</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={barn.hasFans || false}
                                onCheckedChange={(checked) => onUpdate('hasFans', checked)}
                            />
                            <Label className="text-xs">Fans</Label>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
};

// ── Booking Row ──

const BookingRow = ({ booking, barns, onUpdate, onRemove }) => {
    const stallOptions = useMemo(() => {
        const options = [];
        for (const barn of barns) {
            for (const stall of (barn.stalls || [])) {
                options.push({ id: stall.id, label: `${barn.name} - ${stall.number}`, barnId: barn.id });
            }
        }
        return options;
    }, [barns]);

    return (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-background border text-sm">
            <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-2">
                <Input
                    value={booking.exhibitorName || ''}
                    onChange={(e) => onUpdate('exhibitorName', e.target.value)}
                    className="h-7 text-xs"
                    placeholder="Exhibitor name"
                />
                <Input
                    value={booking.horseName || ''}
                    onChange={(e) => onUpdate('horseName', e.target.value)}
                    className="h-7 text-xs"
                    placeholder="Horse name"
                />
                <Input
                    value={booking.trainerName || ''}
                    onChange={(e) => onUpdate('trainerName', e.target.value)}
                    className="h-7 text-xs"
                    placeholder="Trainer"
                />
                <Select value={booking.stallId || '__none__'} onValueChange={(val) => onUpdate('stallId', val === '__none__' ? '' : val)}>
                    <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Assign stall..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__none__" className="text-xs">Unassigned</SelectItem>
                        {stallOptions.map(s => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input
                    type="number"
                    value={booking.nights || ''}
                    onChange={(e) => onUpdate('nights', parseInt(e.target.value) || 0)}
                    className="h-7 text-xs"
                    placeholder="Nights"
                />
                <Select value={booking.status || 'pending'} onValueChange={(val) => onUpdate('status', val)}>
                    <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {BOOKING_STATUSES.map(s => (
                            <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace('_', ' ')}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 mt-0.5" onClick={onRemove}>
                <X className="h-3 w-3" />
            </Button>
        </div>
    );
};

// ── Main Dashboard ──

const StallingDashboard = ({ show, onSave, isSaving }) => {
    const pd = show.project_data || {};
    const { toast } = useToast();

    const [barns, setBarns] = useState(() => pd.stallingService?.barns || []);
    const [bookings, setBookings] = useState(() => pd.stallingService?.bookings || []);
    const [searchTerm, setSearchTerm] = useState('');

    // ── Barn CRUD ──
    const addBarn = () => {
        const letter = String.fromCharCode(65 + barns.length);
        const defaultType = STALL_TYPES[0];
        setBarns(prev => [...prev, {
            id: uuidv4(),
            name: `Barn ${letter}`,
            stallType: defaultType.id,
            stallCount: 10,
            pricePerNight: defaultType.defaultPrice,
            stallSize: defaultType.defaultSize,
            stalls: Array.from({ length: 10 }, (_, i) => ({
                id: uuidv4(),
                number: `${letter}${i + 1}`,
                bookingId: null,
            })),
            hasElectricity: false,
            hasWater: false,
            hasFans: false,
            notes: '',
        }]);
    };

    const updateBarn = (barnId, field, value) => {
        setBarns(prev => prev.map(b => b.id === barnId ? { ...b, [field]: value } : b));
    };

    const removeBarn = (barnId) => {
        setBarns(prev => prev.filter(b => b.id !== barnId));
    };

    const autoGenerateBarns = () => {
        if (barns.length > 0) {
            toast({ title: 'Already configured', description: 'Clear existing barns first or add individually.' });
            return;
        }
        const defaultBarns = [
            { name: 'Barn A', type: 'standard', count: 20, price: 75 },
            { name: 'Barn B', type: 'standard', count: 20, price: 75 },
            { name: 'Tack Stalls', type: 'tack', count: 10, price: 60 },
            { name: 'RV Parking', type: 'rv', count: 15, price: 45 },
        ];
        const generated = defaultBarns.map(b => {
            const typeInfo = STALL_TYPES.find(t => t.id === b.type) || STALL_TYPES[0];
            return {
                id: uuidv4(),
                name: b.name,
                stallType: b.type,
                stallCount: b.count,
                pricePerNight: b.price,
                stallSize: typeInfo.defaultSize,
                stalls: Array.from({ length: b.count }, (_, i) => ({
                    id: uuidv4(),
                    number: `${b.name.charAt(0)}${i + 1}`,
                    bookingId: null,
                })),
                hasElectricity: b.type === 'rv',
                hasWater: b.type === 'rv',
                hasFans: false,
                notes: '',
            };
        });
        setBarns(generated);
        toast({ title: 'Barns Generated', description: '4 default areas created with 65 total stalls/spots.' });
    };

    // ── Booking CRUD ──
    const addBooking = () => {
        setBookings(prev => [...prev, {
            id: uuidv4(),
            exhibitorName: '',
            horseName: '',
            trainerName: '',
            stallId: '',
            nights: 3,
            status: 'pending',
            notes: '',
            amount: 0,
        }]);
    };

    const updateBooking = (bookingId, field, value) => {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, [field]: value } : b));
    };

    const removeBooking = (bookingId) => {
        setBookings(prev => prev.filter(b => b.id !== bookingId));
    };

    const filteredBookings = useMemo(() => {
        if (!searchTerm.trim()) return bookings;
        const q = searchTerm.toLowerCase();
        return bookings.filter(b =>
            (b.exhibitorName || '').toLowerCase().includes(q) ||
            (b.horseName || '').toLowerCase().includes(q) ||
            (b.trainerName || '').toLowerCase().includes(q)
        );
    }, [bookings, searchTerm]);

    // ── Stats ──
    const totalStalls = barns.reduce((sum, b) => sum + (b.stallCount || 0), 0);
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'checked_in').length;
    const occupancyRate = totalStalls > 0 ? Math.round((confirmedBookings / totalStalls) * 100) : 0;

    const projectedRevenue = useMemo(() => {
        let total = 0;
        for (const booking of bookings) {
            if (booking.status === 'cancelled') continue;
            const stallId = booking.stallId;
            if (stallId) {
                for (const barn of barns) {
                    const stall = (barn.stalls || []).find(s => s.id === stallId);
                    if (stall) {
                        total += (barn.pricePerNight || 0) * (booking.nights || 0);
                        break;
                    }
                }
            }
        }
        return total;
    }, [bookings, barns]);

    const handleSave = () => {
        onSave({ barns, bookings });
    };

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="rounded-xl border p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Total Stalls</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalStalls}</p>
                </div>
                <div className="rounded-xl border p-4 bg-purple-50 dark:bg-purple-950/20 border-purple-200">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Bookings</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{totalBookings}</p>
                </div>
                <div className="rounded-xl border p-4 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Confirmed</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{confirmedBookings}</p>
                </div>
                <div className="rounded-xl border p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Occupancy</p>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{occupancyRate}%</p>
                </div>
                <div className="rounded-xl border p-4 bg-rose-50 dark:bg-rose-950/20 border-rose-200">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Projected Revenue</p>
                    <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">${projectedRevenue.toLocaleString()}</p>
                </div>
            </div>

            <Tabs defaultValue="inventory">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <TabsList>
                        <TabsTrigger value="inventory">Stall Inventory</TabsTrigger>
                        <TabsTrigger value="bookings">Bookings ({totalBookings})</TabsTrigger>
                        <TabsTrigger value="pricing">Pricing Summary</TabsTrigger>
                    </TabsList>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {isSaving ? 'Saving...' : 'Save All'}
                    </Button>
                </div>

                {/* ── Stall Inventory Tab ── */}
                <TabsContent value="inventory" className="space-y-4 mt-4">
                    <div className="flex items-center gap-3">
                        <Button onClick={addBarn} variant="outline">
                            <Plus className="h-4 w-4 mr-2" /> Add Barn / Area
                        </Button>
                        <Button onClick={autoGenerateBarns} variant="outline">
                            <Wand2 className="h-4 w-4 mr-2" /> Auto-Generate
                        </Button>
                    </div>

                    {barns.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Warehouse className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                                <p className="text-muted-foreground">No barns/areas configured. Click "Add Barn" or "Auto-Generate" to get started.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {barns.map(barn => (
                                <BarnCard
                                    key={barn.id}
                                    barn={barn}
                                    onUpdate={(field, value) => updateBarn(barn.id, field, value)}
                                    onRemove={() => removeBarn(barn.id)}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ── Bookings Tab ── */}
                <TabsContent value="bookings" className="space-y-4 mt-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <Button onClick={addBooking} variant="outline">
                            <ShoppingCart className="h-4 w-4 mr-2" /> Add Booking
                        </Button>
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search exhibitor, horse, trainer..."
                                className="h-8 pl-8 text-sm"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {filteredBookings.length} of {bookings.length} bookings
                        </p>
                    </div>

                    {/* Column headers */}
                    {filteredBookings.length > 0 && (
                        <div className="flex items-center gap-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase">
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-2">
                                <span>Exhibitor</span>
                                <span>Horse</span>
                                <span>Trainer</span>
                                <span>Stall</span>
                                <span>Nights</span>
                                <span>Status</span>
                            </div>
                            <div className="w-6" />
                        </div>
                    )}

                    {filteredBookings.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                                <p className="text-muted-foreground">
                                    {bookings.length === 0
                                        ? 'No bookings yet. Click "Add Booking" to start.'
                                        : 'No bookings match your search.'
                                    }
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            {filteredBookings.map(booking => (
                                <BookingRow
                                    key={booking.id}
                                    booking={booking}
                                    barns={barns}
                                    onUpdate={(field, value) => updateBooking(booking.id, field, value)}
                                    onRemove={() => removeBooking(booking.id)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Status summary */}
                    {bookings.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {BOOKING_STATUSES.map(status => {
                                const count = bookings.filter(b => b.status === status).length;
                                if (count === 0) return null;
                                return (
                                    <Badge key={status} className={cn('text-xs', STATUS_COLORS[status])}>
                                        {status.replace('_', ' ')}: {count}
                                    </Badge>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* ── Pricing Summary Tab ── */}
                <TabsContent value="pricing" className="mt-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-primary" /> Pricing & Revenue Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {barns.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">Add barns/areas to see pricing summary.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/30">
                                                <th className="text-left px-3 py-2 font-medium">Barn / Area</th>
                                                <th className="text-center px-3 py-2 font-medium">Type</th>
                                                <th className="text-center px-3 py-2 font-medium">Count</th>
                                                <th className="text-right px-3 py-2 font-medium">Price/Night</th>
                                                <th className="text-center px-3 py-2 font-medium">Booked</th>
                                                <th className="text-right px-3 py-2 font-medium">Max Revenue (3 nights)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {barns.map(barn => {
                                                const typeInfo = STALL_TYPES.find(t => t.id === barn.stallType) || STALL_TYPES[0];
                                                const bookedCount = bookings.filter(b => {
                                                    if (b.status === 'cancelled') return false;
                                                    return (barn.stalls || []).some(s => s.id === b.stallId);
                                                }).length;
                                                const maxRev = (barn.stallCount || 0) * (barn.pricePerNight || 0) * 3;
                                                return (
                                                    <tr key={barn.id} className="border-b last:border-0">
                                                        <td className="px-3 py-2 font-medium">{barn.name}</td>
                                                        <td className="px-3 py-2 text-center text-muted-foreground">{typeInfo.name}</td>
                                                        <td className="px-3 py-2 text-center">{barn.stallCount || 0}</td>
                                                        <td className="px-3 py-2 text-right">${(barn.pricePerNight || 0).toFixed(2)}</td>
                                                        <td className="px-3 py-2 text-center">
                                                            <Badge variant={bookedCount > 0 ? 'default' : 'outline'} className="text-xs">
                                                                {bookedCount}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-semibold">${maxRev.toLocaleString()}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-muted/30 font-semibold">
                                                <td className="px-3 py-2">Total</td>
                                                <td className="px-3 py-2" />
                                                <td className="px-3 py-2 text-center">{totalStalls}</td>
                                                <td className="px-3 py-2" />
                                                <td className="px-3 py-2 text-center">{confirmedBookings}</td>
                                                <td className="px-3 py-2 text-right">
                                                    ${barns.reduce((sum, b) => sum + ((b.stallCount || 0) * (b.pricePerNight || 0) * 3), 0).toLocaleString()}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}

                            {projectedRevenue > 0 && (
                                <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200">
                                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                                        Projected Revenue from Current Bookings: <span className="text-lg font-bold">${projectedRevenue.toLocaleString()}</span>
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

// ── Main Page ──

const StallingServiceManagerPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const [shows, setShows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedShow, setSelectedShow] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchShows = async () => {
            if (!user) { setIsLoading(false); return; }
            const { data, error } = await supabase
                .from('projects')
                .select('id, project_name, project_data, status, created_at')
                .eq('project_type', 'show')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (!error && data) setShows(data);
            setIsLoading(false);
        };
        fetchShows();
    }, [user]);

    const handleSave = async ({ barns, bookings }) => {
        if (!selectedShow) return;
        setIsSaving(true);
        try {
            const updatedData = {
                ...selectedShow.project_data,
                stallingService: { barns, bookings },
            };
            const { error } = await supabase
                .from('projects')
                .update({ project_data: updatedData })
                .eq('id', selectedShow.id);
            if (error) throw error;
            setSelectedShow(prev => ({ ...prev, project_data: updatedData }));
            setShows(prev => prev.map(s => s.id === selectedShow.id ? { ...s, project_data: updatedData } : s));
            toast({ title: 'Stalling Service Saved', description: 'All stall and booking data saved successfully.' });
        } catch (error) {
            toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
            <Helmet><title>Stalling Service - Horse Show Manager</title></Helmet>
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center gap-3 mb-8">
                        {selectedShow ? (
                            <Button variant="outline" size="icon" onClick={() => setSelectedShow(null)}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button variant="outline" size="icon" onClick={() => navigate('/horse-show-manager')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                <Home className="h-6 w-6 text-primary" />
                                Stalling Service
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {selectedShow
                                    ? `Manage stalls, pricing, and bookings for ${selectedShow.project_name}.`
                                    : 'Select a show to manage stalling services.'
                                }
                            </p>
                        </div>
                    </div>

                    {selectedShow ? (
                        <StallingDashboard show={selectedShow} onSave={handleSave} isSaving={isSaving} />
                    ) : (
                        <ShowPicker shows={shows} onSelect={setSelectedShow} />
                    )}
                </main>
            </div>
        </>
    );
};

export default StallingServiceManagerPage;
