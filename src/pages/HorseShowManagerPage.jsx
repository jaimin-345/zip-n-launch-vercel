import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Info, CalendarDays, FileText,
  DollarSign, LayoutGrid, Building2, BarChart2, Radio,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { useToast } from '@/components/ui/use-toast';

/* ── Custom folder SVG icons to match the reference design ── */

const FolderCreateIcon = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Back panel */}
    <path d="M4 16C4 13.79 5.79 12 8 12H20L24 8H44C46.21 8 48 9.79 48 12V16H4Z" fill="#5B9BF5" />
    {/* Front panel */}
    <rect x="4" y="16" width="48" height="30" rx="3" fill="#4A8AF4" />
    <rect x="4" y="16" width="48" height="30" rx="3" fill="url(#folderGrad1)" />
    {/* Plus circle */}
    <circle cx="40" cy="38" r="10" fill="#3B7AE8" stroke="white" strokeWidth="2" />
    <path d="M40 33V43M35 38H45" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <defs>
      <linearGradient id="folderGrad1" x1="28" y1="16" x2="28" y2="46" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6BA5F7" />
        <stop offset="1" stopColor="#4A8AF4" />
      </linearGradient>
    </defs>
  </svg>
);

const FolderEmployeeIcon = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Back panel */}
    <path d="M4 16C4 13.79 5.79 12 8 12H20L24 8H44C46.21 8 48 9.79 48 12V16H4Z" fill="#5B9BF5" />
    {/* Front panel */}
    <rect x="4" y="16" width="48" height="30" rx="3" fill="#4A8AF4" />
    <rect x="4" y="16" width="48" height="30" rx="3" fill="url(#folderGrad2)" />
    {/* Building icon inside */}
    <rect x="18" y="23" width="20" height="18" rx="1.5" fill="white" fillOpacity="0.9" />
    <rect x="22" y="27" width="4" height="3" rx="0.5" fill="#4A8AF4" />
    <rect x="30" y="27" width="4" height="3" rx="0.5" fill="#4A8AF4" />
    <rect x="22" y="33" width="4" height="3" rx="0.5" fill="#4A8AF4" />
    <rect x="30" y="33" width="4" height="3" rx="0.5" fill="#4A8AF4" />
    <rect x="26" y="37" width="4" height="4" rx="0.5" fill="#4A8AF4" />
    <defs>
      <linearGradient id="folderGrad2" x1="28" y1="16" x2="28" y2="46" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6BA5F7" />
        <stop offset="1" stopColor="#4A8AF4" />
      </linearGradient>
    </defs>
  </svg>
);

const FolderManagementIcon = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Back panel */}
    <path d="M4 16C4 13.79 5.79 12 8 12H20L24 8H44C46.21 8 48 9.79 48 12V16H4Z" fill="#5B9BF5" />
    {/* Front panel */}
    <rect x="4" y="16" width="48" height="30" rx="3" fill="#4A8AF4" />
    <rect x="4" y="16" width="48" height="30" rx="3" fill="url(#folderGrad3)" />
    {/* Checklist icon inside */}
    <rect x="18" y="22" width="20" height="20" rx="2" fill="white" fillOpacity="0.9" />
    <rect x="22" y="26" width="3" height="3" rx="0.5" fill="#4A8AF4" />
    <rect x="28" y="27" width="7" height="1.5" rx="0.75" fill="#4A8AF4" />
    <rect x="22" y="31.5" width="3" height="3" rx="0.5" fill="#4A8AF4" />
    <rect x="28" y="32.5" width="7" height="1.5" rx="0.75" fill="#4A8AF4" />
    <rect x="22" y="37" width="3" height="3" rx="0.5" fill="#4A8AF4" />
    <rect x="28" y="38" width="7" height="1.5" rx="0.75" fill="#4A8AF4" />
    <defs>
      <linearGradient id="folderGrad3" x1="28" y1="16" x2="28" y2="46" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6BA5F7" />
        <stop offset="1" stopColor="#4A8AF4" />
      </linearGradient>
    </defs>
  </svg>
);

/* ── Section data ── */

