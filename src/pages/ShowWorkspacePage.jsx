import { useState, useEffect } from 'react';
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
  ArrowLeft, Loader2, Calendar, MapPin, Hash,
  CalendarDays, FileText, DollarSign, LayoutGrid, Building2,
  Radio, Award, Edit, ChevronRight, Users, ClipboardList,
  BarChart3, Warehouse, Check, AlertCircle, Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

/* ── Status helpers ── */

const getModuleStatus = (key, pd, extra = {}) => {
  switch (key) {
    case 'editWizard': {
      // Check if all wizard steps were completed (steps 1-8)
      const wizardSteps = pd.completedSteps || [];
      const allWizardDone = [1, 2, 3, 4, 5, 6, 7, 8].every(s => wizardSteps.includes(s));
      if (allWizardDone) return 'completed';
      const hasAssoc = (pd.associations || []).length > 0 || (pd.customAssociations || []).length > 0;
      const hasDisc = (pd.disciplines || []).length > 0;
      const hasDetails = !!(pd.showName && pd.startDate);
      const hasArenas = (pd.arenas || []).length > 0;
      if (hasAssoc && hasDisc && hasDetails && hasArenas) return 'completed';
      if (hasAssoc || hasDisc || hasDetails || wizardSteps.length > 0) return 'in-progress';
      return 'not-started';
    }
    case 'scheduleBuilder': {
      const hasShowBill = pd.showBill && (pd.showBill.days || []).some(d => (d.arenas || []).some(a => (a.items || []).length > 0));
      if (hasShowBill) return 'completed';
      const hasArenas = (pd.arenas || []).length > 0;
      if (hasArenas) return 'in-progress';
      return 'not-started';
    }
    case 'showStructure': {
      const hasExpenses = (pd.showExpenses || []).length > 0;
      const hasFees = (pd.fees || []).length > 0;
      const hasSponsors = (pd.sponsors || []).length > 0 || (pd.sponsorLevels || []).length > 0;
      if (hasExpenses && (hasFees || hasSponsors)) return 'completed';
      if (hasExpenses || hasFees || hasSponsors) return 'in-progress';
      return 'not-started';
    }
    case 'feeStructure': {
      const hasFees = (pd.fees || []).length > 0;
      const hasSponsors = (pd.sponsors || []).length > 0 || (pd.sponsorLevels || []).length > 0;
      if (hasFees && hasSponsors) return 'completed';
      if (hasFees || hasSponsors) return 'in-progress';
      return 'not-started';
    }
    case 'contracts': {
      const contracts = extra.linkedContracts || [];
      if (contracts.length === 0) return 'not-started';
      // Check if any contract has all 6 steps completed
      const allDone = contracts.some(c => {
        const completed = c.project_data?.completedSteps || [];
        return completed.length >= 6;
      });
      if (allDone) return 'completed';
      return 'in-progress';
    }
    case 'budgeting': {
      const hasFees = (pd.fees || []).length > 0;
      const hasExpenses = (pd.showExpenses || []).length > 0;
      if (hasFees && hasExpenses) return 'completed';
      if (hasFees || hasExpenses) return 'in-progress';
      return 'not-started';
    }
    case 'employeeScheduling': {
      const hasSchedule = pd.staffSchedule && Object.keys(pd.staffSchedule.assignments || {}).length > 0;
      if (hasSchedule) return 'completed';
      const hasArenas = (pd.arenas || []).length > 0;
      if (hasArenas) return 'in-progress';
      return 'not-started';
    }
    case 'equipment': {
      const hasEquipment = (pd.equipmentPlans || []).length > 0;
      if (hasEquipment) return 'completed';
      return 'not-started';
    }
    case 'awards': {
      const am = pd.awardsManagement || {};
      const hasAwards = (am.classAwards || []).length > 0 || (am.specialAwards || []).length > 0 || (am.highPointAwards || []).length > 0;
      const hasAwardExpenses = (pd.awardExpenses || []).length > 0;
      if (hasAwards || hasAwardExpenses) return 'completed';
      return 'not-started';
    }
    case 'financials': {
      const hasFees = (pd.fees || []).length > 0;
      const hasExpenses = (pd.showExpenses || []).length > 0;
      if (hasFees && hasExpenses) return 'completed';
      if (hasFees || hasExpenses) return 'in-progress';
      return 'not-started';
    }
    case 'stalling': {
      const hasStalling = (pd.stallingConfig || pd.stallAssignments || []).length > 0;
      if (hasStalling) return 'completed';
      return 'not-started';
    }
    default:
      return 'not-started';
  }
};

const StatusBadge = ({ status }) => {
  if (status === 'completed') {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
        <Check className="h-3.5 w-3.5" />
        Done
      </span>
    );
  }
  if (status === 'in-progress') {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
        <AlertCircle className="h-3.5 w-3.5" />
        In Progress
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/60">
      <Circle className="h-3 w-3" />
      Not Started
    </span>
  );
};

/* ── Module card ── */

const ModuleCard = ({ icon: Icon, title, description, to, color = 'blue', status, comingSoon }) => {
  const { toast } = useToast();
  const colorMap = {
    blue: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600',
    emerald: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600',
    amber: 'bg-amber-100 dark:bg-amber-950/40 text-amber-600',
    violet: 'bg-violet-100 dark:bg-violet-950/40 text-violet-600',
    rose: 'bg-rose-100 dark:bg-rose-950/40 text-rose-600',
    sky: 'bg-sky-100 dark:bg-sky-950/40 text-sky-600',
  };

  const borderClass = status === 'completed'
    ? 'border-emerald-200 dark:border-emerald-800'
    : status === 'in-progress'
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
                  {!comingSoon && <StatusBadge status={status} />}
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
  const completed = allItems.filter(m => m.status === 'completed').length;
  const inProgress = allItems.filter(m => m.status === 'in-progress').length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">Show Progress</span>
        <span className="text-muted-foreground">
          {completed}/{total} modules complete
          {inProgress > 0 && ` · ${inProgress} in progress`}
        </span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden flex">
        {completed > 0 && (
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        )}
        {inProgress > 0 && (
          <div
            className="h-full bg-amber-400 transition-all duration-500"
            style={{ width: `${(inProgress / total) * 100}%` }}
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
  const extra = { linkedContracts };
  const modulesWithStatus = modules.map(section => ({
    ...section,
    items: section.items.map(item => ({
      ...item,
      status: getModuleStatus(item.key, pd, extra),
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
                      show.status === 'draft' && 'bg-amber-50 text-amber-700 border-amber-300'
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
                  <ModuleCard key={mod.title} {...mod} />
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
