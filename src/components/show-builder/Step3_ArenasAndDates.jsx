import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, Home, AlertCircle } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { parseLocalDate } from '@/lib/utils';

function getDateRange(startDate, endDate) {
    if (!startDate) return [];
    const start = parseLocalDate(startDate);
    const end = endDate ? parseLocalDate(endDate) : start;
    const dates = [];
    let current = start;
    while (current <= end) {
        dates.push(format(current, 'yyyy-MM-dd'));
        current = addDays(current, 1);
    }
    return dates;
}

function formatShortDate(dateStr) {
    const d = parseLocalDate(dateStr);
    return format(d, 'EEE, MMM d');
}

export const Step3_ArenasAndDates = ({ formData, setFormData, stepNumber = 3, stepTitle = 'Arenas & Dates of Use' }) => {
    const competitionDates = getDateRange(formData.startDate, formData.endDate);
    const arenas = formData.arenas || [];

    const addArena = () => {
        setFormData(prev => ({
            ...prev,
            arenas: [...(prev.arenas || []), { id: `arena-${Date.now()}`, name: '', dates: [...competitionDates] }],
        }));
    };

    const removeArena = (id) => {
        setFormData(prev => ({
            ...prev,
            arenas: prev.arenas.filter(a => a.id !== id),
        }));
    };

    const handleNameChange = (id, name) => {
        setFormData(prev => ({
            ...prev,
            arenas: prev.arenas.map(a => a.id === id ? { ...a, name } : a),
        }));
    };

    const toggleDate = (arenaId, dateStr) => {
        setFormData(prev => ({
            ...prev,
            arenas: prev.arenas.map(a => {
                if (a.id !== arenaId) return a;
                const dates = a.dates || [];
                return {
                    ...a,
                    dates: dates.includes(dateStr)
                        ? dates.filter(d => d !== dateStr)
                        : [...dates, dateStr],
                };
            }),
        }));
    };

    // No dates set — show empty state
    if (competitionDates.length === 0) {
        return (
            <motion.div key="step3-arenas" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                <CardHeader>
                    <CardTitle>{`Step ${stepNumber}: ${stepTitle}`}</CardTitle>
                    <CardDescription>Define which arenas are active on which competition days.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground font-medium">No competition dates set yet.</p>
                        <p className="text-sm text-muted-foreground mt-1">Go back to the previous step to set your start and end dates.</p>
                    </div>
                </CardContent>
            </motion.div>
        );
    }

    return (
        <motion.div key="step3-arenas" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CardHeader>
                <CardTitle>{`Step ${stepNumber}: ${stepTitle}`}</CardTitle>
                <CardDescription>Define which arenas are active on which competition days. This data will be used by the schedule builder.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Competition dates summary */}
                <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-sm font-medium text-muted-foreground mr-1">Competition dates:</span>
                    {competitionDates.map(d => (
                        <Badge key={d} variant="secondary">{formatShortDate(d)}</Badge>
                    ))}
                </div>

                {/* Arena cards */}
                <div className="space-y-4">
                    {arenas.map((arena) => {
                        const arenaDates = arena.dates || [];
                        return (
                            <div key={arena.id} className="rounded-lg border bg-card p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Home className="h-5 w-5 text-primary shrink-0" />
                                    <Input
                                        className="font-semibold"
                                        placeholder="e.g., Main Arena"
                                        value={arena.name}
                                        onChange={(e) => handleNameChange(arena.id, e.target.value)}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeArena(arena.id)}
                                        disabled={arenas.length <= 1}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-x-5 gap-y-2 pl-7">
                                    {competitionDates.map(dateStr => (
                                        <label key={dateStr} className="flex items-center gap-2 cursor-pointer">
                                            <Checkbox
                                                checked={arenaDates.includes(dateStr)}
                                                onCheckedChange={() => toggleDate(arena.id, dateStr)}
                                            />
                                            <span className="text-sm">{formatShortDate(dateStr)}</span>
                                        </label>
                                    ))}
                                </div>
                                {arenaDates.length === 0 && (
                                    <p className="text-xs text-destructive pl-7 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> Select at least one date for this arena.
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Add arena button */}
                <Button variant="outline" onClick={addArena} className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Arena
                </Button>
            </CardContent>
        </motion.div>
    );
};
