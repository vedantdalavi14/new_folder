import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { P2PFileSender } from '@/components/P2PFileSender';

export default function P2P() {
  console.log('⚡ P2P File Share page loaded');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Instant P2P Share</h1>
            <p className="text-gray-600 mt-1">Direct peer-to-peer transfer using WebRTC. No server storage, maximum privacy.</p>
          </div>
        </div>

        {/* P2P Component */}
        <P2PFileSender />
      </div>
    </div>
  );
}