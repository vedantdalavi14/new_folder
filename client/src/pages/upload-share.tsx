import { useState, useRef, useCallback } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Image, 
  Video, 
  Archive,
  CheckCircle,
  Clock,
  QrCode,
  Shield
} from 'lucide-react';

export default function UploadShare() {
  console.log('📂 Upload & Share page loaded');
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    console.log('📄 File selected:', file.name, 'Size:', file.size);
    setSelectedFile(file);
    setUploadProgress(0);
    setIsComplete(false);
    setShareLink('');
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    console.log('🎯 File dropped');
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 File input changed');
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const simulateUpload = async () => {
    if (!selectedFile) return;
    
    console.log('🚀 Starting upload simulation for:', selectedFile.name);
    setIsUploading(true);
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      console.log('📊 Upload progress:', i + '%');
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Simulate generating share link
    const mockShareLink = `${window.location.origin}/share/mock-${Date.now()}`;
    setShareLink(mockShareLink);
    setIsUploading(false);
    setIsComplete(true);
    
    console.log('✅ Upload complete! Share link:', mockShareLink);
    
    toast({
      title: "Upload Complete",
      description: "Your file is ready to share",
    });
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      console.log('📋 Share link copied to clipboard');
      toast({
        title: "Link Copied",
        description: "Share link copied to clipboard",
      });
    } catch (error) {
      console.error('❌ Failed to copy link:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return <Image className="h-6 w-6" />;
    if (type.startsWith('video/')) return <Video className="h-6 w-6" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="h-6 w-6" />;
    if (type.includes('zip') || type.includes('rar')) return <Archive className="h-6 w-6" />;
    return <FileText className="h-6 w-6" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
            <h1 className="text-3xl font-bold text-gray-800">Upload & Share</h1>
            <p className="text-gray-600 mt-1">Upload to secure cloud storage with 24-hour expiration and QR code sharing</p>
          </div>
        </div>

        {/* Main Upload Card */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="pt-8">
            {!selectedFile ? (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-purple-400 transition-colors"
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => e.preventDefault()}
              >
                <div className="bg-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Drop your file here</h3>
                <p className="text-gray-600 mb-4">or click to browse</p>
                <p className="text-sm text-gray-500 mb-6">Supported: PDF, Images, Videos, Documents • Max: 100MB</p>
                
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  Choose File
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept="*/*"
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selected File Info */}
                <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div className="bg-purple-500 p-2 rounded-lg mr-4">
                    {getFileIcon(selectedFile)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{selectedFile.name}</h4>
                    <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  {!isUploading && !isComplete && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        console.log('🗑️ Removing selected file');
                        setSelectedFile(null);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Uploading...</span>
                      <span className="text-sm text-gray-600">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                {/* Success State */}
                {isComplete && shareLink && (
                  <div className="space-y-4">
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span className="font-medium">Upload Complete!</span>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">Share Link</label>
                        <Button size="sm" variant="outline" onClick={copyShareLink}>
                          Copy Link
                        </Button>
                      </div>
                      <div className="bg-white border rounded p-2 text-sm text-gray-600 break-all">
                        {shareLink}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span className="text-sm">24-hour expiry</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <QrCode className="h-4 w-4 mr-2" />
                        <span className="text-sm">QR code sharing</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Shield className="h-4 w-4 mr-2" />
                        <span className="text-sm">Secure links</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                {!isUploading && !isComplete && (
                  <Button 
                    onClick={simulateUpload}
                    className="w-full bg-purple-500 hover:bg-purple-600"
                    size="lg"
                  >
                    Upload & Share
                  </Button>
                )}

                {/* New Upload Button */}
                {isComplete && (
                  <Button 
                    onClick={() => {
                      console.log('🔄 Starting new upload');
                      setSelectedFile(null);
                      setIsComplete(false);
                      setShareLink('');
                      setUploadProgress(0);
                    }}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    Upload Another File
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center p-6">
            <Clock className="h-8 w-8 text-purple-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">24-hour expiry</h3>
            <p className="text-sm text-gray-600">Files automatically expire for security</p>
          </Card>
          
          <Card className="text-center p-6">
            <QrCode className="h-8 w-8 text-purple-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">QR code sharing</h3>
            <p className="text-sm text-gray-600">Easy sharing with QR codes</p>
          </Card>
          
          <Card className="text-center p-6">
            <Shield className="h-8 w-8 text-purple-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">Secure links</h3>
            <p className="text-sm text-gray-600">Encrypted and protected sharing</p>
          </Card>
        </div>
      </div>
    </div>
  );
}