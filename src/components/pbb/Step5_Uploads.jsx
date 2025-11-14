import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Palette, FileUp, QrCode, Zap } from 'lucide-react';

export const Step5_Uploads = ({ formData, setFormData }) => {
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, [e.target.name]: e.target.files[0] }));
    }
  };

  const handleValueChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <motion.div key="step5-uploads" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <CardHeader>
        <CardTitle>Step 5: Uploads & Media</CardTitle>
        <CardDescription>Customize the look of your pattern book and add media assets.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        
        <div>
          <Label className="text-lg font-semibold">Layout Style</Label>
          <p className="text-sm text-muted-foreground mb-3">Choose the visual theme for your generated documents.</p>
          <RadioGroup value={formData.layoutStyle} onValueChange={(v) => handleValueChange('layoutStyle', v)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Label htmlFor="styleA" className="flex flex-col items-center p-4 border rounded-lg cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/10">
              <RadioGroupItem value="styleA" id="styleA" className="sr-only" />
              <Palette className="w-8 h-8 mb-2" />
              <span className="font-semibold">Style A (Modern)</span>
              <span className="text-xs text-muted-foreground text-center">Clean, minimalist design with a focus on readability.</span>
            </Label>
            <Label htmlFor="styleB" className="flex flex-col items-center p-4 border rounded-lg cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/10">
              <RadioGroupItem value="styleB" id="styleB" className="sr-only" />
              <Palette className="w-8 h-8 mb-2" />
              <span className="font-semibold">Style B (Classic)</span>
              <span className="text-xs text-muted-foreground text-center">Traditional layout with elegant typography and borders.</span>
            </Label>
          </RadioGroup>
        </div>

        <div>
          <Label className="text-lg font-semibold">Cover Page</Label>
          <p className="text-sm text-muted-foreground mb-3">Upload a custom cover (optional).</p>
          <Input name="coverPageFile" type="file" accept=".pdf" onChange={handleFileChange} />
        </div>

        <div>
          <Label htmlFor="eventThumbnail" className="text-lg font-semibold">Event Page Thumbnail</Label>
          <p className="text-sm text-muted-foreground mb-3">This image will be used on the main Events page.</p>
          <Input id="eventThumbnail" name="eventThumbnail" type="file" accept="image/*" onChange={handleFileChange} />
        </div>

        <div className="p-6 border rounded-lg bg-primary/10 border-primary/30 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="officePackageUpgrade" className="text-lg font-semibold flex items-center"><Zap className="w-5 h-5 mr-2 text-primary"/>Office Pro Package</Label>
              <p className="text-sm text-muted-foreground">Auto-publish, QR codes, and office-ready PDFs.</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold text-lg text-primary">+$150.00</span>
              <Switch id="officePackageUpgrade" checked={formData.officePackageUpgrade} onCheckedChange={(c) => handleValueChange('officePackageUpgrade', c)} />
            </div>
          </div>
          {formData.officePackageUpgrade && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-4 border-t border-primary/20">
              <div>
                <Label htmlFor="publishDate">Scheduled Publish Date</Label>
                <p className="text-xs text-muted-foreground mb-2">Patterns will become public on this date.</p>
                <Input id="publishDate" name="publishDate" type="date" value={formData.publishDate} onChange={(e) => handleValueChange('publishDate', e.target.value)} />
              </div>
              <div className="flex items-start space-x-3 p-3 bg-background/50 rounded-md">
                <QrCode className="w-5 h-5 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">What's Included?</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                    <li>Automatic posting to your event page.</li>
                    <li>Print-ready QR codes for each pattern.</li>
                    <li>A separate package of documents for office use.</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </div>

      </CardContent>
    </motion.div>
  );
};