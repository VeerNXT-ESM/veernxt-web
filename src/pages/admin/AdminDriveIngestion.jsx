import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, FolderPlus, Upload, FileText, CheckCircle, AlertCircle, RefreshCw, 
  ChevronRight, ArrowLeft, Database, Cloud, ExternalLink, HardDrive, Layers,
  Trash2, Play, Eye, Sparkles, Server, Check, Plus, Image as ImageIcon, RotateCcw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { processDocxFile, renderCustomThumbnailCanvas } from '../../lib/contentEngineProcessor';
import { uploadFilesToR2, R2_PUBLIC_URL } from '../../lib/r2Uploader';

// Default drive folder hierarchy templates matching Google Drive content structure
const ROOT_CATEGORIES = ['CENTRAL EXAMS', 'STATE EXAMS', 'UT EXAMS'];

const DEFAULT_EXAM_GROUPS = [
  '01.SSC', '02.BANKING', '03.TEACHING', '04.RRB', '05.UNIVERSITY GRANTS',
  '06.NURSING', '07.CIVIL SERVICES', '08.ENGINEERING', '09.DEFENCE',
  '10.JUDICIARY EXAMS', '11.INSURANCE EXAMS', '12.OTHER GOVERNMENT',
  '13.INDIA POST', '14.BHABHA ATOMIC', '15.Indian Council of', '16.NATIONAL',
  '17.ACCOUNTS AND', '18.POLICE EXAMS', '19.PSU MAHARATNA', '20.PUBLIC SECTOR', '21.METRO RAIL'
];

const DEFAULT_EXAMS = {
  '01.SSC': [
    '1.SSC CGL (Combined Graduate Level)',
    '2.SSC CHSL (Combined Higher Secondary)',
    '3.SSC MTS (Multi-Tasking Staff)',
    '4.SSC GD Constable',
    '5.SSC JE (Junior Engineer)',
    '6.SSC JHT (Junior Hindi Translator)',
    '7.SSC Stenographer',
    '8.SSC Selection Post',
    '9.SSC CPO',
    '10.SSC Delhi Police'
  ],
  '02.BANKING': [
    '1.IBPS PO', '2.IBPS Clerk', '3.SBI PO', '4.SBI Clerk', '5.RBI Grade B'
  ],
  '07.CIVIL SERVICES': [
    '1.UPSC CSE (Prelims)', '2.UPSC CSE (Mains)', '3.State PCS'
  ]
};

const DEFAULT_MATERIAL_CATEGORIES = [
  { name: '1.INTRO', category: 'Intro', label: 'Introductory Material' },
  { name: '2.GUIDE BOOK', category: 'Guide', label: 'Study Guide & Modules' },
  { name: '3.PRECIS', category: 'Precis', label: 'Precis & Quick Notes' },
  { name: '4.10 YEARS PYQ', category: 'Guide', label: '10 Years Previous Year Questions' },
  { name: '5.TEST SERIES-10', category: 'Guide', label: '10 Mock Test Series' }
];

const THUMBNAIL_THEMES = [
  { id: 'default', name: 'Auto Extracted from Docx', path: '' },
  { id: 'blue', name: 'Royal Blue Theme', path: '/thumbnils/thumbnil royal blue.png' },
  { id: 'green', name: 'Royal Green Theme', path: '/thumbnils/thumbnil royal green.png' },
  { id: 'red', name: 'Royal Red Theme', path: '/thumbnils/thumbnil royal red.png' }
];

