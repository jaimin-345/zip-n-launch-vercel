import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Trash2, Loader2, Image as ImageIcon, Sparkles } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const BUCKET = 'site_branding';

const ImageUploadCard = ({ label, description, currentUrl, onUpload, onRemove, isUploading }) => {
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Preview */}
          <div className="w-full sm:w-64 h-40 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/30 shrink-0">
            {currentUrl ? (
              <img src={currentUrl} alt={label} className="w-full h-full object-contain" />
            ) : (
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No image uploaded</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-lg font-semibold">{label}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            <div className="flex items-center gap-3">
              <Label
                htmlFor={`upload-${label}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors"
              >
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="h-4 w-4" /> {currentUrl ? 'Replace' : 'Upload'}</>
                )}
              </Label>
              <input
                id={`upload-${label}`}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />

              {currentUrl && (
                <Button variant="outline" size="sm" onClick={onRemove} disabled={isUploading} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" /> Remove
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">PNG, JPG, WebP, or SVG. Max 5MB.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminSiteBrandingPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [branding, setBranding] = useState({ background_url: '', logo_url: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState({ background: false, logo: false });

  const fetchBranding = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('site_branding')
      .select('*')
      .eq('id', 'main')
      .single();

    if (error && error.code !== 'PGRST116') {
      toast({ title: 'Error loading branding', description: error.message, variant: 'destructive' });
    }
    if (data) {
      setBranding({ background_url: data.background_url || '', logo_url: data.logo_url || '' });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const uploadFile = async (file, field) => {
    const key = field === 'background_url' ? 'background' : 'logo';
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 5MB.', variant: 'destructive' });
      return;
    }

    setUploading(prev => ({ ...prev, [key]: true }));

    try {
      // Remove old file if exists
      if (branding[field]) {
        const oldPath = branding[field].split(`/${BUCKET}/`).pop();
        if (oldPath) {
          await supabase.storage.from(BUCKET).remove([oldPath]);
        }
      }

      // Upload new file
      const fileExt = file.name.split('.').pop();
      const filePath = `${key}_${uuidv4()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      // Upsert branding record
      const { error: dbError } = await supabase
        .from('site_branding')
        .upsert({
          id: 'main',
          [field]: publicUrl,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (dbError) throw dbError;

      setBranding(prev => ({ ...prev, [field]: publicUrl }));
      toast({ title: `${key === 'background' ? 'Background image' : 'Logo'} updated` });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    }

    setUploading(prev => ({ ...prev, [key]: false }));
  };

  const removeFile = async (field) => {
    const key = field === 'background_url' ? 'background' : 'logo';

    try {
      if (branding[field]) {
        const oldPath = branding[field].split(`/${BUCKET}/`).pop();
        if (oldPath) {
          await supabase.storage.from(BUCKET).remove([oldPath]);
        }
      }

      const { error } = await supabase
        .from('site_branding')
        .upsert({
          id: 'main',
          [field]: '',
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;

      setBranding(prev => ({ ...prev, [field]: '' }));
      toast({ title: `${key === 'background' ? 'Background image' : 'Logo'} removed` });
    } catch (err) {
      toast({ title: 'Remove failed', description: err.message, variant: 'destructive' });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <>
      <Helmet>
        <title>Site Branding - Admin Dashboard</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <div className="flex items-center gap-3 mb-6">
              <Link to="/admin">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Site Branding</h1>
                <p className="text-lg text-muted-foreground mt-1">Upload the homepage background image and site logo.</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                <ImageUploadCard
                  label="Homepage Background"
                  description="The main background image displayed on the homepage hero section."
                  currentUrl={branding.background_url}
                  onUpload={(file) => uploadFile(file, 'background_url')}
                  onRemove={() => removeFile('background_url')}
                  isUploading={uploading.background}
                />

                <ImageUploadCard
                  label="Site Logo"
                  description="The logo displayed in the navigation bar and footer."
                  currentUrl={branding.logo_url}
                  onUpload={(file) => uploadFile(file, 'logo_url')}
                  onRemove={() => removeFile('logo_url')}
                  isUploading={uploading.logo}
                />
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default AdminSiteBrandingPage;
