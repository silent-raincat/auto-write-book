import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, Button, Input, Typography, message, Space, Select, Modal, List, Tag, Switch, Collapse, Popover } from 'antd';
import { SaveOutlined, RobotOutlined, ArrowLeftOutlined, HistoryOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '@/styles/quill-dark.css';
import { api } from '@/lib/api';

const { Title } = Typography;
const { TextArea } = Input;

type Chapter = {
  id?: string;
  title: string;
  content?: string;
  status?: 'draft' | 'published' | 'archived';
  chapter_number?: number;
};

type GenerateChapterResponse = {
  content: string;
};

type NovelOutline = {
  outline_text?: string | null;
  outline_structure?: Array<{
    title: string;
    summary?: string;
    chapters: Array<{ title: string; summary?: string; tension?: number }>;
  }> | null;
  genre?: string;
  style?: string;
  title?: string;
};

type ChapterVersion = {
  version_number: number;
  title: string;
  content?: string | null;
  status?: 'draft' | 'published' | 'archived';
  created_at: string;
};

const MODEL_OPTIONS = [
  { label: 'DeepSeek-V3.2', value: 'deepseek-ai/DeepSeek-V3.2' },
  { label: 'DeepSeek-R1', value: 'deepseek-ai/DeepSeek-R1' },
  { label: 'Qwen3-Next-80B-A3B-Instruct', value: 'Qwen/Qwen3-Next-80B-A3B-Instruct' },
  { label: 'DeepSeek-R1-Distill-Qwen-7B', value: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B' },
  { label: 'DeepSeek-R1-0528', value: 'deepseek-ai/DeepSeek-R1-0528' },
] as const;

const ChapterEditor: React.FC = () => {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [chapterNumber, setChapterNumber] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // AI State
  const [prompt, setPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [includeOutline, setIncludeOutline] = useState(true);
  const [includePrevious, setIncludePrevious] = useState(true);
  const [outline, setOutline] = useState<NovelOutline | null>(null);
  const [previousChapterContent, setPreviousChapterContent] = useState<string>('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window === 'undefined') return 'deepseek-ai/DeepSeek-V3.2';
    return window.localStorage.getItem('ai_model_id') || 'deepseek-ai/DeepSeek-V3.2';
  });

  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versions, setVersions] = useState<ChapterVersion[]>([]);
  const [previewVersion, setPreviewVersion] = useState<ChapterVersion | null>(null);

  // AI Rewrite State
  const [selection, setSelection] = useState<{ text: string; index: number; length: number } | null>(null);
  const [rewriteModalOpen, setRewriteModalOpen] = useState(false);
  const [rewritePrompt, setRewritePrompt] = useState('');
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteResult, setRewriteResult] = useState('');
  const [floatingToolbarPosition, setFloatingToolbarPosition] = useState<{ top: number; left: number } | null>(null);

  const quillRef = useRef<ReactQuill>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const lastSavedRef = useRef<{ title: string; content: string; status: 'draft' | 'published' | 'archived' }>({
    title: '',
    content: '',
    status: 'draft',
  });

  useEffect(() => {
    if (chapterId) {
      fetchChapter(chapterId);
    }
  }, [chapterId]);

  useEffect(() => {
    if (!novelId || !chapterId) return;
    const key = `chapter_ai_keywords_${novelId}_${chapterId}`;
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    if (!raw) {
      setKeywords([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        setKeywords([]);
        return;
      }
      const normalized = parsed
        .map((x) => (typeof x === 'string' ? x.trim() : ''))
        .filter((x) => x.length > 0)
        .slice(0, 200);
      setKeywords(Array.from(new Set(normalized)));
    } catch {
      setKeywords([]);
    }
  }, [novelId, chapterId]);

  useEffect(() => {
    if (!novelId || !chapterId) return;
    const key = `chapter_ai_keywords_${novelId}_${chapterId}`;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(keywords));
  }, [keywords, novelId, chapterId]);

  useEffect(() => {
    if (!novelId) return;
    const cacheKey = `novel_outline_${novelId}`;
    const cachedRaw = typeof window !== 'undefined' ? window.localStorage.getItem(cacheKey) : null;
    const cached = cachedRaw
      ? (() => {
          try {
            return JSON.parse(cachedRaw) as Partial<NovelOutline>;
          } catch {
            return null;
          }
        })()
      : null;

    api
      .get<NovelOutline>(`/novels/${novelId}`)
      .then((d) => {
        const merged: NovelOutline = {
          ...(cached ?? {}),
          ...(d ?? {}),
          outline_text: typeof d?.outline_text === 'string' ? d.outline_text : typeof cached?.outline_text === 'string' ? cached.outline_text : null,
          outline_structure: Array.isArray(d?.outline_structure)
            ? d.outline_structure
            : Array.isArray(cached?.outline_structure)
              ? cached.outline_structure
              : null,
        };
        setOutline(merged);
      })
      .catch(() => setOutline((cached as NovelOutline | null) ?? null));
  }, [novelId]);

  const fetchChapter = async (id: string) => {
    try {
      const data = await api.get<Chapter>(`/chapters/${id}`);
      setTitle(data.title);
      setContent(data.content || '');
      setStatus(data.status || 'draft');
      setChapterNumber(typeof data.chapter_number === 'number' ? data.chapter_number : null);
      lastSavedRef.current = { title: data.title, content: data.content || '', status: data.status || 'draft' };
      setDirty(false);
    } catch {
      message.error('获取章节内容失败');
    }
  };

  useEffect(() => {
    const loadPrevious = async () => {
      if (!novelId || !chapterId) return;
      try {
        const list = await api.get<Array<{ id: string; chapter_number: number }>>(`/chapters?novel_id=${novelId}`);
        const current = list.find((c) => c.id === chapterId);
        if (!current || typeof current.chapter_number !== 'number') {
          setPreviousChapterContent('');
          return;
        }

        const structure = Array.isArray(outline?.outline_structure) ? outline!.outline_structure! : [];
        let previousOutline = '';

        let index = 0;
        for (const volume of structure) {
          const chapters = Array.isArray(volume?.chapters) ? volume.chapters : [];
          for (const chapter of chapters) {
            index += 1;
            if (index === current.chapter_number - 1) {
              previousOutline = `上一章大纲：第${index}章 ${chapter.title || ''}\n${chapter.summary || '无摘要'}`;
              break;
            }
          }
          if (previousOutline) break;
        }

        setPreviousChapterContent(previousOutline);
      } catch {
        setPreviousChapterContent('');
      }
    };
    void loadPrevious();
  }, [novelId, chapterId, outline]);

  const handleSave = async () => {
    if (!chapterId) return;
    setSaving(true);
    try {
      await api.put(`/chapters/${chapterId}`, {
        title,
        content,
        status,
      });
      appendLocalVersion(chapterId, { title, content, status });
      message.success('保存成功');
      lastSavedRef.current = { title, content, status };
      setDirty(false);
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const buildOutlineContext = () => {
    if (!outline) return '';
    const parts: string[] = [];

    if (outline.title) parts.push(`小说：《${outline.title}》`);
    if (outline.genre || outline.style) parts.push(`题材/风格：${outline.genre || ''}${outline.style ? ` / ${outline.style}` : ''}`);
    if (outline.outline_text) parts.push(`主线：${outline.outline_text}`);

    const structure = Array.isArray(outline.outline_structure) ? outline.outline_structure : [];

    const currentEntry = getCurrentOutlineEntry();
    if (currentEntry) {
      parts.push(`\n【当前所在卷】`);
      parts.push(`第${currentEntry.volumeIndex + 1}卷：${currentEntry.volumeTitle}`);
      const volume = structure[currentEntry.volumeIndex];
      if (volume?.summary) parts.push(`卷摘要：${volume.summary}`);
    }

    const currentOutline = getCurrentChapterOutline();
    if (currentOutline) {
      parts.push(`\n【本章大纲】`);
      parts.push(currentOutline);
    }

    if (structure.length) {
      const volLines = structure.slice(0, 6).map((v, vi) => {
        const chapterTitles = (Array.isArray(v.chapters) ? v.chapters : []).slice(0, 12).map((c) => c.title).filter(Boolean);
        const chapterText = chapterTitles.length ? `（${chapterTitles.join('、')}）` : '';
        return `卷${vi + 1}：${v.title}${chapterText}`;
      });
      parts.push(`\n【整体结构】`);
      parts.push(volLines.join('\n'));
    }

    return parts.join('\n');
  };

  const getOutlineEntries = () => {
    const structure = Array.isArray(outline?.outline_structure) ? outline!.outline_structure! : [];
    const items: Array<{
      no: number;
      volumeIndex: number;
      volumeTitle: string;
      chapter: { title: string; summary?: string; tension?: number };
    }> = [];
    let index = 0;
    structure.forEach((v, volumeIndex) => {
      const chapters = Array.isArray(v?.chapters) ? v.chapters : [];
      chapters.forEach((c) => {
        index += 1;
        items.push({
          no: index,
          volumeIndex,
          volumeTitle: typeof v?.title === 'string' ? v.title : '',
          chapter: c,
        });
      });
    });
    return items;
  };

  const formatOutlineEntry = (entry: ReturnType<typeof getOutlineEntries>[number] | null) => {
    if (!entry) return '';
    const bits: string[] = [];
    if (entry.volumeTitle) bits.push(`卷：${entry.volumeTitle}`);
    if (entry.chapter?.title) bits.push(`章节：${entry.chapter.title}`);
    if (typeof entry.chapter?.summary === 'string' && entry.chapter.summary.trim()) bits.push(`摘要：${entry.chapter.summary.trim()}`);
    if (typeof entry.chapter?.tension === 'number' && Number.isFinite(entry.chapter.tension)) bits.push(`张力：${entry.chapter.tension}`);
    return bits.join('\n');
  };

  const getCurrentOutlineEntry = () => {
    const no = typeof chapterNumber === 'number' ? chapterNumber : null;
    if (!no || !outline) return null;
    return getOutlineEntries().find((x) => x.no === no) ?? null;
  };

  const getCurrentChapterOutline = () => {
    return formatOutlineEntry(getCurrentOutlineEntry());
  };

  const getCurrentVolumeText = () => {
    const entry = getCurrentOutlineEntry();
    if (!entry) return '';
    const volumeNo = entry.volumeIndex + 1;
    const volumeTitle = entry.volumeTitle ? `：${entry.volumeTitle}` : '';
    return `第${volumeNo}卷${volumeTitle}`;
  };

  const getPrevChapterOutline = () => {
    const no = typeof chapterNumber === 'number' ? chapterNumber : null;
    if (!no) return '';
    const prev = getOutlineEntries().find((x) => x.no === no - 1) ?? null;
    return formatOutlineEntry(prev);
  };

  const getNextChapterOutline = () => {
    const no = typeof chapterNumber === 'number' ? chapterNumber : null;
    if (!no) return '';
    const next = getOutlineEntries().find((x) => x.no === no + 1) ?? null;
    return formatOutlineEntry(next);
  };

  const loadLocalVersions = (id: string): ChapterVersion[] => {
    const key = `chapter_versions_${id}`;
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((v): v is ChapterVersion => {
          if (!v || typeof v !== 'object') return false;
          const obj = v as Record<string, unknown>;
          return (
            typeof obj.version_number === 'number' &&
            typeof obj.title === 'string' &&
            typeof obj.created_at === 'string'
          );
        })
        .slice(0, 200);
    } catch {
      return [];
    }
  };

  const saveLocalVersions = (id: string, list: ChapterVersion[]) => {
    const key = `chapter_versions_${id}`;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(list));
  };

  const appendLocalVersion = (id: string, v: { title: string; content: string; status: 'draft' | 'published' | 'archived' }) => {
    const list = loadLocalVersions(id);
    const last = list[0];
    if (last && last.title === v.title && (last.content ?? '') === v.content && (last.status ?? 'draft') === v.status) return;
    const max = list.reduce((acc, x) => (typeof x.version_number === 'number' ? Math.max(acc, x.version_number) : acc), 0);
    const next: ChapterVersion = {
      version_number: max + 1,
      title: v.title,
      content: v.content,
      status: v.status,
      created_at: new Date().toISOString(),
    };
    const nextList = [next, ...list].slice(0, 200);
    saveLocalVersions(id, nextList);
  };

  const addKeywordsFromInput = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const parts = text
      .split(/[,，;；\n]+/g)
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
    if (!parts.length) return;
    setKeywords((prev) => {
      const set = new Set(prev);
      parts.forEach((p) => set.add(p));
      return Array.from(set).slice(0, 200);
    });
    setKeywordInput('');
  };

  const removeKeyword = (k: string) => {
    setKeywords((prev) => prev.filter((x) => x !== k));
  };

  const getDefaultPrompt = (mode: 'prompt' | 'continue') => {
    const no = typeof chapterNumber === 'number' ? chapterNumber : null;
    if (mode === 'continue') {
      const base = '请在不重复已有内容的前提下，续写本章后续内容，保持叙事一致与人物口吻统一。';
      return no ? `${base}\n\n本章编号：第${no}章\n本章标题：${title || '（未命名）'}` : base;
    }

    const base = `请生成【第${no || '?'}章】的完整正文内容。

重要提示：
- 你要生成的是当前章节（第${no || '?'}章）的完整内容
- 不要生成下一章或后续章节的内容
- 内容应该从本章的开头开始写起
- 情节推进清晰、细节具体、具备画面感`;

    if (no) {
      const chapOutline = getCurrentChapterOutline();
      return chapOutline
        ? `${base}\n\n本章编号：第${no}章\n本章标题：${title || '（未命名）'}\n\n【本章大纲】\n${chapOutline}`
        : `${base}\n\n本章编号：第${no}章\n本章标题：${title || '（未命名）'}`;
    }
    return base;
  };

  const handleGenerate = async (mode: 'prompt' | 'continue') => {
    const trimmed = prompt.trim();
    const basePrompt = trimmed ? trimmed : includeOutline ? getDefaultPrompt(mode) : '';
    if (!basePrompt) return;
    setAiLoading(true);
    try {
      const ctxOutline = includeOutline ? buildOutlineContext() : '';
      const finalPrompt = ctxOutline ? `${basePrompt}\n\n【大纲与设定参考】\n${ctxOutline}` : basePrompt;

      const data = await api.post<GenerateChapterResponse>('/ai/generate-chapter', {
        novelId,
        prompt: finalPrompt,
        keywords,
        currentContent: content,
        previousChapterContent: includePrevious ? previousChapterContent : '',
        enable_thinking: true,
        stream: false,
        model_id: selectedModel,
      });
      setAiResult(data.content || '');
    } catch {
      message.error('生成失败');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiContent = () => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection();
      const index = range ? range.index : quill.getLength();
      quill.insertText(index, aiResult);
      setAiResult('');
    }
  };

  useEffect(() => {
    const last = lastSavedRef.current;
    const nextDirty = title !== last.title || content !== last.content || status !== last.status;
    setDirty(nextDirty);

    if (!chapterId) return;
    if (!nextDirty) return;
    if (saving) return;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      setSaving(true);
      void api
        .put(`/chapters/${chapterId}`, { title, content, status, skip_version: true })
        .then(() => {
          lastSavedRef.current = { title, content, status };
          setDirty(false);
        })
        .catch(() => {
          message.error('自动保存失败');
        })
        .finally(() => {
          setSaving(false);
        });
    }, 1500);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [title, content, status, chapterId, saving]);

  const openVersions = async () => {
    if (!chapterId) return;
    setVersionsOpen(true);
    setVersionsLoading(true);
    try {
      const data = await api.get<ChapterVersion[]>(`/chapters/${chapterId}/versions`);
      const serverList = Array.isArray(data) ? data : [];
      const localList = loadLocalVersions(chapterId);
      let list = serverList.length ? serverList : localList;
      if (!list.length) {
        appendLocalVersion(chapterId, { title, content, status });
        list = loadLocalVersions(chapterId);
      }
      setVersions(list);
      setPreviewVersion(list[0] ?? null);
      if (!serverList.length && localList.length) {
        message.warning('版本表未初始化，已使用本地版本');
      }
    } catch (e: unknown) {
      const localList = loadLocalVersions(chapterId);
      if (localList.length) {
        setVersions(localList);
        setPreviewVersion(localList[0] ?? null);
        message.warning('获取版本失败，已使用本地版本');
      } else {
        const msg = e instanceof Error ? e.message : '获取版本失败';
        message.error(msg);
      }
    } finally {
      setVersionsLoading(false);
    }
  };

  const restoreVersion = async (v: ChapterVersion) => {
    if (!chapterId) return;
    try {
      await api.post(`/chapters/${chapterId}/restore`, { version_number: v.version_number });
      message.success('已恢复到该版本');
      await fetchChapter(chapterId);
      setPreviewVersion(null);
      openVersions();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '恢复失败';
      if (msg.includes("Could not find the table 'public.chapter_versions'")) {
        try {
          await api.put(`/chapters/${chapterId}`, {
            title: v.title,
            content: v.content ?? '',
            status: v.status ?? 'draft',
            skip_version: true,
          });
          appendLocalVersion(chapterId, { title: v.title, content: v.content ?? '', status: (v.status ?? 'draft') as 'draft' | 'published' | 'archived' });
          message.success('已恢复到该版本（本地版本模式）');
          await fetchChapter(chapterId);
          setPreviewVersion(null);
          openVersions();
          return;
        } catch (err: unknown) {
          const m = err instanceof Error ? err.message : '恢复失败';
          message.error(m);
          return;
        }
      }
      message.error(msg);
    }
  };

  // Selection Change Handler for AI Rewrite
  useEffect(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const handleSelectionChange = (range: any) => {
      if (!range || range.length === 0) {
        setFloatingToolbarPosition(null);
        return;
      }

      // Only show toolbar when text is actually selected (not just cursor)
      if (range.length > 10) { // Minimum 10 characters to show toolbar
        const selectedText = quill.getText(range.index, range.length);
        if (selectedText.trim()) {
          const bounds = quill.getBounds(range.index, range.length);

          // Get the editor container position
          const editorContainer = quill.root.parentElement;
          if (editorContainer) {
            const containerRect = editorContainer.getBoundingClientRect();
            setFloatingToolbarPosition({
              top: bounds.top + bounds.height + 8,
              left: bounds.left + bounds.width / 2 - 60,
            });
            setSelection({
              text: selectedText,
              index: range.index,
              length: range.length,
            });
          }
        }
      } else {
        setFloatingToolbarPosition(null);
      }
    };

    quill.on('selection-change', handleSelectionChange);

    return () => {
      quill.off('selection-change', handleSelectionChange);
    };
  }, []);

  const openRewriteModal = useCallback(() => {
    setFloatingToolbarPosition(null);
    setRewriteModalOpen(true);
    setRewritePrompt('');
    setRewriteResult('');
  }, []);

  const getContextForRewrite = useCallback(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill || !selection) return '';

    let context = '';

    // Add outline context if available
    if (outline?.outline_text) {
      context += `【故事线】\n${outline.outline_text}\n\n`;
    }

    const currentChapterOutline = getCurrentChapterOutline();
    if (currentChapterOutline) {
      context += `【本章大纲】\n${currentChapterOutline}\n\n`;
    }

    // Get surrounding context
    const { index, length } = selection;
    const contextLength = 200; // characters

    // Get text before selection
    const beforeStart = Math.max(0, index - contextLength);
    const beforeText = quill.getText(beforeStart, index - beforeStart).trim();

    // Get text after selection
    const afterEnd = Math.min(quill.getLength(), index + length + contextLength);
    const afterText = quill.getText(index + length, afterEnd - (index + length)).trim();

    if (beforeText) {
      context += `【前文】\n${beforeText}\n\n`;
    }

    if (afterText) {
      context += `【后文】\n${afterText}\n\n`;
    }

    return context;
  }, [selection, outline, getCurrentChapterOutline]);

  const handleRewrite = async () => {
    if (!selection) return;

    setRewriteLoading(true);
    try {
      const context = getContextForRewrite();
      const basePrompt = rewritePrompt.trim() || '请重写为更流畅自然的表达。';

      const finalPrompt = `你是一个文本重写助手。请按照要求重写下面的【选中段落】，只返回重写后的段落内容，不要生成任何其他内容。

${context}

【选中段落】
${selection.text}

【重写要求】
${basePrompt}

重要提示：
1. 只输出重写后的【选中段落】内容
2. 不要包含前后文
3. 不要解释，不要添加注释
4. 保持与原文相近的长度
5. 保持与上下文的连贯性

请直接输出重写后的内容：`;

      const data = await api.post<GenerateChapterResponse>('/ai/generate-chapter', {
        novelId,
        prompt: finalPrompt,
        keywords: [],
        currentContent: selection.text,
        previousChapterContent: '',
        enable_thinking: false,
        stream: false,
        model_id: selectedModel,
      });

      setRewriteResult(data.content || '');
    } catch {
      message.error('重写失败');
    } finally {
      setRewriteLoading(false);
    }
  };

  const handleReplaceSelection = () => {
    if (!selection || !rewriteResult) return;

    const quill = (quillRef.current as any)?.getEditor();
    if (quill) {
      quill.deleteText(selection.index, selection.length);
      quill.insertText(selection.index, rewriteResult);
      setContent(quill.root?.innerHTML || '');
      setRewriteModalOpen(false);
      setSelection(null);
      setRewriteResult('');
      message.success('已替换内容');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-[rgba(18,18,31,0.8)] backdrop-blur-xl border-b border-[rgba(167,139,250,0.15)] p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/novel/${novelId}`)} className="text-white hover:text-[var(--accent-aurora)] border-transparent hover:border-[rgba(167,139,250,0.3)]" />
          {typeof chapterNumber === 'number' ? (
            <span className="text-[rgba(255,255,255,0.5)] text-sm">{`第${chapterNumber}章`}</span>
          ) : null}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold text-white bg-transparent border-transparent hover:border-[rgba(167,139,250,0.3)] w-96 editor-title-input"
          />
        </div>
        <Space>
           <Select
             value={status}
             onChange={(v) => setStatus(v)}
             options={[
               { label: '草稿', value: 'draft' },
               { label: '已发布', value: 'published' },
               { label: '归档', value: 'archived' },
             ]}
             style={{ width: 110 }}
             className="editor-status-select"
           />
           <Button icon={<HistoryOutlined />} onClick={openVersions} disabled={!chapterId} className="text-white hover:text-[var(--accent-aurora)] border-transparent hover:border-[rgba(167,139,250,0.3)]">
             版本
           </Button>
           <span className="text-[rgba(255,255,255,0.5)] text-sm">
             {saving ? '保存中...' : dirty ? '未保存' : '已保存'}
           </span>
           <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
             保存
           </Button>
        </Space>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 p-6 overflow-auto bg-[rgba(10,10,18,0.5)]">
          <div className="max-w-4xl mx-auto">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={content}
              onChange={setContent}
              className="editor-quill h-full"
              modules={{
                toolbar: [
                  [{ 'header': [1, 2, false] }],
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                  ['clean']
                ]
              }}
              style={{ minHeight: '700px' }}
            />
          </div>

          {/* Floating Toolbar for Selected Text */}
          {floatingToolbarPosition && (
            <div
              className="fixed z-50 bg-[var(--cosmic-void)] border border-[var(--accent-aurora)] rounded-lg shadow-lg flex items-center gap-2 px-2 py-1 animate-fade-in"
              style={{
                top: floatingToolbarPosition.top,
                left: floatingToolbarPosition.left,
              }}
            >
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={openRewriteModal}
                className="text-[var(--accent-aurora)] hover:text-[var(--accent-plasma)]"
              >
                AI 重写
              </Button>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => setFloatingToolbarPosition(null)}
                className="text-[rgba(255,255,255,0.5)] hover:text-white"
              />
            </div>
          )}
        </div>

        {/* AI Assistant Sidebar */}
        <div className="w-96 border-l border-[rgba(167,139,250,0.15)] bg-[rgba(18,18,31,0.6)] backdrop-blur-xl flex flex-col">
          <div className="p-4 border-b border-[rgba(167,139,250,0.15)]">
            <Title level={4} className="text-white m-0"><RobotOutlined className="mr-2 text-[var(--accent-aurora)]" /> AI 助手</Title>
          </div>

          <div className="flex-1 p-4 overflow-auto space-y-4">
             {/* Outline Preview */}
             <Card size="small" title={<span className="text-white">大纲预览</span>} className="glass-card">
               <Collapse
                 size="small"
                 className="editor-collapse"
                 items={[
                   {
                     key: 'outline_text',
                     label: <span className="text-[rgba(255,255,255,0.8)]">整体故事线</span>,
                     children: (
                       <div className="whitespace-pre-wrap text-sm text-[rgba(255,255,255,0.7)]">
                         {outline?.outline_text?.trim() ? outline.outline_text.trim() : '（未设置）'}
                       </div>
                     ),
                   },
                   {
                     key: 'volume',
                     label: <span className="text-[rgba(255,255,255,0.8)]">当前卷</span>,
                     children: (
                       <div className="whitespace-pre-wrap text-sm text-[rgba(255,255,255,0.7)]">
                         {getCurrentVolumeText() || '（未能从大纲结构中定位到当前卷）'}
                       </div>
                     ),
                   },
                   {
                     key: 'prev',
                     label: <span className="text-[rgba(255,255,255,0.8)]">上一章大纲</span>,
                     children: (
                       <div className="whitespace-pre-wrap text-sm text-[rgba(255,255,255,0.7)]">
                         {getPrevChapterOutline() || '（无）'}
                       </div>
                     ),
                   },
                   {
                     key: 'current',
                     label: <span className="text-[rgba(255,255,255,0.8)]">本章大纲</span>,
                     children: (
                       <div className="whitespace-pre-wrap text-sm text-[rgba(255,255,255,0.7)]">
                         {getCurrentChapterOutline() || '（未能从大纲结构中定位到本章）'}
                       </div>
                     ),
                   },
                   {
                     key: 'next',
                     label: <span className="text-[rgba(255,255,255,0.8)]">下一章大纲</span>,
                     children: (
                       <div className="whitespace-pre-wrap text-sm text-[rgba(255,255,255,0.7)]">
                         {getNextChapterOutline() || '（无）'}
                       </div>
                     ),
                   },
                   {
                     key: 'structure',
                     label: <span className="text-[rgba(255,255,255,0.8)]">分卷分章（概览）</span>,
                     children: (
                       <div className="text-sm text-[rgba(255,255,255,0.7)] space-y-2">
                         {Array.isArray(outline?.outline_structure) && outline!.outline_structure!.length ? (
                           outline!.outline_structure!.slice(0, 10).map((v, vi) => (
                             <div key={`${vi}-${v.title}`}>
                               <div className="font-medium text-white">{`卷${vi + 1}：${v.title}`}</div>
                               <div className="text-xs text-[rgba(255,255,255,0.5)]">
                                 {(Array.isArray(v.chapters) ? v.chapters : []).slice(0, 20).map((c) => c.title).filter(Boolean).join('、') || '（未设置章节）'}
                               </div>
                             </div>
                           ))
                         ) : (
                           <div className="text-[rgba(255,255,255,0.5)]">（未设置）</div>
                         )}
                       </div>
                     ),
                   },
                 ]}
               />
             </Card>

             {/* Content Generation */}
             <Card title={<span className="text-white">内容生成</span>} size="small" className="glass-card">
               <TextArea
                 rows={4}
                 placeholder="附加要求（可选）。留空则默认按大纲生成本章。"
                 value={prompt}
                 onChange={(e) => setPrompt(e.target.value)}
                 className="editor-textarea"
               />
               <div className="mt-3 space-y-2">
                 <div className="text-sm text-[rgba(255,255,255,0.6)]">关键词/灵感（回车加入）</div>
                 <Input
                   placeholder="例如：雨夜、旧案、反转、暗号"
                   value={keywordInput}
                   onChange={(e) => setKeywordInput(e.target.value)}
                   onPressEnter={() => addKeywordsFromInput(keywordInput)}
                   className="editor-input"
                 />
                 {keywords.length ? (
                   <div className="flex flex-wrap gap-2">
                     {keywords.map((k) => (
                       <Tag
                         key={k}
                         closable
                         onClose={(e) => {
                           e.preventDefault();
                           removeKeyword(k);
                         }}
                         className="bg-[rgba(167,139,250,0.15)] text-[var(--accent-aurora)] border-[rgba(167,139,250,0.3)]"
                       >
                         {k}
                       </Tag>
                     ))}
                   </div>
                 ) : null}
               </div>
               <div className="mt-3 flex gap-3 text-sm text-[rgba(255,255,255,0.6)]">
                 <span>引用大纲</span>
                 <Switch checked={includeOutline} onChange={setIncludeOutline} />
                 <span className="ml-2">引用上一章</span>
                 <Switch checked={includePrevious} onChange={setIncludePrevious} />
               </div>
               <div className="mt-3 space-y-2">
                 <div className="text-sm text-[rgba(255,255,255,0.6)]">模型选择</div>
                 <Select
                   value={selectedModel}
                   options={[...MODEL_OPTIONS]}
                   onChange={(value) => {
                     setSelectedModel(value);
                     if (typeof window !== 'undefined') {
                       window.localStorage.setItem('ai_model_id', value);
                     }
                   }}
                   style={{ width: '100%' }}
                   className="editor-select"
                 />
               </div>
               <Button
                 type="primary"
                 block
                 className="mt-4"
                 onClick={() => handleGenerate('prompt')}
                 loading={aiLoading}
                 disabled={!prompt.trim() && !includeOutline}
               >
                 开始生成
               </Button>
               <Button
                 block
                 className="mt-2"
                 onClick={() => handleGenerate('continue')}
                 loading={aiLoading}
               >
                 AI 续写本章
               </Button>
             </Card>

             {/* AI Result */}
             {aiResult && (
               <Card title={<span className="text-white">生成结果</span>} size="small" className="glass-card border-[var(--accent-comet)] bg-[rgba(56,189,248,0.08)]">
                 <div className="whitespace-pre-wrap mb-4 text-sm text-[rgba(255,255,255,0.9)] max-h-96 overflow-auto">
                   {aiResult}
                 </div>
                 <div className="flex gap-2">
                   <Button size="small" onClick={() => setAiResult('')}>丢弃</Button>
                   <Button type="primary" size="small" onClick={handleApplyAiContent}>插入正文</Button>
                 </div>
               </Card>
             )}
          </div>
        </div>
      </div>

      {/* AI Rewrite Modal */}
      <Modal
        title={
          <span className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            <EditOutlined className="mr-2 text-[var(--accent-aurora)]" />
            AI 重写选中内容
          </span>
        }
        open={rewriteModalOpen}
        onCancel={() => {
          setRewriteModalOpen(false);
          setRewriteResult('');
          setRewritePrompt('');
        }}
        footer={null}
        width={800}
      >
        <div className="space-y-4">
          {/* Original Selected Text */}
          <div>
            <div className="text-sm text-[rgba(255,255,255,0.6)] mb-2">原文内容</div>
            <div className="bg-[rgba(0,0,0,0.2)] rounded-lg p-3 max-h-32 overflow-auto">
              <div className="text-sm text-[rgba(255,255,255,0.8)] whitespace-pre-wrap">
                {selection?.text || ''}
              </div>
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <div className="text-sm text-[rgba(255,255,255,0.6)] mb-2">重写要求（可选）</div>
            <TextArea
              rows={3}
              placeholder="例如：让对话更生动、增加环境描写、改变语调等。留空则默认重写为更流畅自然的表达。"
              value={rewritePrompt}
              onChange={(e) => setRewritePrompt(e.target.value)}
              className="editor-textarea"
            />
          </div>

          {/* Context Preview */}
          <Collapse
            size="small"
            className="editor-collapse"
            items={[
              {
                key: 'context',
                label: <span className="text-[rgba(255,255,255,0.8)]">参考上下文</span>,
                children: (
                  <div className="max-h-48 overflow-auto text-xs text-[rgba(255,255,255,0.7)] whitespace-pre-wrap">
                    {getContextForRewrite() || '无上下文信息'}
                  </div>
                ),
              },
            ]}
          />

          {/* Generate Button */}
          {!rewriteResult ? (
            <Button
              type="primary"
              block
              size="large"
              onClick={handleRewrite}
              loading={rewriteLoading}
              className="h-12"
            >
              {rewriteLoading ? '生成中...' : '开始重写'}
            </Button>
          ) : (
            <>
              {/* Result Preview */}
              <div>
                <div className="text-sm text-[rgba(255,255,255,0.6)] mb-2">重写结果</div>
                <div className="bg-[rgba(56,189,248,0.08)] border border-[var(--accent-comet)] rounded-lg p-3 max-h-48 overflow-auto">
                  <div className="text-sm text-[rgba(255,255,255,0.9)] whitespace-pre-wrap">
                    {rewriteResult}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  block
                  onClick={() => {
                    setRewriteResult('');
                    setRewritePrompt('');
                  }}
                  disabled={rewriteLoading}
                >
                  重新生成
                </Button>
                <Button
                  block
                  onClick={() => {
                    setRewriteModalOpen(false);
                    setRewriteResult('');
                    setRewritePrompt('');
                  }}
                  disabled={rewriteLoading}
                >
                  取消
                </Button>
                <Button
                  type="primary"
                  block
                  onClick={handleReplaceSelection}
                  disabled={rewriteLoading}
                >
                  替换原文
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Version Modal */}
      <Modal
        title={<span className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>章节版本</span>}
        open={versionsOpen}
        onCancel={() => {
          setVersionsOpen(false);
          setPreviewVersion(null);
        }}
        footer={null}
        width={860}
      >
        <div className="flex gap-4">
          <div className="w-96">
            <List
              loading={versionsLoading}
              dataSource={versions}
              renderItem={(v) => (
                <List.Item
                  className="version-list-item hover:bg-[rgba(167,139,250,0.1)] rounded-lg cursor-pointer"
                  onClick={() => setPreviewVersion(v)}
                  actions={[
                    <Button key="preview" size="small" onClick={(e) => { e.stopPropagation(); setPreviewVersion(v); }}>
                      预览
                    </Button>,
                    <Button
                      key="restore"
                      size="small"
                      type="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        Modal.confirm({
                          title: '确认恢复该版本？',
                          content: `将把当前章节恢复到版本 ${v.version_number}，并记录为新版本。`,
                          onOk: async () => restoreVersion(v),
                        });
                      }}
                    >
                      恢复
                    </Button>,
                  ]}
                >
                  <div className="w-full">
                    <div className="flex items-center gap-2">
                      <Tag className="bg-[rgba(167,139,250,0.15)] text-[var(--accent-aurora)] border-[rgba(167,139,250,0.3)]">v{v.version_number}</Tag>
                      <Tag color={v.status === 'published' ? 'green' : v.status === 'archived' ? 'default' : 'orange'}>
                        {v.status === 'published' ? '已发布' : v.status === 'archived' ? '归档' : '草稿'}
                      </Tag>
                      <span className="text-xs text-[rgba(255,255,255,0.5)]">{new Date(v.created_at).toLocaleString()}</span>
                    </div>
                    <div className="mt-1 line-clamp-1 text-[rgba(255,255,255,0.8)]">{v.title}</div>
                  </div>
                </List.Item>
              )}
            />
          </div>
          <div className="flex-1">
            {previewVersion ? (
              <div className="space-y-2">
                <div className="text-sm text-[rgba(255,255,255,0.6)]">v{previewVersion.version_number} · {previewVersion.title}</div>
                <Input.TextArea rows={18} value={previewVersion.content || ''} readOnly className="version-preview-textarea" />
              </div>
            ) : (
              <div className="text-sm text-[rgba(255,255,255,0.5)]">选择一个版本进行预览</div>
            )}
          </div>
        </div>
      </Modal>

      <style>{`
        /* Editor Title Input */
        .editor-title-input input {
          background: transparent !important;
          border-color: transparent !important;
          color: #ffffff !important;
          font-size: 18px;
          font-weight: 600;
        }
        .editor-title-input input:hover {
          border-color: rgba(167, 139, 250, 0.3) !important;
        }
        .editor-title-input input:focus {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: var(--accent-aurora) !important;
          box-shadow: 0 0 20px rgba(167, 139, 250, 0.1) !important;
        }

        /* Editor Status Select */
        .editor-status-select .ant-select-selector {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(167, 139, 250, 0.15) !important;
          color: #ffffff !important;
        }
        .editor-status-select .ant-select-arrow {
          color: rgba(255, 255, 255, 0.6) !important;
        }

        /* Editor Collapse */
        .editor-collapse {
          background: transparent !important;
          border: none !important;
        }
        .editor-collapse .ant-collapse-item {
          border-bottom: 1px solid rgba(167, 139, 250, 0.15) !important;
        }
        .editor-collapse .ant-collapse-header {
          background: transparent !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }
        .editor-collapse .ant-collapse-content {
          background: transparent !important;
          border-top: 1px solid rgba(167, 139, 250, 0.1) !important;
        }
        .editor-collapse .ant-collapse-content-box {
          padding: 12px 0 !important;
        }

        /* Editor Textarea */
        .editor-textarea textarea {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(167, 139, 250, 0.15) !important;
          color: rgba(255, 255, 255, 0.9) !important;
        }
        .editor-textarea textarea:hover {
          border-color: rgba(167, 139, 250, 0.3) !important;
        }
        .editor-textarea textarea:focus {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: var(--accent-aurora) !important;
          box-shadow: 0 0 20px rgba(167, 139, 250, 0.1) !important;
        }
        .editor-textarea textarea::placeholder {
          color: rgba(255, 255, 255, 0.3) !important;
        }

        /* Editor Input */
        .editor-input input {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(167, 139, 250, 0.15) !important;
          color: rgba(255, 255, 255, 0.9) !important;
        }
        .editor-input input:hover {
          border-color: rgba(167, 139, 250, 0.3) !important;
        }
        .editor-input input:focus {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: var(--accent-aurora) !important;
          box-shadow: 0 0 20px rgba(167, 139, 250, 0.1) !important;
        }
        .editor-input input::placeholder {
          color: rgba(255, 255, 255, 0.3) !important;
        }

        /* Editor Select */
        .editor-select .ant-select-selector {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(167, 139, 250, 0.15) !important;
          color: rgba(255, 255, 255, 0.9) !important;
        }
        .editor-select .ant-select-arrow {
          color: rgba(255, 255, 255, 0.6) !important;
        }
        .editor-select:hover .ant-select-selector {
          border-color: rgba(167, 139, 250, 0.3) !important;
        }
        .editor-select.ant-select-focused .ant-select-selector {
          border-color: var(--accent-aurora) !important;
          box-shadow: 0 0 20px rgba(167, 139, 250, 0.1) !important;
        }

        /* Version Preview Textarea */
        .version-preview-textarea textarea {
          background: rgba(255, 255, 255, 0.03) !important;
          border-color: rgba(167, 139, 250, 0.15) !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }

        /* Version List Item */
        .version-list-item {
          background: transparent !important;
          border-bottom: 1px solid rgba(167, 139, 250, 0.15) !important;
          transition: all 0.3s ease !important;
        }
        .version-list-item:hover {
          background: rgba(167, 139, 250, 0.1) !important;
        }

        /* Editor Quill overrides */
        .editor-quill .ql-toolbar {
          background: rgba(26, 26, 46, 0.8) !important;
          border: 1px solid rgba(167, 139, 250, 0.2) !important;
          border-radius: 12px 12px 0 0 !important;
        }
        .editor-quill .ql-container {
          background: rgba(18, 18, 31, 0.6) !important;
          border: 1px solid rgba(167, 139, 250, 0.2) !important;
          border-top: none !important;
          border-radius: 0 0 12px 12px !important;
          color: rgba(255, 255, 255, 0.9) !important;
        }
        .editor-quill .ql-editor {
          color: rgba(255, 255, 255, 0.9) !important;
          min-height: 600px;
        }
        .editor-quill .ql-editor.ql-blank::before {
          color: rgba(255, 255, 255, 0.3) !important;
        }
        .editor-quill .ql-toolbar button {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        .editor-quill .ql-toolbar button:hover {
          color: #ffffff !important;
          background: rgba(167, 139, 250, 0.2) !important;
        }
        .editor-quill .ql-toolbar button.ql-active {
          color: var(--accent-aurora) !important;
          background: rgba(167, 139, 250, 0.15) !important;
        }
      `}</style>
    </div>
  );
};

export default ChapterEditor;
