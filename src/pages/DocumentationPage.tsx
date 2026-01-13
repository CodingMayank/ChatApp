import React from 'react';
import { CloudBackground } from '@/components/CloudBackground';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DocumentationPage: React.FC = () => {
  const navigate = useNavigate();

  const handleDownload = () => {
    // Create download link
    const link = document.createElement('a');
    link.href = '/NearbyChat_Technical_Documentation.md';
    link.download = 'NearbyChat_Technical_Documentation.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <CloudBackground />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 glass-card-strong rounded-none border-t-0 border-x-0 px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-foreground">Technical Documentation</h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-6 flex items-center justify-center">
          <div className="w-full max-w-md">
            <GlassCard variant="strong" className="text-center">
              {/* Icon */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl button-gradient flex items-center justify-center shadow-lg">
                <FileText className="w-10 h-10 text-primary-foreground" />
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-foreground mb-2">
                NearbyChat Documentation
              </h2>
              <p className="text-muted-foreground mb-6">
                Complete technical breakdown of the app including tech stack, backend logic, and screen-by-screen explanation.
              </p>

              {/* Contents List */}
              <div className="text-left bg-white/30 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-sm text-foreground mb-2">Document Contents:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Technology Stack Overview</li>
                  <li>• Frontend Architecture</li>
                  <li>• Backend Architecture (Supabase)</li>
                  <li>• Database Schema & ERD</li>
                  <li>• Screen-by-Screen Breakdown</li>
                  <li>• Custom Hooks Explained</li>
                  <li>• Real-Time Features</li>
                  <li>• Design System</li>
                  <li>• Key Packages Used</li>
                </ul>
              </div>

              {/* Download Button */}
              <Button
                variant="sky"
                size="xl"
                className="w-full"
                onClick={handleDownload}
              >
                <Download className="w-5 h-5" />
                Download Documentation
              </Button>

              <p className="text-xs text-muted-foreground mt-4">
                Downloads as Markdown (.md) file - can be opened in any text editor or converted to Word/PDF
              </p>
            </GlassCard>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DocumentationPage;
