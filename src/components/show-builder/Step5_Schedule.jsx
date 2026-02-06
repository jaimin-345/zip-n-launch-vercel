import React from 'react';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import ShowBillBuilder from './show-bill/ShowBillBuilder';

export const Step5_Schedule = ({ formData, setFormData, associationsData }) => {
  if (!formData.disciplines || formData.disciplines.length === 0) {
    return (
      <motion.div key="step5" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
        <CardHeader>
          <CardTitle>Step 5: Build Your Show Bill</CardTitle>
          <CardDescription>Design your show bill document with numbered classes, breaks, and special events.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">No classes to schedule yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Go back to Step 3 to configure your disciplines and create classes.</p>
          </div>
        </CardContent>
      </motion.div>
    );
  }

  return (
    <motion.div key="step5" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <CardHeader>
        <CardTitle>Step 5: Build Your Show Bill</CardTitle>
        <CardDescription>
          Drag classes from the palette into arenas. Insert breaks, drags, and section headers. Reorder by dragging. Your show bill auto-numbers as you organize.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-[600px]">
        <ShowBillBuilder formData={formData} setFormData={setFormData} associationsData={associationsData} />
      </CardContent>
    </motion.div>
  );
};
