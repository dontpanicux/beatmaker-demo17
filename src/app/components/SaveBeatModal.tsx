import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface SaveBeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (beatName: string, onSuccess?: () => void) => Promise<boolean>;
}

export function SaveBeatModal({ isOpen, onClose, onSave }: SaveBeatModalProps) {
  const [beatName, setBeatName] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = beatName.trim();
    if (!name || saving) return;

    setSaving(true);
    const closeOnSuccess = () => {
      setBeatName('');
      onClose();
    };
    try {
      await onSave(name, closeOnSuccess);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-[#18181b] rounded-[12px] p-[32px] w-[400px] border-2 border-[#3f3f47] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-[16px] right-[16px] text-[#9f9fa9] hover:text-[#f1f5f9] transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="font-['Inter:Medium',sans-serif] font-medium text-[#f8fafc] text-[24px] mb-[24px]">
          Save Beat
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[8px]">
            <label className="font-['Inter:Medium',sans-serif] font-medium text-[#f1f5f9] text-[14px]">
              Beat Name
            </label>
            <input
              type="text"
              value={beatName}
              onChange={(e) => setBeatName(e.target.value)}
              required
              autoFocus
              className="bg-[#27272a] border border-[#3f3f47] rounded-[4px] px-[16px] py-[8px] text-[#f1f5f9] font-['Inter:Medium',sans-serif] font-medium text-[16px] outline-none focus:border-[#8200db] transition-colors"
              placeholder="My Awesome Beat"
            />
          </div>

          <div className="flex gap-[8px]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 bg-[#27272a] border border-[#3f3f47] rounded-[8px] px-[16px] py-[12px] text-[#f1f5f9] font-['Geist:Medium',sans-serif] font-medium text-[16px] cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#8200db] border border-[#ad46ff] rounded-[8px] px-[16px] py-[12px] text-[#f8fafc] font-['Geist:Medium',sans-serif] font-medium text-[16px] cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
