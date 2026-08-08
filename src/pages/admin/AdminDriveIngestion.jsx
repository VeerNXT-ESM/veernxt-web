import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, FolderPlus, Upload, FileText, CheckCircle, AlertCircle, RefreshCw, 
  ChevronRight, ArrowLeft, Cloud, ExternalLink, HardDrive, 
  Trash2, Play, Pause, Square, Eye, Sparkles, Check, Plus, RotateCcw, FolderSearch,
  Search, Grid, List, X, Home, FolderUp, FileUp, Minimize2, Maximize2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { processDocxFile, renderCustomThumbnailCanvas } from '../../lib/contentEngineProcessor';
import { uploadFilesToR2, R2_PUBLIC_URL } from '../../lib/r2Uploader';

const THUMBNAIL_THEMES = [
  { id: 'default', name: 'Auto Extracted from Docx', path: '' },
  { id: 'green', name: 'Royal Green Theme (Default)', path: '/thumbnils/thumbnil royal green.png' },
  { id: 'blue', name: 'Royal Blue Theme', path: '/thumbnils/thumbnil royal blue.png' },
  { id: 'red', name: 'Royal Red Theme', path: '/thumbnils/thumbnil royal red.png' }
];

// Helper to recursively traverse dropped folder items in drag-and-drop (supports multiple folders & large directory trees)
async function scanFilesFromDataTransferItems(items) {
  const fileList = [];

  async function traverseFileTree(item, path = '') {
    if (!item) return;

    if (item.isFile) {
      return new Promise((resolve) => {
        item.file((file) => {
          if (file && (file.name.endsWith('.docx') || file.name.endsWith('.doc'))) {
            file.relativePath = path + file.name;
            fileList.push(file);
          }
          resolve();
        }, () => resolve());
      });
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      let entries = [];

      const readEntriesBatch = async () => {
        const results = await new Promise((resolve) => {
          dirReader.readEntries(
            (res) => resolve(res || []),
            () => resolve([])
          );
        });
        if (results && results.length > 0) {
          entries = entries.concat(results);
          await readEntriesBatch();
        }
      };

      await readEntriesBatch();

      for (const entry of entries) {
        await traverseFileTree(entry, path + item.name + '/');
      }
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null;
    if (item) {
      await traverseFileTree(item, '');
    }
  }

  return fileList;
}

export default function AdminDriveIngestion() {
  // Google Drive Folder Navigation State
  const [currentPath, setCurrentPath] = useState([]); // Array of strings e.g. ['CENTRAL EXAMS', '01.SSC']
  const [customFolders, setCustomFolders] = useState({}); // { 'path/key': ['Folder1', 'Folder2'] }
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');

  // Dropzone drag-over highlight state
  const [isDragOver, setIsDragOver] = useState(false);

  // New Menu / Action Dropdown State
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  // Create Folder Modal State
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');

  // Single File Upload Modal State (Dynamic Thumbnail Option)
  const [isSingleUploadModalOpen, setIsSingleUploadModalOpen] = useState(false);
  const [selectedSingleFiles, setSelectedSingleFiles] = useState([]);
  const [singleUploadSubject, setSingleUploadSubject] = useState('');
  const [singleUploadTheme, setSingleUploadTheme] = useState(THUMBNAIL_THEMES[1]); // Default Royal Green
  const [singleUploadCaption, setSingleUploadCaption] = useState('');
  const previewCanvasRef = useRef(null);

  // Ingestion Queue State & Controls
  const [filesQueue, setFilesQueue] = useState([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isBatchPaused, setIsBatchPaused] = useState(false);
  const [processingIndex, setProcessingIndex] = useState(-1);
  const [isQueueMinimized, setIsQueueMinimized] = useState(false);

  // Refs for batch pause/stop controls
  const isBatchPausedRef = useRef(false);
  const isBatchStoppedRef = useRef(false);

  // Hidden File & Directory Input Refs
  const singleFileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Database Resources State
  const [existingResources, setExistingResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);

  useEffect(() => {
    fetchExistingResources();
  }, []);

  // Update Live Preview Canvas for Single File Upload Modal
  useEffect(() => {
    if (isSingleUploadModalOpen && singleUploadTheme && singleUploadTheme.id !== 'default' && previewCanvasRef.current) {
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (singleUploadCaption && singleUploadCaption.trim()) {
          const lines = singleUploadCaption.trim().split('\n');
          const maxLen = Math.max(...lines.map(l => l.length));

          const baseFactor = canvas.width / 400;
          const fontSize = Math.max(Math.floor(10 * baseFactor), Math.min(Math.floor(18 * baseFactor), Math.floor((220 * baseFactor) / (maxLen || 1))));

          ctx.font = `bold ${fontSize}px "Georgia", "Times New Roman", serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const lineHeight = fontSize * 1.35;
          const totalHeight = lines.length * lineHeight;

          const boxStart = canvas.height * 0.605;
          const boxEnd = canvas.height * 0.725;
          const boxHeight = boxEnd - boxStart;
          let currentY = boxStart + ((boxHeight - totalHeight) / 2) + (lineHeight / 2);

          lines.forEach((line) => {
            const textLine = line.trim().toUpperCase();

            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillText(textLine, (canvas.width / 2) + (1.5 * baseFactor), currentY + (1.5 * baseFactor));

            const goldGradient = ctx.createLinearGradient(0, currentY - fontSize, 0, currentY + fontSize);
            goldGradient.addColorStop(0, '#FFF5C0');
            goldGradient.addColorStop(0.3, '#F3D274');
            goldGradient.addColorStop(0.7, '#D4AF37');
            goldGradient.addColorStop(1, '#AA7C11');

            ctx.fillStyle = goldGradient;
            ctx.fillText(textLine, canvas.width / 2, currentY);

            currentY += lineHeight;
          });
        }
      };
      img.src = singleUploadTheme.path;
    }
  }, [isSingleUploadModalOpen, singleUploadTheme, singleUploadCaption]);

  const fetchExistingResources = async () => {
    setLoadingResources(true);
    try {
      const { data, error } = await supabase
        .from('resources_v2')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!error && data) {
        setExistingResources(data);
      }
    } catch (e) {
      console.error('Error fetching resources:', e);
    } finally {
      setLoadingResources(false);
    }
  };

  // Helper: check if file is duplicate
  const isDuplicateFile = (fileName, targetPath) => {
    const cleanName = (fileName || '').toLowerCase().replace(/\.[^/.]+$/, '').trim();
    const cleanPath = (targetPath || '').toLowerCase().trim();

    return existingResources.some(res => {
      const dbTitle = (res.title || res.source_file || '').toLowerCase().replace(/\.[^/.]+$/, '').trim();
      const dbPath = (res.drive_path || res.storage_base_url || '').toLowerCase().trim();
      return dbTitle.includes(cleanName) && dbPath.includes(cleanPath);
    });
  };

  // Current Active Path Key string
  const currentPathKey = currentPath.join('/');
  const activeDrivePathDisplay = currentPath.length > 0 ? currentPath.join(' / ') : 'Root';

  // ----------------------------------------------------
  // FOLDER & RESOURCE HIERARCHY COMPUTATION
  // ----------------------------------------------------
  const computeDriveItems = () => {
    const depth = currentPath.length;
    const foldersSet = new Set();
    const directFiles = [];

    // 1. Custom Folders created by user at currentPathKey
    const customList = customFolders[currentPathKey] || [];
    customList.forEach(f => foldersSet.add(f));

    // 2. Folders and Files derived from Supabase existing resources
    existingResources.forEach(res => {
      let segments = [];
      if (res.drive_path) {
        segments = res.drive_path.split('/').map(s => s.trim()).filter(Boolean);
      } else if (res.storage_base_url && res.storage_base_url.includes('structured_resources/')) {
        const sub = res.storage_base_url.split('structured_resources/')[1] || '';
        segments = sub.split('/').map(s => s.trim()).filter(Boolean);
        if (segments.length > 0 && segments[segments.length - 1] === res.resource_id) {
          segments.pop();
        }
      } else {
        segments = [res.conducting_body, res.exam_name, res.category].filter(Boolean);
      }

      let matches = true;
      for (let i = 0; i < depth; i++) {
        if (!segments[i] || segments[i].toLowerCase() !== currentPath[i].toLowerCase()) {
          matches = false;
          break;
        }
      }

      if (matches) {
        if (segments.length > depth) {
          foldersSet.add(segments[depth]);
        } else {
          directFiles.push(res);
        }
      }
    });

    let folderList = Array.from(foldersSet).sort();

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      folderList = folderList.filter(f => f.toLowerCase().includes(q));
    }

    // Filter files by search query
    let filteredFiles = directFiles;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filteredFiles = directFiles.filter(res => 
        (res.title && res.title.toLowerCase().includes(q)) || 
        (res.source_file && res.source_file.toLowerCase().includes(q))
      );
    }

    return { folderList, filesList: filteredFiles };
  };

  const { folderList, filesList } = computeDriveItems();

  // Compute item counts inside subfolders for preview badges
  const getSubItemCount = (folderName) => {
    const targetFolderSegments = [...currentPath, folderName];
    const depth = targetFolderSegments.length;
    let count = 0;

    // Count in DB
    existingResources.forEach(res => {
      let segments = [];
      if (res.drive_path) {
        segments = res.drive_path.split('/').map(s => s.trim()).filter(Boolean);
      } else if (res.storage_base_url && res.storage_base_url.includes('structured_resources/')) {
        const sub = res.storage_base_url.split('structured_resources/')[1] || '';
        segments = sub.split('/').map(s => s.trim()).filter(Boolean);
        if (segments.length > 0 && segments[segments.length - 1] === res.resource_id) {
          segments.pop();
        }
      } else {
        segments = [res.conducting_body || 'General', res.exam_name || 'General', res.category || 'Guide'];
      }

      let matches = true;
      for (let i = 0; i < depth; i++) {
        if (!segments[i] || segments[i].toLowerCase() !== targetFolderSegments[i].toLowerCase()) {
          matches = false;
          break;
        }
      }
      if (matches) count++;
    });

    // Count in custom subfolders map
    const subKey = targetFolderSegments.join('/');
    if (customFolders[subKey]) {
      count += customFolders[subKey].length;
    }

    return count;
  };

  // ----------------------------------------------------
  // CREATE FOLDER ACTION
  // ----------------------------------------------------
  const handleCreateFolderSubmit = (e) => {
    e.preventDefault();
    if (!newFolderNameInput.trim()) return;

    const folderName = newFolderNameInput.trim();
    setCustomFolders(prev => ({
      ...prev,
      [currentPathKey]: [...(prev[currentPathKey] || []), folderName]
    }));

    setNewFolderNameInput('');
    setIsCreateFolderModalOpen(false);
  };

  // ----------------------------------------------------
  // SINGLE FILE UPLOAD SELECTION & MODAL
  // ----------------------------------------------------
  const handleSingleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    const docxFiles = files.filter(f => f.name.endsWith('.docx') || f.name.endsWith('.doc'));

    if (docxFiles.length === 0) {
      alert('Please select valid Microsoft Word (.docx) files.');
      return;
    }

    setSelectedSingleFiles(docxFiles);
    const firstTitle = docxFiles[0].name.replace(/\.[^/.]+$/, '').toUpperCase();
    setSingleUploadSubject(docxFiles[0].name.replace(/\.[^/.]+$/, ''));
    setSingleUploadCaption(`${firstTitle}\nMASTER GUIDE`);
    setSingleUploadTheme(THUMBNAIL_THEMES[1]); // Default Royal Green Theme
    setIsSingleUploadModalOpen(true);
  };

  const handleSingleUploadSubmit = () => {
    if (selectedSingleFiles.length === 0) return;

    const targetPath = activeDrivePathDisplay;

    const newQueueItems = selectedSingleFiles.map(file => {
      const duplicate = isDuplicateFile(file.name, targetPath);
      const docTitle = singleUploadSubject || file.name.replace(/\.[^/.]+$/, '');

      return {
        file,
        id: Math.random().toString(36).substring(7),
        root: currentPath[0] || 'General',
        group: currentPath[1] || 'General',
        exam: currentPath[2] || 'General',
        fullPathDisplay: targetPath,
        category: currentPath[3] || 'Guide',
        materialFolder: currentPath[3] || '',
        subject: docTitle,
        theme: singleUploadTheme,
        caption: singleUploadCaption,
        status: duplicate ? 'skipped' : 'pending',
        progress: duplicate ? 100 : 0,
        logs: duplicate ? ['[Skipped] File already exists in R2 / Database.'] : ['Ready for single-file ingestion'],
        result: null
      };
    });

    setFilesQueue(prev => [...prev, ...newQueueItems]);
    setIsSingleUploadModalOpen(false);
    setSelectedSingleFiles([]);
    setIsQueueMinimized(false);

    // Auto trigger batch processing
    setTimeout(() => {
      runBatchProcessing();
    }, 200);
  };

  // ----------------------------------------------------
  // BATCH FOLDER UPLOAD SELECTION (Any level)
  // ----------------------------------------------------
  const processFolderFiles = (docxFiles) => {
    const defaultRoyalGreenTheme = THUMBNAIL_THEMES[1]; // Royal Green Theme Default

    const newQueueItems = docxFiles.map(file => {
      const relPath = file.webkitRelativePath || file.relativePath || file.name;
      const parts = relPath.split('/').map(p => p.trim()).filter(Boolean);

      const fileName = parts.pop();
      const folderLevels = parts;

      // Construct target full path: current active path + folder relative sub-levels
      const fullPathSegments = currentPath.length > 0 ? [...currentPath, ...folderLevels] : folderLevels;
      const targetPath = fullPathSegments.join(' / ');

      // Also dynamically register created subfolders in customFolders state
      if (folderLevels.length > 0) {
        let parentKey = currentPathKey;
        folderLevels.forEach(subF => {
          setCustomFolders(prev => {
            const existing = prev[parentKey] || [];
            if (!existing.includes(subF)) {
              return { ...prev, [parentKey]: [...existing, subF] };
            }
            return prev;
          });
          parentKey = parentKey ? `${parentKey}/${subF}` : subF;
        });
      }

      const docTitle = fileName.replace(/\.[^/.]+$/, '').toUpperCase();
      const autoCaption = `${docTitle}\nMASTER GUIDE`;
      const duplicate = isDuplicateFile(fileName, targetPath);

      let category = 'Guide';
      const lastFolder = folderLevels[folderLevels.length - 1] || '';
      if (lastFolder.includes('INTRO')) category = 'Intro';
      else if (lastFolder.includes('PRECIS')) category = 'Precis';

      return {
        file,
        id: Math.random().toString(36).substring(7),
        root: fullPathSegments[0] || 'General',
        group: fullPathSegments[1] || 'General',
        exam: fullPathSegments[2] || 'General',
        fullPathDisplay: targetPath,
        category: category,
        materialFolder: lastFolder,
        subject: docTitle,
        theme: defaultRoyalGreenTheme, // Default Royal Green for folder drops
        caption: autoCaption,
        status: duplicate ? 'skipped' : 'pending',
        progress: duplicate ? 100 : 0,
        logs: duplicate ? ['[Skipped] File already exists in R2 / Database.'] : ['Ready for batch folder ingestion'],
        result: null
      };
    });

    setFilesQueue(prev => [...prev, ...newQueueItems]);
    setIsQueueMinimized(false);

    // Auto trigger batch processing
    setTimeout(() => {
      runBatchProcessing();
    }, 200);
  };

  const handleFolderDirectorySelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    const docxFiles = selectedFiles.filter(f => f.name.endsWith('.docx') || f.name.endsWith('.doc'));

    if (docxFiles.length === 0) {
      alert('No Microsoft Word (.docx) files found in selected folder.');
      return;
    }

    processFolderFiles(docxFiles);
  };

  // ----------------------------------------------------
  // DRAG & DROP HANDLERS (Folder & Single File)
  // ----------------------------------------------------
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const docxFiles = await scanFilesFromDataTransferItems(e.dataTransfer.items);
      if (docxFiles.length > 0) {
        processFolderFiles(docxFiles);
        return;
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const docxFiles = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.docx') || f.name.endsWith('.doc'));
      if (docxFiles.length > 0) {
        setSelectedSingleFiles(docxFiles);
        const firstTitle = docxFiles[0].name.replace(/\.[^/.]+$/, '').toUpperCase();
        setSingleUploadSubject(docxFiles[0].name.replace(/\.[^/.]+$/, ''));
        setSingleUploadCaption(`${firstTitle}\nMASTER GUIDE`);
        setSingleUploadTheme(THUMBNAIL_THEMES[1]);
        setIsSingleUploadModalOpen(true);
      } else {
        alert('Please drop valid Microsoft Word (.docx) files or folders containing docx materials.');
      }
    }
  };

  // ----------------------------------------------------
  // INGESTION ENGINE PROCESSING
  // ----------------------------------------------------
  const removeQueueItem = (id) => {
    setFilesQueue(prev => prev.filter(item => item.id !== id));
  };

  const updateItemState = (id, update) => {
    setFilesQueue(prev => prev.map(item => item.id === id ? { ...item, ...update } : item));
  };

  const addLog = (id, msg) => {
    setFilesQueue(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, logs: [...item.logs, `[${new Date().toLocaleTimeString()}] ${msg}`] };
      }
      return item;
    }));
  };

  const processQueueItem = async (item) => {
    updateItemState(item.id, { status: 'parsing', progress: 15 });
    addLog(item.id, `Starting DOCX parsing for ${item.file.name}...`);

    try {
      let customThumbnailBlob = null;
      if (item.theme && item.theme.id !== 'default' && item.theme.path) {
        addLog(item.id, `Generating custom Royal Thumbnail (${item.theme.name}) with gold caption...`);
        customThumbnailBlob = await renderCustomThumbnailCanvas(item.theme.path, item.caption || '');
      }

      // 1. Process DOCX into chapters & WebP images under structured_resources/
      const options = {
        examName: item.exam || 'General Exam',
        category: item.category || 'Guide',
        subject: item.subject || 'General',
        conductingBody: item.root || 'General Body',
        drivePath: item.fullPathDisplay || '',
        websiteUrl: '',
        customThumbnailBlob: customThumbnailBlob
      };

      const processResult = await processDocxFile(item.file, options);
      addLog(item.id, `Parsed ${processResult.chapters.length} chapter(s), extracted ${processResult.imageCount} image(s).`);
      updateItemState(item.id, { status: 'uploading', progress: 45 });

      // 2. Upload to Cloudflare R2 under veernxt-resources/structured_resources/
      addLog(item.id, `Uploading ${processResult.r2Files.length} file(s) to Cloudflare R2 (veernxt-resources/${processResult.r2Prefix})...`);

      const r2Urls = await uploadFilesToR2(processResult.r2Files, (completed, total) => {
        const percent = Math.floor(45 + (completed / total) * 40);
        updateItemState(item.id, { progress: percent });
      });

      const storageBaseUrl = `${R2_PUBLIC_URL}/${processResult.r2Prefix}/`;
      const metadataUrl = `${R2_PUBLIC_URL}/${processResult.r2Prefix}/metadata.json`;
      const thumbnailUrl = `${R2_PUBLIC_URL}/${processResult.r2Prefix}/thumbnail.png`;

      addLog(item.id, `R2 Storage upload complete! Base URL: ${storageBaseUrl}`);
      updateItemState(item.id, { progress: 85 });

      // 3. Save to Supabase resources_v2
      addLog(item.id, `Registering resource metadata in Supabase (resources_v2)...`);

      let dbSuccess = false;
      try {
        const res = await fetch('/api/admin/save-resource', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: processResult.metadata,
            r2Urls: {
              storage_base_url: storageBaseUrl,
              metadata_url: metadataUrl,
              thumbnail_url: thumbnailUrl
            }
          })
        });
        if (res.ok) dbSuccess = true;
      } catch (err) {
        // Fallback directly to Supabase client
      }

      if (!dbSuccess) {
        const { error } = await supabase.from('resources_v2').upsert({
          resource_id: processResult.metadata.resource_id,
          file_hash: processResult.metadata.file_hash,
          source_file: processResult.metadata.source_file,
          title: processResult.metadata.title,
          exam_name: processResult.metadata.exam_name,
          subject: processResult.metadata.subject,
          category: processResult.metadata.category,
          conducting_body: processResult.metadata.conducting_body,
          chapter_count: processResult.metadata.chapter_count,
          storage_base_url: storageBaseUrl,
          metadata_url: metadataUrl,
          thumbnail_url: thumbnailUrl,
          is_freemium: processResult.metadata.is_freemium,
          is_locked: processResult.metadata.is_locked,
          status: 'Published',
          drive_path: item.fullPathDisplay || ''
        }, { onConflict: 'resource_id' });

        if (!error) dbSuccess = true;
      }

      if (dbSuccess) {
        addLog(item.id, `✅ Success! Resource published to R2 & DB.`);
        updateItemState(item.id, { 
          status: 'completed', 
          progress: 100, 
          result: {
            resourceId: processResult.resourceId,
            storageUrl: storageBaseUrl
          }
        });
      } else {
        throw new Error('Database insert failed.');
      }
    } catch (err) {
      console.error('Ingestion error:', err);
      addLog(item.id, `❌ Error: ${err.message}`);
      updateItemState(item.id, { status: 'error', progress: 0 });
    }
  };

  const runBatchProcessing = async () => {
    if (isProcessingBatch) return;
    setIsProcessingBatch(true);
    setIsBatchPaused(false);
    isBatchPausedRef.current = false;
    isBatchStoppedRef.current = false;

    const pendingIndices = filesQueue
      .map((item, idx) => item.status === 'pending' || item.status === 'error' ? idx : null)
      .filter(idx => idx !== null);

    for (const idx of pendingIndices) {
      if (isBatchStoppedRef.current) break;

      while (isBatchPausedRef.current) {
        await new Promise(r => setTimeout(r, 400));
        if (isBatchStoppedRef.current) break;
      }

      if (isBatchStoppedRef.current) break;

      setProcessingIndex(idx);
      await processQueueItem(filesQueue[idx]);
    }

    setIsProcessingBatch(false);
    setIsBatchPaused(false);
    isBatchPausedRef.current = false;
    isBatchStoppedRef.current = false;
    setProcessingIndex(-1);
    fetchExistingResources();
  };

  const togglePauseBatch = () => {
    const nextState = !isBatchPaused;
    setIsBatchPaused(nextState);
    isBatchPausedRef.current = nextState;
  };

  const stopBatch = () => {
    isBatchStoppedRef.current = true;
    setIsProcessingBatch(false);
    setIsBatchPaused(false);
    isBatchPausedRef.current = false;
  };

  const handleClearQueue = () => {
    setFilesQueue([]);
    setIsProcessingBatch(false);
    setIsBatchPaused(false);
  };

  // Hidden File Inputs
  const triggerSingleFileInput = () => {
    if (singleFileInputRef.current) singleFileInputRef.current.click();
    setIsNewMenuOpen(false);
  };

  const triggerFolderInput = () => {
    if (folderInputRef.current) folderInputRef.current.click();
    setIsNewMenuOpen(false);
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ 
        padding: '24px', 
        background: '#07090e', 
        color: '#f1f5f9', 
        minHeight: '100vh', 
        fontFamily: 'Inter, system-ui, sans-serif',
        position: 'relative'
      }}
    >
      
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={singleFileInputRef}
        onChange={handleSingleFileInputChange}
        accept=".docx,.doc"
        multiple
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderDirectorySelect}
        webkitdirectory=""
        directory=""
        multiple
        style={{ display: 'none' }}
      />

      {/* DRAG & DROP OVERLAY HIGHLIGHT */}
      {isDragOver && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(139, 184, 92, 0.25)',
          border: '4px dashed #8BB85C',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <FolderUp size={80} color="#8BB85C" style={{ marginBottom: '16px', animation: 'bounce 1s infinite' }} />
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
            Drop Folder or Docx Files Here
          </h2>
          <p style={{ color: '#8BB85C', fontSize: '16px', marginTop: '8px', fontWeight: '600' }}>
            Uploading directly into: <span style={{ color: '#ffffff' }}>structured_resources / {activeDrivePathDisplay}</span>
          </p>
        </div>
      )}

      {/* GOOGLE DRIVE HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(139, 184, 92, 0.1))',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '20px 28px',
        marginBottom: '24px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8BB85C, #4ade80)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(139, 184, 92, 0.3)'
          }}>
            <Cloud size={28} color="#0a0b10" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0, color: '#ffffff', letterSpacing: '-0.5px' }}>
              VeerNXT Cloud Drive Workspace
            </h1>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>Target R2 Storage: <code style={{ color: '#8BB85C' }}>veernxt-resources/structured_resources</code></span>
              <span>• Total Materials: <strong style={{ color: '#ffffff' }}>{existingResources.length}</strong></span>
            </div>
          </div>
        </div>

        {/* Global Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchExistingResources}
            title="Refresh Drive Resources"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#ffffff',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={16} className={loadingResources ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* GOOGLE DRIVE ACTION BAR & SEARCH */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        
        {/* LEFT: "+ NEW" DRIVE BUTTON WITH DROPDOWN */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 24px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #8BB85C, #4ade80)',
              color: '#0a0b10',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(139, 184, 92, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <Plus size={20} strokeWidth={2.5} /> + New
          </button>

          {isNewMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '52px',
              left: 0,
              width: '260px',
              background: '#0f172a',
              border: '1px solid rgba(139, 184, 92, 0.3)',
              borderRadius: '14px',
              padding: '8px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
              zIndex: 100
            }}>
              <button
                onClick={() => { setIsCreateFolderModalOpen(true); setIsNewMenuOpen(false); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'transparent',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(139, 184, 92, 0.15)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                <FolderPlus size={18} color="#8BB85C" /> New Folder
              </button>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />

              <button
                onClick={triggerSingleFileInput}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'transparent',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(139, 184, 92, 0.15)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                <FileUp size={18} color="#38bdf8" /> Upload Single File (Dynamic Thumbnail)
              </button>

              <button
                onClick={triggerFolderInput}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'transparent',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(139, 184, 92, 0.15)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                <FolderUp size={18} color="#4ade80" /> Upload Folder (Batch Ingestion)
              </button>
            </div>
          )}
        </div>

        {/* QUICK TOOLBAR ACTION BUTTONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsCreateFolderModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(139, 184, 92, 0.3)',
              background: 'rgba(139, 184, 92, 0.1)',
              color: '#8BB85C',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <FolderPlus size={16} /> + Folder
          </button>

          <button
            onClick={triggerSingleFileInput}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              background: 'rgba(56, 189, 248, 0.1)',
              color: '#38bdf8',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <FileUp size={16} /> Upload File
          </button>

          <button
            onClick={triggerFolderInput}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              background: 'rgba(74, 222, 128, 0.1)',
              color: '#4ade80',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <FolderUp size={16} /> Upload Folder
          </button>
        </div>

        {/* SEARCH & VIEW TOGGLE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '400px', justifyContent: 'flex-end' }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '320px'
          }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search drive folders & files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '10px',
                background: '#0f172a',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <X size={14} color="#94a3b8" onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }} />
            )}
          </div>

          <div style={{ display: 'flex', background: '#0f172a', borderRadius: '10px', padding: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'grid' ? '#8BB85C' : 'transparent',
                color: viewMode === 'grid' ? '#0a0b10' : '#94a3b8',
                cursor: 'pointer'
              }}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'list' ? '#8BB85C' : 'transparent',
                color: viewMode === 'list' ? '#0a0b10' : '#94a3b8',
                cursor: 'pointer'
              }}
            >
              <List size={16} />
            </button>
          </div>
        </div>

      </div>

      {/* GOOGLE DRIVE BREADCRUMBS PATH BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '12px 18px',
        marginBottom: '24px',
        fontSize: '14px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setCurrentPath([])}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: currentPath.length === 0 ? '#8BB85C' : '#94a3b8',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          <Home size={16} /> My Drive
        </button>

        {currentPath.map((folder, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight size={14} color="#64748b" />
            <button
              onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
              style={{
                background: 'none',
                border: 'none',
                color: idx === currentPath.length - 1 ? '#8BB85C' : '#94a3b8',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              {folder}
            </button>
          </React.Fragment>
        ))}

        {currentPath.length > 0 && (
          <button
            onClick={() => setCurrentPath(currentPath.slice(0, -1))}
            title="Up one level"
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#94a3b8',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}
      </div>

      {/* MAIN DRIVE CONTENT VIEWPORT */}
      {loadingResources ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <RefreshCw size={28} className="spin" style={{ marginBottom: '12px' }} />
          <div>Loading Drive Resources...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* SECTION 1: FOLDERS GRID/LIST */}
          {folderList.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Folder size={16} color="#8BB85C" /> Folders ({folderList.length})
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Double-click or click to navigate into any folder
                </div>
              </div>

              {viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                  {folderList.map(folderName => {
                    const itemCount = getSubItemCount(folderName);
                    return (
                      <div
                        key={folderName}
                        onClick={() => setCurrentPath([...currentPath, folderName])}
                        style={{
                          background: '#0f172a',
                          border: '1px solid rgba(139, 184, 92, 0.25)',
                          borderRadius: '14px',
                          padding: '16px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#8BB85C';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(139, 184, 92, 0.25)';
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'rgba(139, 184, 92, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Folder size={22} color="#8BB85C" />
                          </div>
                          <div style={{ overflow: 'hidden', minWidth: 0 }}>
                            <div style={{ fontWeight: '600', fontSize: '14px', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {folderName}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              {itemCount} item(s) inside
                            </div>
                          </div>
                        </div>

                        <ChevronRight size={18} color="#64748b" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* LIST VIEW FOR FOLDERS */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {folderList.map(folderName => {
                    const itemCount = getSubItemCount(folderName);
                    return (
                      <div
                        key={folderName}
                        onClick={() => setCurrentPath([...currentPath, folderName])}
                        style={{
                          background: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          padding: '12px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <Folder size={20} color="#8BB85C" />
                          <span style={{ fontWeight: '600', fontSize: '14px', color: '#ffffff' }}>
                            {folderName}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                          <span>{itemCount} items</span>
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: FILES & DOCUMENTS DIRECTLY IN ACTIVE FOLDER */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="#38bdf8" /> Files & Books ({filesList.length})
              </div>
            </div>

            {filesList.length === 0 && folderList.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#0f172a',
                border: '2px dashed rgba(255,255,255,0.1)',
                borderRadius: '16px',
                color: '#94a3b8'
              }}>
                <FolderUp size={48} color="#8BB85C" style={{ marginBottom: '14px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff', margin: '0 0 6px 0' }}>
                  This folder is empty
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px 0' }}>
                  Click <strong>"+ New"</strong> or drop files/folders here to upload to <span style={{ color: '#8BB85C' }}>{activeDrivePathDisplay}</span>
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  <button
                    onClick={triggerSingleFileInput}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#38bdf8',
                      color: '#0a0b10',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    <FileUp size={16} style={{ display: 'inline', marginRight: '6px' }} /> Upload File
                  </button>
                  <button
                    onClick={triggerFolderInput}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#8BB85C',
                      color: '#0a0b10',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    <FolderUp size={16} style={{ display: 'inline', marginRight: '6px' }} /> Upload Folder
                  </button>
                </div>
              </div>
            ) : filesList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '13px' }}>
                No files directly in this folder. Click into one of the subfolders above or upload files here.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {filesList.map(res => (
                  <div
                    key={res.id || res.resource_id}
                    style={{
                      background: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '14px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {res.thumbnail_url ? (
                        <img
                          src={res.thumbnail_url}
                          alt="thumbnail"
                          style={{ width: '64px', height: '90px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      ) : (
                        <div style={{ width: '64px', height: '90px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={28} color="#8BB85C" />
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', color: '#8BB85C', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                          {res.exam_name || 'Exam'} • {res.category || 'Guide'}
                        </div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#ffffff', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {res.title || res.source_file}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {res.chapter_count || 1} chapter(s) • {res.subject || 'General'}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      background: '#06080e',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: '#94a3b8',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {res.storage_base_url || `${R2_PUBLIC_URL}/structured_resources/${res.resource_id}/`}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                      <a
                        href={res.metadata_url || `${R2_PUBLIC_URL}/structured_resources/${res.resource_id}/metadata.json`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'rgba(255,255,255,0.05)',
                          color: '#cbd5e1',
                          fontSize: '12px',
                          textDecoration: 'none'
                        }}
                      >
                        <ExternalLink size={14} /> Metadata
                      </a>
                      <a
                        href={`/reader/${res.resource_id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: '#8BB85C',
                          color: '#0a0b10',
                          fontWeight: '600',
                          fontSize: '12px',
                          textDecoration: 'none'
                        }}
                      >
                        <Eye size={14} /> Read
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: CREATE NEW FOLDER */}
      {/* ---------------------------------------------------- */}
      {isCreateFolderModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <form onSubmit={handleCreateFolderSubmit} style={{
            background: '#0f172a',
            border: '1px solid rgba(139, 184, 92, 0.4)',
            borderRadius: '16px',
            padding: '28px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.7)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderPlus size={20} color="#8BB85C" /> New Folder
              </h3>
              <X size={18} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setIsCreateFolderModalOpen(false)} />
            </div>

            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px 0' }}>
              Creating folder inside: <strong style={{ color: '#8BB85C' }}>{activeDrivePathDisplay}</strong>
            </p>

            <input
              type="text"
              placeholder="Folder name (e.g. 02.BANKING, General Studies)"
              value={newFolderNameInput}
              onChange={(e) => setNewFolderNameInput(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#07090e',
                border: '1px solid #8BB85C',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                marginBottom: '20px'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsCreateFolderModalOpen(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #8BB85C, #4ade80)',
                  color: '#0a0b10',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Create Folder
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: SINGLE FILE UPLOAD WITH DYNAMIC THUMBNAIL */}
      {/* ---------------------------------------------------- */}
      {isSingleUploadModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(139, 184, 92, 0.4)',
            borderRadius: '20px',
            padding: '28px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={22} color="#F3D274" /> Single File Upload & Dynamic Thumbnail
                </h3>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  Destination: <span style={{ color: '#8BB85C', fontWeight: '600' }}>structured_resources / {activeDrivePathDisplay}</span>
                </div>
              </div>
              <X size={20} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setIsSingleUploadModalOpen(false)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '20px', marginBottom: '20px' }}>
              
              {/* Left Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    Selected File ({selectedSingleFiles.length})
                  </label>
                  <div style={{ background: '#07090e', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', color: '#ffffff' }}>
                    {selectedSingleFiles.map(f => f.name).join(', ')}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    Subject / Document Title
                  </label>
                  <input
                    type="text"
                    value={singleUploadSubject}
                    onChange={(e) => setSingleUploadSubject(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#07090e',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    Thumbnail Theme
                  </label>
                  <select
                    value={singleUploadTheme.id}
                    onChange={(e) => {
                      const t = THUMBNAIL_THEMES.find(item => item.id === e.target.value);
                      if (t) setSingleUploadTheme(t);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#07090e',
                      border: '1px solid rgba(234, 193, 90, 0.4)',
                      color: '#ffffff',
                      fontSize: '13px'
                    }}
                  >
                    {THUMBNAIL_THEMES.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {singleUploadTheme.id !== 'default' && (
                  <div>
                    <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#F3D274', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                      Cover Page Gold Caption
                    </label>
                    <textarea
                      rows={3}
                      value={singleUploadCaption}
                      onChange={(e) => setSingleUploadCaption(e.target.value)}
                      placeholder="Enter text to render in gold on cover..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: '#07090e',
                        border: '1px solid rgba(234, 193, 90, 0.5)',
                        color: '#F3D274',
                        fontWeight: '600',
                        fontSize: '12px',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Right Live Canvas Preview */}
              <div style={{ textAlign: 'center', background: '#07090e', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px', fontWeight: '700' }}>
                  LIVE COVER PREVIEW
                </div>
                {singleUploadTheme.id !== 'default' ? (
                  <canvas
                    ref={previewCanvasRef}
                    width={180}
                    height={255}
                    style={{
                      width: '140px',
                      height: '198px',
                      borderRadius: '8px',
                      border: '2px solid rgba(234, 193, 90, 0.6)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
                    }}
                  />
                ) : (
                  <div style={{ width: '140px', height: '198px', margin: '0 auto', background: '#0f172a', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '11px' }}>
                    Auto-extracted from DOCX
                  </div>
                )}
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setIsSingleUploadModalOpen(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSingleUploadSubmit}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #8BB85C, #4ade80)',
                  color: '#0a0b10',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Start Ingestion Engine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* FLOATING GOOGLE DRIVE UPLOAD QUEUE DRAWER (BOTTOM RIGHT) */}
      {/* ---------------------------------------------------- */}
      {filesQueue.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '24px',
          width: isQueueMinimized ? '340px' : '480px',
          background: '#0f172a',
          border: '1px solid rgba(139, 184, 92, 0.4)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          zIndex: 1000,
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}>
          {/* Drawer Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(139, 184, 92, 0.2), rgba(15, 23, 42, 0.9))',
            padding: '12px 18px',
            borderBottom: isQueueMinimized ? 'none' : '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Upload size={18} color="#8BB85C" />
              <div style={{ fontWeight: '700', fontSize: '14px', color: '#ffffff' }}>
                Upload Queue ({filesQueue.length})
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isProcessingBatch && (
                <button
                  onClick={togglePauseBatch}
                  title={isBatchPaused ? "Resume" : "Pause"}
                  style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: '4px' }}
                >
                  {isBatchPaused ? <Play size={16} /> : <Pause size={16} />}
                </button>
              )}

              <button
                onClick={() => setIsQueueMinimized(!isQueueMinimized)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                {isQueueMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>

              <button
                onClick={handleClearQueue}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Drawer Content */}
          {!isQueueMinimized && (
            <div style={{ padding: '16px', maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Batch Actions Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#94a3b8' }}>
                <div>
                  Done: <strong style={{ color: '#4ade80' }}>{filesQueue.filter(f => f.status === 'completed').length}</strong> • 
                  Pending: <strong style={{ color: '#f59e0b' }}>{filesQueue.filter(f => f.status === 'pending').length}</strong>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {!isProcessingBatch && filesQueue.some(f => f.status === 'pending' || f.status === 'error') && (
                    <button
                      onClick={runBatchProcessing}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#8BB85C',
                        color: '#0a0b10',
                        fontWeight: '700',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      <Play size={12} style={{ display: 'inline', marginRight: '4px' }} /> Start Processing
                    </button>
                  )}
                  {isProcessingBatch && (
                    <button
                      onClick={stopBatch}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        fontWeight: '700',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      <Square size={12} style={{ display: 'inline', marginRight: '4px' }} /> Stop
                    </button>
                  )}
                </div>
              </div>

              {/* Items List */}
              {filesQueue.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    background: '#07090e',
                    border: processingIndex === idx ? '1px solid #8BB85C' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                      {item.file.name}
                    </div>

                    <div style={{ fontSize: '11px', fontWeight: '600' }}>
                      {item.status === 'completed' && <span style={{ color: '#4ade80' }}>Completed</span>}
                      {item.status === 'skipped' && <span style={{ color: '#38bdf8' }}>Skipped</span>}
                      {item.status === 'error' && <span style={{ color: '#f87171' }}>Error</span>}
                      {item.status === 'pending' && <span style={{ color: '#94a3b8' }}>Pending</span>}
                      {(item.status === 'parsing' || item.status === 'uploading') && <span style={{ color: '#f59e0b' }}>Processing...</span>}
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Path: <span style={{ color: '#8BB85C' }}>{item.fullPathDisplay}</span>
                  </div>

                  {(item.status === 'parsing' || item.status === 'uploading' || item.status === 'completed') && (
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.progress}%`, background: '#8BB85C', transition: 'width 0.3s ease' }} />
                    </div>
                  )}
                </div>
              ))}

            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>

    </div>
  );
}