export default function AdminDriveIngestion() {
  // Navigation / Folder Tree State (Unprefilled by default)
  const [selectedRoot, setSelectedRoot] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [customGroupInput, setCustomGroupInput] = useState('');
  const [isCustomGroup, setIsCustomGroup] = useState(false);

  const [selectedExam, setSelectedExam] = useState('');
  const [customExamInput, setCustomExamInput] = useState('');
  const [isCustomExam, setIsCustomExam] = useState(false);

  // Dynamic Arbitrary Nested Subfolders State (Level 4, Level 5, Level 6...)
  const [extraSubfolders, setExtraSubfolders] = useState([]);

  const [selectedCategoryObj, setSelectedCategoryObj] = useState(null);
  const [subjectName, setSubjectName] = useState('');

  // Thumbnail Theme & Caption State (Empty caption by default)
  const [selectedTheme, setSelectedTheme] = useState(THUMBNAIL_THEMES[0]);
  const [coverCaption, setCoverCaption] = useState('');
  const previewCanvasRef = useRef(null);

  // File Upload & Processing State
  const [filesQueue, setFilesQueue] = useState([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [processingIndex, setProcessingIndex] = useState(-1);

  // Database Resources & Explorer Navigation State
  const [existingResources, setExistingResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'explorer'
  const [explorerBreadcrumbs, setExplorerBreadcrumbs] = useState([]); // ['CENTRAL EXAMS', ...]

  useEffect(() => {
    fetchExistingResources();
  }, []);

  // Update Canvas Preview whenever Theme or Caption changes
  useEffect(() => {
    if (selectedTheme && selectedTheme.id !== 'default' && previewCanvasRef.current) {
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (coverCaption && coverCaption.trim()) {
          const lines = coverCaption.trim().split('\n');
          const maxLen = Math.max(...lines.map(l => l.length));

          // Proportional font sizing relative to canvas width & max string length
          const baseFactor = canvas.width / 400;
          const fontSize = Math.max(Math.floor(10 * baseFactor), Math.min(Math.floor(18 * baseFactor), Math.floor((220 * baseFactor) / (maxLen || 1))));

          ctx.font = `bold ${fontSize}px "Georgia", "Times New Roman", serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const lineHeight = fontSize * 1.35;
          const totalHeight = lines.length * lineHeight;

          // Position text in open space below VeerNXT logo (60.5% to 72.5% of total height)
          const boxStart = canvas.height * 0.605;
          const boxEnd = canvas.height * 0.725;
          const boxHeight = boxEnd - boxStart;
          let currentY = boxStart + ((boxHeight - totalHeight) / 2) + (lineHeight / 2);

          lines.forEach((line) => {
            const textLine = line.trim().toUpperCase();

            // Dark drop shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillText(textLine, (canvas.width / 2) + (1.5 * baseFactor), currentY + (1.5 * baseFactor));

            // Metallic Gold Gradient
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
      img.src = selectedTheme.path;
    }
  }, [selectedTheme, coverCaption, activeTab]);

  const fetchExistingResources = async () => {
    setLoadingResources(true);
    try {
      const { data, error } = await supabase
        .from('resources_v2')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!error && data) {
        setExistingResources(data);
      }
    } catch (e) {
      console.error('Error fetching resources:', e);
    } finally {
      setLoadingResources(false);
    }
  };

  const currentExamGroup = isCustomGroup ? customGroupInput : selectedGroup;
  const currentExamName = isCustomExam ? customExamInput : selectedExam;

  // Reset / Clear all fields and files queue
  const handleClearAll = () => {
    setSelectedRoot('');
    setSelectedGroup('');
    setCustomGroupInput('');
    setIsCustomGroup(false);
    setSelectedExam('');
    setCustomExamInput('');
    setIsCustomExam(false);
    setExtraSubfolders([]);
    setSelectedCategoryObj(null);
    setSubjectName('');
    setSelectedTheme(THUMBNAIL_THEMES[0]);
    setCoverCaption('');
    setFilesQueue([]);
  };

  // Add a new dynamic nested subfolder layer
  const handleAddSubfolder = () => {
    setExtraSubfolders(prev => [
      ...prev,
      { id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5), name: '' }
    ]);
  };

  const handleUpdateSubfolder = (id, val) => {
    setExtraSubfolders(prev => prev.map(item => item.id === id ? { ...item, name: val } : item));
  };

  const handleRemoveSubfolder = (id) => {
    setExtraSubfolders(prev => prev.filter(item => item.id !== id));
  };

  // Full constructed folder path segments
  const extraFolderPath = extraSubfolders.map(s => s.name.trim()).filter(Boolean);
  const fullDrivePathSegments = [
    selectedRoot,
    currentExamGroup,
    currentExamName,
    ...extraFolderPath,
    selectedCategoryObj?.name
  ].filter(Boolean);
  const fullDrivePathDisplay = fullDrivePathSegments.length > 0 ? fullDrivePathSegments.join(' / ') : 'Select folder levels above...';

  // Handle file selection
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    const docxFiles = selectedFiles.filter(f => f.name.endsWith('.docx') || f.name.endsWith('.doc'));

    if (docxFiles.length === 0) {
      alert('Please select valid Microsoft Word (.docx) files.');
      return;
    }

    const newQueueItems = docxFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      root: selectedRoot,
      group: currentExamGroup,
      exam: currentExamName,
      extraPath: extraFolderPath.join('/'),
      fullPathDisplay: fullDrivePathDisplay,
      category: selectedCategoryObj?.category || 'Guide',
      materialFolder: selectedCategoryObj?.name || '',
      subject: subjectName,
      theme: selectedTheme,
      caption: coverCaption,
      status: 'pending',
      progress: 0,
      logs: ['Ready for ingestion'],
      result: null
    }));

    setFilesQueue(prev => [...prev, ...newQueueItems]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const docxFiles = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.docx') || f.name.endsWith('.doc'));
      if (docxFiles.length === 0) {
        alert('Please drop valid Microsoft Word (.docx) files.');
        return;
      }
      const newQueueItems = docxFiles.map(file => ({
        file,
        id: Math.random().toString(36).substring(7),
        root: selectedRoot,
        group: currentExamGroup,
        exam: currentExamName,
        extraPath: extraFolderPath.join('/'),
        fullPathDisplay: fullDrivePathDisplay,
        category: selectedCategoryObj?.category || 'Guide',
        materialFolder: selectedCategoryObj?.name || '',
        subject: subjectName,
        theme: selectedTheme,
        caption: coverCaption,
        status: 'pending',
        progress: 0,
        logs: ['Ready for ingestion'],
        result: null
      }));
      setFilesQueue(prev => [...prev, ...newQueueItems]);
    }
  };

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

  // Process a single item in queue
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
        conductingBody: item.group || 'General Body',
        drivePath: item.fullPathDisplay || '',
        websiteUrl: '',
        customThumbnailBlob: customThumbnailBlob
      };

      const processResult = await processDocxFile(item.file, options);
      addLog(item.id, `Parsed ${processResult.chapters.length} chapter(s), extracted ${processResult.imageCount} image(s).`);
      updateItemState(item.id, { status: 'uploading', progress: 45 });

      // 2. Upload to Cloudflare R2 under veernxt-resources/structured_resources/
      addLog(item.id, `Uploading ${processResult.r2Files.length} file(s) to Cloudflare R2 (veernxt-resources/${processResult.r2Prefix})...`);

      const r2Urls = await uploadFilesToR2(processResult.r2Files, (completed, total, key) => {
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

      const res = await fetch('/api/admin/save-resource-v2', {
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

      let dbSuccess = false;
      if (res.ok) {
        dbSuccess = true;
      } else {
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
          status: 'Published'
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

  // Run batch queue processing
  const runBatchProcessing = async () => {
    if (isProcessingBatch) return;
    setIsProcessingBatch(true);

    const pendingIndices = filesQueue
      .map((item, idx) => item.status === 'pending' || item.status === 'error' ? idx : null)
      .filter(idx => idx !== null);

    for (const idx of pendingIndices) {
      setProcessingIndex(idx);
      await processQueueItem(filesQueue[idx]);
    }

    setIsProcessingBatch(false);
    setProcessingIndex(-1);
    fetchExistingResources();
  };

  // Filter structured resources for R2 Explorer
  const structuredResources = existingResources.filter(res => {
    const url = res.storage_base_url || '';
    const path = res.drive_path || '';
    return url.includes('structured_resources') || path.length > 0;
  });

  // Calculate dynamic folder nodes at current explorer depth
  const depth = explorerBreadcrumbs.length;
  const currentLevelFolders = new Set();
  const currentLevelResources = [];

  structuredResources.forEach(res => {
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

    // Check if resource matches current breadcrumbs
    let matchesPrefix = true;
    for (let i = 0; i < depth; i++) {
      if (!segments[i] || segments[i].toLowerCase() !== explorerBreadcrumbs[i].toLowerCase()) {
        matchesPrefix = false;
        break;
      }
    }

    if (matchesPrefix) {
      if (segments.length > depth) {
        currentLevelFolders.add(segments[depth]);
      } else {
        currentLevelResources.push(res);
      }
    }
  });

  const folderList = Array.from(currentLevelFolders).sort();

  return (
    <div style={{ padding: '24px', background: '#0a0b10', color: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(139, 184, 92, 0.15), rgba(15, 23, 42, 0.8))',
        border: '1px solid rgba(139, 184, 92, 0.3)',
        borderRadius: '16px',
        padding: '24px 32px',
        marginBottom: '28px',
        backdropFilter: 'blur(10px)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Cloud size={32} color="#8BB85C" />
            <h1 style={{ fontSize: '26px', fontWeight: '700', margin: 0, color: '#ffffff' }}>
              Drive Folder & Cloudflare R2 Ingestion Engine
            </h1>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Upload `.docx` files into Google Drive hierarchy paths under <code style={{ color: '#8BB85C' }}>veernxt-resources/structured_resources</code>. Automatically parses content, converts images to WebP, extracts chapters, uploads to R2, and registers in Supabase.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleClearAll}
            title="Reset all form fields and clear files queue"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(248, 113, 113, 0.4)',
              background: 'rgba(248, 113, 113, 0.1)',
              color: '#f87171',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <RotateCcw size={16} /> Reset All / Clear
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              background: activeTab === 'upload' ? '#8BB85C' : 'rgba(255,255,255,0.1)',
              color: activeTab === 'upload' ? '#0a0b10' : '#ffffff',
              transition: 'all 0.2s ease'
            }}
          >
            <Upload size={18} /> Ingest Content
          </button>
          <button
            onClick={() => { setActiveTab('explorer'); fetchExistingResources(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              background: activeTab === 'explorer' ? '#8BB85C' : 'rgba(255,255,255,0.1)',
              color: activeTab === 'explorer' ? '#0a0b10' : '#ffffff',
              transition: 'all 0.2s ease'
            }}
          >
            <HardDrive size={18} /> R2 Explorer ({structuredResources.length})
          </button>
        </div>
      </div>

      {activeTab === 'upload' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '24px' }}>
          
          {/* LEFT SIDEBAR: DYNAMIC N-LEVEL DRIVE FOLDER BUILDER */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderPlus size={20} color="#8BB85C" />
                <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Nested Folder Builder</h2>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handleClearAll}
                  title="Clear all fields and queue"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(248, 113, 113, 0.4)',
                    background: 'rgba(248, 113, 113, 0.1)',
                    color: '#f87171',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={13} /> Clear
                </button>

                <button
                  onClick={handleAddSubfolder}
                  title="Add extra nested subfolder layer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #8BB85C',
                    background: 'rgba(139, 184, 92, 0.15)',
                    color: '#8BB85C',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={13} /> Add Level
                </button>
              </div>
            </div>

            {/* Level 1: Root Classification */}
            <div>
              <label style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                Level 1: Root Classification
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {ROOT_CATEGORIES.map(root => (
                  <button
                    key={root}
                    onClick={() => setSelectedRoot(root)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '600',
                      border: selectedRoot === root ? '1px solid #8BB85C' : '1px solid rgba(255,255,255,0.1)',
                      background: selectedRoot === root ? 'rgba(139, 184, 92, 0.2)' : 'rgba(255,255,255,0.03)',
                      color: selectedRoot === root ? '#8BB85C' : '#cbd5e1',
                      cursor: 'pointer'
                    }}
                  >
                    {root.replace(' EXAMS', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Level 2: Exam Group Folder */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8' }}>
                  Level 2: Exam Group Folder
                </label>
                <button
                  onClick={() => setIsCustomGroup(!isCustomGroup)}
                  style={{ background: 'none', border: 'none', color: '#8BB85C', fontSize: '11px', cursor: 'pointer' }}
                >
                  {isCustomGroup ? 'Select List' : '+ Custom Group'}
                </button>
              </div>

              {isCustomGroup ? (
                <input
                  type="text"
                  placeholder="e.g. Chandigarh / 6. NURSING"
                  value={customGroupInput}
                  onChange={(e) => setCustomGroupInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#090d16',
                    border: '1px solid #8BB85C',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              ) : (
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#090d16',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Select Exam Group Folder --</option>
                  {DEFAULT_EXAM_GROUPS.map(grp => (
                    <option key={grp} value={grp}>{grp}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Level 3: Specific Exam */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8' }}>
                  Level 3: Specific Exam / Sub-Category
                </label>
                <button
                  onClick={() => setIsCustomExam(!isCustomExam)}
                  style={{ background: 'none', border: 'none', color: '#8BB85C', fontSize: '11px', cursor: 'pointer' }}
                >
                  {isCustomExam ? 'Select List' : '+ Custom Exam'}
                </button>
              </div>

              {isCustomExam ? (
                <input
                  type="text"
                  placeholder="e.g. Administrative / 02. AIMMS CRE"
                  value={customExamInput}
                  onChange={(e) => setCustomExamInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#090d16',
                    border: '1px solid #8BB85C',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              ) : (
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#090d16',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Select Specific Exam --</option>
                  {(DEFAULT_EXAMS[selectedGroup] || (selectedGroup ? ['1.' + selectedGroup] : [])).map(ex => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>
              )}
            </div>

            {/* DYNAMIC EXTRA NESTED SUBFOLDER LAYERS (Level 4, Level 5, Level 6...) */}
            {extraSubfolders.map((subfolder, index) => (
              <div key={subfolder.id} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(139, 184, 92, 0.3)',
                borderRadius: '10px',
                padding: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8BB85C', fontWeight: '600' }}>
                    Level {3 + index + 1}: Custom Nested Subfolder
                  </label>
                  <button
                    onClick={() => handleRemoveSubfolder(subfolder.id)}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder={`Enter Level ${3 + index + 1} folder name...`}
                  value={subfolder.name}
                  onChange={(e) => handleUpdateSubfolder(subfolder.id, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: '#090d16',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#ffffff',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>
            ))}

            {/* BUTTON TO ADD MORE SUBFOLDERS */}
            <button
              onClick={handleAddSubfolder}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '8px',
                border: '1px dashed rgba(139, 184, 92, 0.5)',
                background: 'rgba(139, 184, 92, 0.05)',
                color: '#8BB85C',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Plus size={16} /> + Add Deep Nested Subfolder Layer (Level {4 + extraSubfolders.length})
            </button>

            {/* Level 4 (or N): Content Material Category */}
            <div>
              <label style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                Level {4 + extraSubfolders.length}: Content Material Category
              </label>
              <select
                value={selectedCategoryObj ? selectedCategoryObj.name : ''}
                onChange={(e) => {
                  const match = DEFAULT_MATERIAL_CATEGORIES.find(c => c.name === e.target.value);
                  setSelectedCategoryObj(match || null);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#090d16',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="">-- Select Material Category --</option>
                {DEFAULT_MATERIAL_CATEGORIES.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.name} ({cat.label})</option>
                ))}
              </select>
            </div>

            {/* Subject Name */}
            <div>
              <label style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                Subject / Module Title
              </label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Enter Subject / Module Title (e.g. General Awareness)"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#090d16',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            {/* THUMBNAIL THEME & GOLD CAPTION SELECTION */}
            <div style={{
              background: 'rgba(234, 193, 90, 0.06)',
              border: '1px solid rgba(234, 193, 90, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F3D274', fontWeight: '600', fontSize: '14px' }}>
                <Sparkles size={16} /> Thumbnail Theme & Gold Caption
              </div>

              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Select Thumbnail Theme
                </label>
                <select
                  value={selectedTheme.id}
                  onChange={(e) => {
                    const theme = THUMBNAIL_THEMES.find(t => t.id === e.target.value);
                    if (theme) setSelectedTheme(theme);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#090d16',
                    border: '1px solid rgba(234, 193, 90, 0.4)',
                    color: '#ffffff',
                    fontSize: '12px'
                  }}
                >
                  {THUMBNAIL_THEMES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {selectedTheme.id !== 'default' && (
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    Book Cover Page Caption (Centered Gold Text)
                  </label>
                  <textarea
                    rows={3}
                    value={coverCaption}
                    onChange={(e) => setCoverCaption(e.target.value)}
                    placeholder="Enter cover caption text to render in gold..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: '#090d16',
                      border: '1px solid rgba(234, 193, 90, 0.4)',
                      color: '#F3D274',
                      fontWeight: '600',
                      fontSize: '12px',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}

              {/* LIVE THUMBNAIL PREVIEW */}
              {selectedTheme.id !== 'default' && (
                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>
                    LIVE COVER THUMBNAIL PREVIEW
                  </div>
                  <canvas
                    ref={previewCanvasRef}
                    width={200}
                    height={283}
                    style={{
                      width: '160px',
                      height: '226px',
                      borderRadius: '8px',
                      border: '2px solid rgba(234, 193, 90, 0.6)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Active Selected Path Preview */}
            <div style={{
              background: 'rgba(139, 184, 92, 0.08)',
              border: '1px dashed rgba(139, 184, 92, 0.4)',
              borderRadius: '10px',
              padding: '14px'
            }}>
              <div style={{ fontSize: '11px', color: '#8BB85C', fontWeight: '600', marginBottom: '6px' }}>
                CLOUDFLARE R2 TARGET PATH ({fullDrivePathSegments.length} LAYERS):
              </div>
              <div style={{ fontSize: '12px', color: '#f1f5f9', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                structured_resources / {fullDrivePathDisplay}
              </div>
            </div>

          </div>

          {/* RIGHT MAIN AREA: DROPZONE & QUEUE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '2px dashed rgba(139, 184, 92, 0.4)',
                borderRadius: '16px',
                padding: '40px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <input
                type="file"
                multiple
                accept=".docx,.doc"
                onChange={handleFileSelect}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <Upload size={48} color="#8BB85C" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>
                Drag & Drop Microsoft Word (.docx) Files Here
              </h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
                or click to browse from your computer. Selected Theme: <strong style={{ color: '#F3D274' }}>{selectedTheme.name}</strong><br />
                Target Path: <span style={{ color: '#8BB85C', fontWeight: '600' }}>structured_resources / {fullDrivePathDisplay}</span>
              </p>
            </div>

            {/* Queue Section */}
            {filesQueue.length > 0 && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                      Ingestion Queue ({filesQueue.length} files)
                    </h3>
                    <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
                      Ready to parse, generate WebP assets & Royal gold thumbnails, upload to R2 (structured_resources/), and update Supabase.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setFilesQueue([])}
                      disabled={isProcessingBatch}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1px solid rgba(248, 113, 113, 0.4)',
                        background: 'rgba(248, 113, 113, 0.1)',
                        color: '#f87171',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: isProcessingBatch ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Trash2 size={16} /> Clear Queue
                    </button>

                    <button
                      onClick={runBatchProcessing}
                      disabled={isProcessingBatch}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        borderRadius: '10px',
                        border: 'none',
                        background: isProcessingBatch ? 'rgba(255,255,255,0.2)' : '#8BB85C',
                        color: isProcessingBatch ? '#ffffff' : '#0a0b10',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: isProcessingBatch ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isProcessingBatch ? (
                        <>
                          <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...
                        </>
                      ) : (
                        <>
                          <Play size={18} /> Start Ingestion Engine
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* File List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filesQueue.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        background: '#0d121f',
                        border: processingIndex === idx ? '1px solid #8BB85C' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <FileText size={22} color="#8BB85C" />
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '14px', color: '#ffffff' }}>
                              {item.file.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              {(item.file.size / 1024).toFixed(1)} KB • structured_resources / {item.fullPathDisplay}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {item.status === 'completed' && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4ade80', fontSize: '13px', fontWeight: '600' }}>
                              <CheckCircle size={16} /> Completed & Published
                            </span>
                          )}
                          {item.status === 'error' && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171', fontSize: '13px', fontWeight: '600' }}>
                              <AlertCircle size={16} /> Error
                            </span>
                          )}
                          {item.status === 'pending' && (
                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>Pending</span>
                          )}

                          {!isProcessingBatch && (
                            <button
                              onClick={() => removeQueueItem(item.id)}
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {(item.status === 'parsing' || item.status === 'uploading' || item.status === 'completed') && (
                        <div>
                          <div style={{
                            height: '6px',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            marginBottom: '6px'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${item.progress}%`,
                              background: '#8BB85C',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                      )}

                      {/* Log Console */}
                      {item.logs.length > 0 && (
                        <div style={{
                          background: '#06080e',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          color: '#94a3b8',
                          maxHeight: '60px',
                          overflowY: 'auto'
                        }}>
                          {item.logs.map((log, lIdx) => (
                            <div key={lIdx}>{log}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      ) : (
        /* EXPLORER TAB: INTERACTIVE FOLDER SYSTEM VIEW FOR structured_resources/ */
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                Cloudflare R2 Folder Explorer (<code style={{ color: '#8BB85C' }}>structured_resources/</code>)
              </h2>
              <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
                Interactive Google Drive folder navigation for materials stored under <code style={{ color: '#8BB85C' }}>veernxt-resources/structured_resources/</code>.
              </p>
            </div>

            <button
              onClick={fetchExistingResources}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          {/* FOLDER SYSTEM BREADCRUMBS BAR */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#090d16',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '24px',
            fontSize: '13px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setExplorerBreadcrumbs([])}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                color: explorerBreadcrumbs.length === 0 ? '#8BB85C' : '#94a3b8',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <HardDrive size={16} /> structured_resources
            </button>

            {explorerBreadcrumbs.map((folder, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight size={14} color="#64748b" />
                <button
                  onClick={() => setExplorerBreadcrumbs(explorerBreadcrumbs.slice(0, idx + 1))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: idx === explorerBreadcrumbs.length - 1 ? '#8BB85C' : '#94a3b8',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {folder}
                </button>
              </React.Fragment>
            ))}
          </div>

          {loadingResources ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading R2 folder tree...</div>
          ) : (
            <div>
              {/* SUBFOLDERS LIST */}
              {folderList.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', fontWeight: '600', marginBottom: '12px' }}>
                    Folders ({folderList.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                    {folderList.map(folderName => (
                      <div
                        key={folderName}
                        onClick={() => setExplorerBreadcrumbs([...explorerBreadcrumbs, folderName])}
                        style={{
                          background: '#0d121f',
                          border: '1px solid rgba(139, 184, 92, 0.2)',
                          borderRadius: '10px',
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Folder size={22} color="#8BB85C" />
                        <span style={{ fontWeight: '600', fontSize: '14px', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {folderName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FILES LIST AT CURRENT LEVEL */}
              <div>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', fontWeight: '600', marginBottom: '12px' }}>
                  Files & Documents ({currentLevelResources.length})
                </div>

                {currentLevelResources.length === 0 && folderList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No items in this folder level.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {currentLevelResources.map(res => (
                      <div
                        key={res.id || res.resource_id}
                        style={{
                          background: '#0d121f',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '12px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          justify: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '12px' }}>
                          {res.thumbnail_url ? (
                            <img
                              src={res.thumbnail_url}
                              alt="thumbnail"
                              style={{ width: '60px', height: '85px', borderRadius: '6px', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '60px', height: '85px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FileText size={24} color="#8BB85C" />
                            </div>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '11px', color: '#8BB85C', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                              {res.exam_name} • {res.category}
                            </div>
                            <div style={{ fontWeight: '600', fontSize: '14px', color: '#ffffff', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {res.title}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              {res.chapter_count || 1} chapter(s) • {res.subject || 'General'}
                            </div>
                          </div>
                        </div>

                        <div style={{
                          background: '#06080e',
                          padding: '8px 10px',
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

                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
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
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
