import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Upload, 
  Shield, 
  Users, 
  Clock, 
  QrCode,
  ArrowRightLeft,
  Server,
  Wifi
} from 'lucide-react';

export default function Home() {
  console.log('🏠 Home page loaded - SnapShare Hybrid');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-500 w-12 h-12 rounded-xl flex items-center justify-center mr-3">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-800">SnapShare Hybrid</h1>
              <p className="text-sm text-gray-600">Secure File Sharing Platform</p>
            </div>
            <div className="ml-auto">
              <Badge variant="outline" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                End-to-end encrypted
              </Badge>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Share Files <span className="text-blue-500">Securely</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose your preferred sharing method. No account required, completely private, 
            and secure.
          </p>
        </div>

        {/* Main Options */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          
          {/* P2P Share Option */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="bg-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Instant P2P Share</h3>
                <p className="text-gray-600 mb-6">
                  Direct peer-to-peer transfer using WebRTC. No server storage, maximum privacy.
                </p>
                
                {/* Features */}
                <div className="space-y-3 mb-6 text-left">
                  <div className="flex items-center text-gray-700">
                    <Zap className="h-4 w-4 mr-3 text-blue-500" />
                    <span className="text-sm">Real-time transfer</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Server className="h-4 w-4 mr-3 text-blue-500" />
                    <span className="text-sm">No server storage</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Users className="h-4 w-4 mr-3 text-blue-500" />
                    <span className="text-sm">Direct connection</span>
                  </div>
                </div>
                
                <Link href="/p2p">
                  <Button className="w-full bg-blue-500 hover:bg-blue-600" size="lg">
                    Start P2P Share
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Upload & Share Option */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="bg-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Upload & Share</h3>
                <p className="text-gray-600 mb-6">
                  Upload to secure cloud storage with 24-hour expiration and QR code sharing.
                </p>
                
                {/* Features */}
                <div className="space-y-3 mb-6 text-left">
                  <div className="flex items-center text-gray-700">
                    <Clock className="h-4 w-4 mr-3 text-purple-500" />
                    <span className="text-sm">24-hour expiry</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <QrCode className="h-4 w-4 mr-3 text-purple-500" />
                    <span className="text-sm">QR code sharing</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Shield className="h-4 w-4 mr-3 text-purple-500" />
                    <span className="text-sm">Secure links</span>
                  </div>
                </div>
                
                <Link href="/upload-share">
                  <Button className="w-full bg-purple-500 hover:bg-purple-600" size="lg">
                    Upload & Share
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Why Choose SnapShare */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold text-gray-800 text-center mb-8">Why Choose SnapShare?</h3>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h4 className="font-semibold text-gray-800 mb-2">Privacy First</h4>
                <p className="text-sm text-gray-600">End-to-end encryption ensures your files remain private and secure</p>
              </div>
              
              <div className="text-center">
                <ArrowRightLeft className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                <h4 className="font-semibold text-gray-800 mb-2">Multiple Methods</h4>
                <p className="text-sm text-gray-600">Choose between instant P2P or cloud-based sharing based on your needs</p>
              </div>
              
              <div className="text-center">
                <Wifi className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h4 className="font-semibold text-gray-800 mb-2">No Registration</h4>
                <p className="text-sm text-gray-600">Start sharing immediately without creating accounts or providing personal information</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How it Works */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">How it Works</h3>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* P2P Process */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h4 className="font-semibold text-blue-800 mb-3">P2P Transfer Process</h4>
              <div className="space-y-2 text-sm text-blue-700">
                <p>1. Select your file and create a room</p>
                <p>2. Share the link or QR code with recipient</p>
                <p>3. Direct WebRTC connection established</p>
                <p>4. File transfers peer-to-peer instantly</p>
              </div>
            </div>
            
            {/* Upload Process */}
            <div className="bg-purple-50 rounded-lg p-6">
              <h4 className="font-semibold text-purple-800 mb-3">Upload & Share Process</h4>
              <div className="space-y-2 text-sm text-purple-700">
                <p>1. Upload file to secure cloud storage</p>
                <p>2. Get shareable link and QR code</p>
                <p>3. Recipients download directly</p>
                <p>4. Files auto-expire after 24 hours</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
