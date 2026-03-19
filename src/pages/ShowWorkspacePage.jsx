import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Navigation from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Loader2, Calendar, MapPin,
  CalendarDays, FileText, DollarSign, LayoutGrid, Building2,
  Radio, Award, Edit, ChevronRight, Users, ClipboardList,
  BarChart3, Warehouse, Check, Lock, Circle, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/* ── Status helpers ── */

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', icon: Circle, color: 'text-blue-600', iconSize: 'h-3.5 w-3.5', rank: 0 },
  { value: 'locked', label: 'Locked', icon: Lock, color: 'text-amber-600', iconSize: 'h-3.5 w-3.5', rank: 1 },
  { value: 'published', label: 'Published', icon: Check, color: 'text-emerald-600', iconSize: 'h-3.5 w-3.5', rank: 2 },
];

const getModuleStatus = (key, pd) => {
  return (pd.moduleStatuses || {})[key] || 'draft';
};

const StatusBadge = ({ status, moduleKey, onStatusChange }) => {
  const opt = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
  const IconComp = opt.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn('flex items-center gap-1 text-[11px] font-medium rounded-md px-1.5 py-0.5 hover:bg-muted transition-colors', opt.color)}
          onClick={(e) => e.preventDefault()}
        >
          <IconComp className={opt.iconSize} />
          {opt.label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {STATUS_OPTIONS.map((option) => {
          const OptIcon = option.icon;
          const currentRank = STATUS_OPTIONS.find(o => o.value === status)?.rank || 0;
          const isDisabled = option.rank < currentRank;
          return (
            <DropdownMenuItem
              key={option.value}
              disabled={isDisabled}
              className={cn('flex items-center gap-2 text-xs', option.color, status === option.value && 'bg-muted', isDisabled && 'opacity-40 cursor-not-allowed')}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isDisabled) onStatusChange(moduleKey, option.value);
              }}
            >
              <OptIcon className={option.iconSize} />
              {option.label}
              {status === option.value && <Check className="h-3 w-3 ml-auto" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/* ── Module card ── */

const ModuleCard = ({ icon: Icon, title, description, to, color = 'blue', status, moduleKey, onStatusChange, comingSoon }) => {
  const { toast } = useToast();
  const colorMap = {
    blue: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600',
    emerald: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600',
    amber: 'bg-amber-100 dark:bg-amber-950/40 text-amber-600',
    violet: 'bg-violet-100 dark:bg-violet-950/40 text-violet-600',
    rose: 'bg-rose-100 dark:bg-rose-950/40 text-rose-600',
    sky: 'bg-sky-100 dark:bg-sky-950/40 text-sky-600',
  };

  const borderClass = status === 'published'
    ? 'border-emerald-200 dark:border-emerald-800'
    : status === 'locked'
      ? 'border-amber-200 dark:border-amber-800'
      : '';

  const handleClick = (e) => {
    if (comingSoon) {
      e.preventDefault();
      toast({ title: 'Coming Soon!', description: "This feature isn't implemented yet — stay tuned!" });
    }
  };

  const Wrapper = comingSoon ? 'div' : Link;
  const wrapperProps = comingSoon ? { onClick: handleClick } : { to };

  return (
    <Wrapper {...wrapperProps}>
      <motion.div whileHover={{ y: -2 }} className="h-full">
        <Card className={cn('h-full transition-all cursor-pointer', comingSoon ? 'hover:border-amber-300 hover:shadow-md' : 'hover:border-blue-300 hover:shadow-md', borderClass)}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className={cn('p-2.5 rounded-lg shrink-0', colorMap[color])}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm text-foreground">{title}</h3>
                  {!comingSoon && (
                    <StatusBadge status={status} moduleKey={moduleKey} onStatusChange={onStatusChange} />
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Wrapper>
  );
};

/* ── Overall progress bar ── */

const OverallProgress = ({ modules }) => {
  const allItems = modules.flatMap(s => s.items);
  const total = allItems.length;
  const published = allItems.filter(m => m.status === 'published').length;
  const locked = allItems.filter(m => m.status === 'locked').length;
  const pct = total > 0 ? Math.round(((published + locked) / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">Show Progress</span>
        <span className="text-muted-foreground">
          {published}/{total} modules published
          {locked > 0 && ` · ${locked} locked`}
        </span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden flex">
        {published > 0 && (
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(published / total) * 100}%` }}
          />
        )}
        {locked > 0 && (
          <div
            className="h-full bg-amber-400 transition-all duration-500"
            style={{ width: `${(locked / total) * 100}%` }}
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground">{pct}% complete</p>
    </div>
  );
};

/* ── Page ── */

const ShowWorkspacePage = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [show, setShow] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [linkedContracts, setLinkedContracts] = useState([]);

  useEffect(() => {
    const fetchShow = async () => {
      if (!user || !showId) { setIsLoading(false); return; }

      const [showRes, contractsRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, project_name, project_data, status, created_at')
          .eq('id', showId)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('projects')
          .select('id, project_data, status')
          .eq('user_id', user.id)
          .eq('project_type', 'contract')
          .filter('project_data->>linkedProjectId', 'eq', showId),
      ]);

      if (!showRes.error && showRes.data) {
        setShow(showRes.data);
      }
      setLinkedContracts(contractsRes.data || []);
      setIsLoading(false);
    };
    fetchShow();
  }, [user, showId]);

  // Save per-module status directly to Supabase
  const handleModuleStatusChange = useCallback(async (moduleKey, newStatus) => {
    if (!show) return;

    const updatedModuleStatuses = {
      ...(show.project_data?.moduleStatuses || {}),
      [moduleKey]: newStatus,
    };

    const updatedProjectData = {
      ...show.project_data,
      moduleStatuses: updatedModuleStatuses,
    };

    // Update local state immediately
    setShow(prev => ({
      ...prev,
      project_data: updatedProjectData,
    }));

    // Persist to Supabase
    const { error } = await supabase
      .from('projects')
      .update({ project_data: updatedProjectData })
      .eq('id', showId);

    if (error) {
      toast({ title: 'Error saving status', description: error.message, variant: 'destructive' });
      // Revert on error
      setShow(prev => ({
        ...prev,
        project_data: show.project_data,
      }));
    }
  }, [show, showId, toast]);

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        </div>
      </>
    );
  }

  if (!show) {
    return (
      <>
        <Navigation />
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-lg text-muted-foreground">Show not found.</p>
          <Button variant="outline" onClick={() => navigate('/horse-show-manager')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shows
          </Button>
        </div>
      </>
    );
  }

  const pd = show.project_data || {};
  const showName = show.project_name || 'Untitled Show';
  const showNumber = pd.showNumber;
  const displayName = `${showName}${showNumber ? ` #${showNumber}` : ''}`;

  const modules = [
    {
      section: 'Show Setup',
      items: [
        { key: 'editWizard', icon: Edit, title: 'Edit Show Wizard', description: 'Edit associations, disciplines, classes, details, arenas, and schedule.', to: `/horse-show-manager/edit/${showId}`, color: 'blue' },
        { key: 'scheduleBuilder', icon: CalendarDays, title: 'Schedule Builder', description: 'Build and organize the show schedule with drag-and-drop.', to: `/horse-show-manager/schedule-builder/${showId}`, color: 'blue' },
        { key: 'showStructure', icon: DollarSign, title: 'Show Structure & Expenses', description: 'Manage show expenses, fee structures, and sponsors.', to: `/horse-show-manager/show-structure-expenses/${showId}`, color: 'blue' },
        { key: 'feeStructure', icon: DollarSign, title: 'Fee Structure & Sponsors', description: 'Configure entry fees, stall fees, and sponsor levels.', to: `/horse-show-manager/fee-structure/${showId}`, color: 'blue' },
        { key: 'contracts', icon: FileText, title: 'Contract Management', description: 'Create and manage employee contracts for this show.', to: `/horse-show-manager/employee-management/contracts?showId=${showId}`, color: 'blue' },
      ],
    },
    {
      section: 'Employee Management',
      items: [
        { key: 'budgeting', icon: DollarSign, title: 'Employee Budgeting Tool', description: 'Plan and track employee budgets and compensation.', to: `/horse-show-manager/employee-budgeting/${showId}`, color: 'emerald' },
        { key: 'employeeScheduling', icon: LayoutGrid, title: 'Employee / Arena Scheduling', description: 'Assign employees to arenas and time slots.', to: `/horse-show-manager/employee-scheduling/${showId}`, color: 'emerald' },
      ],
    },
    {
      section: 'Show Management',
      items: [
        { key: 'equipment', icon: Radio, title: 'Equipment Management', description: 'Plan and track equipment needs across arenas.', to: `/horse-show-manager/equipment-planning/${showId}`, color: 'amber' },
        { key: 'awards', icon: Award, title: 'Awards Management', description: 'Configure awards, ribbons, and trophies.', to: `/horse-show-manager/awards-management/${showId}`, color: 'violet' },
        { key: 'financials', icon: BarChart3, title: 'Financials & Analytics', description: 'View financial projections, revenue, and analytics.', to: `/horse-show-manager/financials/${showId}`, color: 'rose' },
        { key: 'stalling', icon: Warehouse, title: 'Stalling Service', description: 'Manage stall assignments and barn configurations.', to: `/horse-show-manager/stalling-service-manager/${showId}`, color: 'sky', comingSoon: true },
      ],
    },
  ];

  // Compute status for each module
  const modulesWithStatus = modules.map(section => ({
    ...section,
    items: section.items.map(item => ({
      ...item,
      status: getModuleStatus(item.key, pd),
    })),
  }));

  return (
    <>
      <Helmet>
        <title>{displayName} - Show Workspace</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Back + header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/horse-show-manager')}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              All Shows
            </Button>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
                  {displayName}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  {pd.startDate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {pd.startDate}{pd.endDate && pd.endDate !== pd.startDate ? ` — ${pd.endDate}` : ''}
                    </span>
                  )}
                  {pd.venueName && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {pd.venueName}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={cn('text-xs',
                      show.status === 'published' && 'bg-emerald-50 text-emerald-700 border-emerald-300',
                      show.status === 'locked' && 'bg-amber-50 text-amber-700 border-amber-300',
                      (!show.status || show.status === 'draft') && 'bg-blue-50 text-blue-700 border-blue-300'
                    )}
                  >
                    {show.status || 'draft'}
                  </Badge>
                </div>
              </div>
              <Button
                onClick={() => navigate(`/horse-show-manager/edit/${showId}`)}
                className="bg-blue-500 hover:bg-blue-600 text-white shrink-0"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Show
              </Button>
            </div>
          </motion.div>

          {/* Show stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
          >
            {[
              { label: 'Disciplines', value: (pd.disciplines || []).length, icon: ClipboardList },
              { label: 'Arenas', value: (pd.arenas || []).length, icon: Building2 },
              { label: 'Officials', value: (pd.officials || []).length, icon: Users },
              { label: 'Staff', value: (pd.staff || []).length, icon: Users },
            ].map((stat) => {
              const StatIcon = stat.icon;
              return (
                <Card key={stat.label}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                      <StatIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>

          {/* Overall progress */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mb-10"
          >
            <Card>
              <CardContent className="p-4">
                <OverallProgress modules={modulesWithStatus} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Module sections */}
          {modulesWithStatus.map((section, sIdx) => (
            <motion.div
              key={section.section}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + sIdx * 0.08 }}
              className="mb-8"
            >
              <h2 className="text-lg font-bold text-foreground mb-4">{section.section}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.items.map((mod) => (
                  <ModuleCard key={mod.title} {...mod} moduleKey={mod.key} onStatusChange={handleModuleStatusChange} />
                ))}
              </div>
            </motion.div>
          ))}
        </main>
      </div>
    </>
  );
};

export default ShowWorkspacePage;
