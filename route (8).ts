'use client';

import { useState, useRef } from 'react';
import { Upload, ImageIcon } from 'lucide-react';

interface Props {
  onUpload: (file: File, name: string) => Promise<void>;
  uploading: boolean;
}

export default function FieldUpload({ onUpload, uploading }: Props) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!name) {
      setName(f.name.replace(/\.\w+$/, '').replace(/[_-]/g, ' '));
    }
  };

  const handleSubmit = async () => {
    if (!file || !name.trim()) return;
    await onUpload(file, name.trim());
    setFile(null);
    setPreview(null);
    setName('');
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-forest" />
        Add field image
      </h3>

      {!preview ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onClick={() => fileRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition
            ${dragOver ? 'border-forest bg-green-50/50' : 'border-stone-300 hover:border-forest/50'}
          `}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
          <Upload className="w-6 h-6 text-clay mx-auto mb-2" />
          <p className="text-sm font-medium">Drop satellite image here</p>
          <p className="text-xs text-soil mt-1">PNG or JPG</p>
        </div>
      ) : (
        <div>
          <div className="rounded-lg overflow-hidden border border-stone-200 mb-3">
            <img src={preview} alt="Preview" className="w-full h-40 object-cover" />
          </div>

          <div className="mb-3">
            <label className="text-[11px] font-medium text-soil uppercase tracking-wider block mb-1">
              Field name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. East Half, South Farm"
              className="w-full text-sm border border-stone-200 rounded-md px-3 py-2 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest/20"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || uploading}
              className="flex-1 px-4 py-2 rounded-md text-sm font-medium bg-forest text-white hover:bg-forest-light transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading…' : 'Upload Field'}
            </button>
            <button
              onClick={() => { setFile(null); setPreview(null); setName(''); }}
              className="px-4 py-2 rounded-md text-sm font-medium border border-stone-200 text-soil hover:bg-stone-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
