import { useMemo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { parseLocalDate } from '@/lib/utils';
import { Download, Save, ShieldCheck, Lock, Rocket, Loader2, CheckCircle2, Info, Globe, Facebook } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAllClassItems } from '@/lib/showBillUtils';
import { generateShowBillPdf } from '@/lib/showBillPdfGenerator';

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: 'bg-yellow-100 text-yellow-800 border-yellow-300', dotColor: 'bg-yellow-500' },
  approved:  { label: 'Approved',  color: 'bg-green-100 text-green-800 border-green-300',   dotColor: 'bg-green-500' },
  locked:    { label: 'Locked',    color: 'bg-blue-100 text-blue-800 border-blue-300',      dotColor: 'bg-blue-600' },
  published: { label: 'Published', color: 'bg-purple-100 text-purple-800 border-purple-300', dotColor: 'bg-purple-600' },
};

// --- Left Panel: Project Info ---
const ProjectInfoCard = ({ formData, user, setFormData }) => {
  const status = formData.showStatus || 'draft';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  return (
    <div className="border rounded-lg bg-card p-5 space-y-4">
      <h3 className="text-base font-semibold">Project Info</h3>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Show Name</p>
          <p className="text-sm font-medium">{formData.showName || 'Untitled Show'}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Owner</p>
          <p className="text-sm font-medium">{user?.user_metadata?.full_name || user?.email || 'Unknown'}</p>
        </div>

        {formData.startDate && (
          <div>
            <p className="text-xs text-muted-foreground">Show Dates</p>
            <p className="text-sm">
              {parseLocalDate(formData.startDate).toLocaleDateString()}
              {formData.endDate && ` — ${parseLocalDate(formData.endDate).toLocaleDateString()}`}
            </p>
          </div>
        )}

        {formData.venueAddress && (
          <div>
            <p className="text-xs text-muted-foreground">Venue</p>
            <p className="text-sm">{formData.venueAddress}</p>
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground mb-1">Current Status</p>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${cfg.color}`}>
            <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="pt-3 border-t space-y-1.5">
        <p className="text-xs text-muted-foreground">
          {formData.disciplines?.length || 0} discipline(s) &middot; {formData.arenas?.length || 0} arena(s)
        </p>
        {formData.showBill && (
          <p className="text-xs text-muted-foreground">
            {formData.showBill.days?.length || 0} day(s) &middot;{' '}
            {formData.showBill.days?.reduce((sum, d) => sum + d.arenas.reduce((s, a) => s + a.items.filter(i => i.type === 'classBox').length, 0), 0) || 0} class(es) scheduled
          </p>
        )}
      </div>

      {/* Publish Info — website & Facebook */}
      <div className="pt-3 border-t space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Publish Info (shown on Events page)</p>
        <div className="space-y-1.5">
          <Label htmlFor="showWebsite" className="text-xs flex items-center gap-1"><Globe className="h-3 w-3" /> Website URL</Label>
          <Input
            id="showWebsite"
            placeholder="https://yourshow.com"
            value={formData.showWebsite || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, showWebsite: e.target.value }))}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="showFacebook" className="text-xs flex items-center gap-1"><Facebook className="h-3 w-3" /> Facebook Event URL</Label>
          <Input
            id="showFacebook"
            placeholder="https://facebook.com/events/..."
            value={formData.showFacebook || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, showFacebook: e.target.value }))}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
};

// --- Center Panel: Action Buttons ---
const ActionPanel = ({ formData, currentStatus, onStatusChange, onExportPdf, isSaving }) => {
  const isLocked = currentStatus === 'locked' || currentStatus === 'published';

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold mb-1">Manage Show</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Save, approve, and publish your show when ready.
      </p>

      {/* Save Draft */}
      <Button
        variant="outline"
        size="lg"
        className="w-full justify-start text-sm h-12"
        onClick={() => onStatusChange('draft')}
        disabled={isSaving}
      >
        {isSaving ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Save className="mr-3 h-5 w-5" />}
        <div className="text-left">
          <span className="font-semibold">Save Draft</span>
          <span className="block text-xs text-muted-foreground">Save to My Projects as draft</span>
        </div>
      </Button>

      {/* Approve Show */}
      <Button
        variant="outline"
        size="lg"
        className="w-full justify-start text-sm h-12 border-green-200 hover:bg-green-50 hover:border-green-300"
        onClick={() => onStatusChange('approved')}
        disabled={isSaving || isLocked}
      >
        <ShieldCheck className="mr-3 h-5 w-5 text-green-600" />
        <div className="text-left">
          <span className="font-semibold text-green-700">Approve Show</span>
          <span className="block text-xs text-muted-foreground">Mark approved — still editable</span>
        </div>
      </Button>

      {/* Lock Show */}
      <Button
        variant="outline"
        size="lg"
        className="w-full justify-start text-sm h-12 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
        onClick={() => onStatusChange('locked')}
        disabled={isSaving || currentStatus === 'published'}
      >
        <Lock className="mr-3 h-5 w-5 text-blue-600" />
        <div className="text-left">
          <span className="font-semibold text-blue-700">Lock Show</span>
          <span className="block text-xs text-muted-foreground">Disable editing — export & view only</span>
        </div>
      </Button>

      {/* Publish Show */}
      <Button
        size="lg"
        className="w-full justify-start text-sm h-12 bg-purple-600 hover:bg-purple-700 text-white"
        onClick={() => onStatusChange('published')}
        disabled={isSaving}
      >
        <Rocket className="mr-3 h-5 w-5" />
        <div className="text-left">
          <span className="font-semibold">Publish Show</span>
          <span className="block text-xs text-purple-200">Final state — official show bill</span>
        </div>
      </Button>

      {/* Divider */}
      <hr className="my-2 border-border" />

      {/* Export PDF */}
      <Button
        size="lg"
        className="w-full text-sm font-semibold h-12"
        onClick={onExportPdf}
        disabled={isSaving}
      >
        <Download className="mr-2 h-5 w-5" /> Export Final PDF
      </Button>
    </div>
  );
};

