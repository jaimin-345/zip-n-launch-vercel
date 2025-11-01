import React from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
const LicensingAgreement = ({
  agreedToTerms,
  setAgreedToTerms
}) => {
  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><FileText className="mr-2 h-6 w-6 text-primary" /> Licensing & Agreement</CardTitle>
        <CardDescription>Please review and agree to the terms before submitting.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-background/50 border p-4 rounded-lg text-xs text-muted-foreground max-h-40 overflow-y-auto mb-4">
          <p>By submitting, you grant EquiPatterns a non-exclusive, worldwide license to display, sell, and distribute your patterns. You will receive a royalty on each sale. You confirm that you are the original creator of this content and have the right to grant this license. EquiPatterns reserves the right to review and reject any submission.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={setAgreedToTerms} />
          <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            I have read and agree to the licensing terms.
          </label>
        </div>
      </CardContent>
    </Card>;
};
export default LicensingAgreement;