const sections = [
  {
    icon: FolderCreateIcon,
    title: 'Create New Show',
    link: '/horse-show-manager/create',
    items: [
      { icon: CalendarDays, label: 'Show Schedule', link: '/horse-show-manager/create' },
      { icon: Info, label: 'Show Structure', link: '/horse-show-manager/show-structure' },
    ],
  },
  {
    icon: FolderEmployeeIcon,
    title: 'Employee Management',
    link: '/horse-show-manager/employee-management',
    items: [
      { icon: FileText, label: 'Contract Management', link: '/horse-show-manager/employee-management/contracts' },
      { icon: DollarSign, label: 'Employee Budgeting Tool', unimplemented: true },
      { icon: LayoutGrid, label: 'Employee / Arena Scheduling', link: '/horse-show-manager/employee-scheduling' },
    ],
  },
  {
    icon: FolderManagementIcon,
    title: 'Horse Show Management',
    link: '/horse-show-manager/stalling-service-manager',
    items: [
      { icon: Radio, label: 'Equipment Management', unimplemented: true, line: 1 },
      { icon: Building2, label: 'Stalling Service', link: '/horse-show-manager/stalling-service-manager', line: 2 },
      { icon: DollarSign, label: 'Horse Show Financials / Analytics', unimplemented: true, line: 3 },
    ],
  },
];

/* ── Section card component ── */

const SectionCard = ({ icon: Icon, title, link, items }) => {
  const { toast } = useToast();

  const handleUnimplemented = (e) => {
    e.preventDefault();
    toast({
      title: 'Coming Soon!',
      description: "This feature isn't implemented yet — stay tuned!",
    });
  };

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 8px 30px -6px rgba(0, 0, 0, 0.10)' }}
      className="h-full"
    >
      <div className="h-full flex flex-col bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-7 shadow-sm">
        {/* Header with folder icon + title */}
        <div className="flex items-center gap-3 mb-6">
          <Icon />
          <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
        </div>

        {/* Sub-item links */}
        <div className="flex-grow space-y-4 mb-7">
          {(() => {
            // Group items by line number (undefined = each item is its own group)
            const groups = [];
            items.forEach((item) => {
              if (item.line != null) {
                const existing = groups.find(g => g.line === item.line);
                if (existing) { existing.items.push(item); }
                else { groups.push({ line: item.line, items: [item] }); }
              } else {
                groups.push({ line: null, items: [item] });
              }
            });

            const renderItem = (item) => {
              const ItemIcon = item.icon;
              return item.unimplemented ? (
                <a
                  key={item.label}
                  href="#"
                  onClick={handleUnimplemented}
                  className="flex items-center gap-3 text-gray-700 dark:text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  <ItemIcon className="h-5 w-5 text-blue-500 shrink-0" />
                  <span className="text-[15px] font-semibold">{item.label}</span>
                </a>
              ) : (
                <Link
                  key={item.label}
                  to={item.link}
                  className="flex items-center gap-3 text-gray-700 dark:text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <ItemIcon className="h-5 w-5 text-blue-500 shrink-0" />
                  <span className="text-[15px] font-semibold">{item.label}</span>
                </Link>
              );
            };

            return groups.map((group, gIdx) => (
              <React.Fragment key={group.line ?? `g-${gIdx}`}>
                {gIdx > 0 && group.line != null && <hr className="border-gray-200 dark:border-border" />}
                {group.items.map(renderItem)}
              </React.Fragment>
            ));
          })()}
        </div>

        {/* Get Started button */}
        <Button asChild className="w-fit bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-6">
          <Link to={link}>Get Started</Link>
        </Button>
      </div>
    </motion.div>
  );
};

/* ── Page ── */

const HorseShowManagerPage = () => {
  return (
    <>
      <Helmet>
        <title>Horse Show Manager - EquiPatterns</title>
        <meta name="description" content="Your all-in-one solution for seamless horse show administration." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-14"
          >
            <h1 className="text-5xl font-extrabold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-sky-400">
              Horse Show Manager
            </h1>
            <p className="text-lg text-muted-foreground">
              Your all-in-one solution for seamless horse show administration.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-8 max-w-5xl mx-auto">
            {sections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <SectionCard {...section} />
              </motion.div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
};

export default HorseShowManagerPage;