// --- Right Panel: Licensing & Ownership ---
const LicensingCard = () => (
  <div className="border rounded-lg bg-card p-5 space-y-4">
    <h3 className="text-base font-semibold flex items-center gap-2">
      <Info className="h-4 w-4 text-primary" />
      Project Ownership & Licensing
    </h3>

    <div className="space-y-2.5">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
        <p className="text-sm">Ownership retained by creator</p>
      </div>
      <div className="flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
        <p className="text-sm">Stored in your My Projects folder</p>
      </div>
      <div className="flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
        <p className="text-sm">Admin access assigned</p>
      </div>
      <div className="flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
        <p className="text-sm">Can be edited until locked</p>
      </div>
    </div>

    <hr className="border-border" />

    <div className="bg-muted/50 rounded-md p-3">
      <p className="text-sm font-medium">Pricing Notice</p>
      <p className="text-xs text-muted-foreground mt-1">
        Building a show is free for members. Licensing applies only when publishing or exporting the final show bill.
      </p>
    </div>
  </div>
);

// --- Main Step Component ---
export const Step6_Preview = ({ formData, setFormData, associationsData, createOrUpdateShow, stepNumber = 7, stepTitle = 'Save & Manage Your Show' }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const allClassItems = useMemo(() => getAllClassItems(formData), [formData]);

  const handleStatusChange = useCallback(async (newStatus) => {
    setIsSaving(true);
    try {
      const project = await createOrUpdateShow(newStatus);
      if (project) {
        const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
        toast({
          title: `Show ${statusLabel}!`,
          description: newStatus === 'published'
            ? 'Your show has been published as the official show bill.'
            : newStatus === 'locked'
            ? 'Show is now locked. Editing is disabled — export and view only.'
            : `Your show has been saved with status: ${statusLabel}.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Could not save show. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [createOrUpdateShow, toast]);

  const handleExportPdf = useCallback(async () => {
    if (!formData.showBill) {
      toast({
        title: 'No Show Bill Data',
        description: 'Please build your schedule in the previous step before exporting.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await generateShowBillPdf(formData.showBill, allClassItems, associationsData, formData.layoutSettings);
      toast({ title: 'PDF Generated', description: 'Your show bill PDF has been downloaded.' });
    } catch (err) {
      toast({ title: 'PDF Error', description: err.message, variant: 'destructive' });
    }
  }, [formData.showBill, formData.layoutSettings, allClassItems, associationsData, toast]);

  const currentStatus = formData.showStatus || 'draft';

  return (
    <motion.div key="step7" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <CardHeader>
        <CardTitle>{`${stepNumber}. ${stepTitle}`}</CardTitle>
        <CardDescription>
          Save your show, manage status, and publish when ready.
          <span className="block mt-1 text-xs text-muted-foreground/70">
            Building a show is free — licensing applies only when publishing/exporting.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Project Info */}
          <div className="lg:col-span-3">
            <ProjectInfoCard formData={formData} user={user} setFormData={setFormData} />
          </div>

          {/* Center Panel: Action Buttons */}
          <div className="lg:col-span-5">
            <ActionPanel
              formData={formData}
              currentStatus={currentStatus}
              onStatusChange={handleStatusChange}
              onExportPdf={handleExportPdf}
              isSaving={isSaving}
            />
          </div>

          {/* Right Panel: Licensing */}
          <div className="lg:col-span-4">
            <LicensingCard />
          </div>
        </div>
      </CardContent>
    </motion.div>
  );
};
