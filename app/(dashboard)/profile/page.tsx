'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function ProfilePage() {
  const router = useRouter();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [uploading, setUploading] = useState(false);

  const email = typeof window !== 'undefined' 
    ? localStorage.getItem('user_email') 
    : '';

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');
    router.push('/login');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !password) return;

    setUploading(true);
    try {
      await api.uploadCAS(file, password);
      alert('CAS uploaded successfully! Please refresh to see updated data.');
      setShowUploadModal(false);
      setFile(null);
      setPassword('');
      router.refresh();
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('⚠️ This will delete ALL portfolio data. This action cannot be undone. Continue?')) {
      return;
    }
    
    try {
      await api.resetPortfolio();
      alert('Portfolio reset successfully');
      router.refresh();
    } catch (err: any) {
      alert('Reset failed: ' + err.message);
    }
  };

  return (
    <div className="pb-20 bg-neutral-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 pt-12 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl">
            👤
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">Profile</h1>
            <p className="text-white/80 text-sm mt-1">{email}</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Actions */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <button 
            onClick={() => setShowUploadModal(true)}
            className="w-full flex items-center justify-between p-4 border-b border-neutral-100 active:bg-neutral-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <div className="text-left">
                <p className="font-semibold">Upload CAS Statement</p>
                <p className="text-sm text-neutral-600">Import mutual fund data</p>
              </div>
            </div>
            <span className="text-neutral-400">›</span>
          </button>

          <button 
            onClick={handleReset}
            className="w-full flex items-center justify-between p-4 active:bg-neutral-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🗑️</span>
              <div className="text-left">
                <p className="font-semibold text-danger-600">Reset Portfolio</p>
                <p className="text-sm text-neutral-600">Clear all data</p>
              </div>
            </div>
            <span className="text-neutral-400">›</span>
          </button>
        </div>

        {/* App Info */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-100">
          <h3 className="font-semibold mb-3">About</h3>
          <div className="space-y-2 text-sm text-neutral-600">
            <p>Version 1.0.0</p>
            <p>Made with ❤️ for Indian investors</p>
          </div>
        </div>

        {/* Logout */}
        <Button
          onClick={handleLogout}
          variant="danger"
          className="w-full"
        >
          Logout
        </Button>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload CAS"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Select CAS PDF
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl"
              required
            />
          </div>

          <Input
            label="PDF Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter PDF password"
            required
          />

          <Button
            type="submit"
            disabled={uploading}
            className="w-full"
          >
            {uploading ? 'Uploading...' : 'Upload CAS'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}