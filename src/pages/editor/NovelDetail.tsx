import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button, Typography, List, message, Tag, Space, Breadcrumb, Modal, Form, Input, Select, Tabs, Collapse, InputNumber, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, SwapOutlined, HistoryOutlined, BulbOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import ReactECharts from 'echarts-for-react';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

type OutlineChapter = {
  title: string;
  summary?: string;
  tension?: number;
};

type OutlineVolume = {
  title: string;
  summary?: string;
  chapters: OutlineChapter[];
};

interface Novel {
  id: string;
  title: string;
  description: string;
  genre: string;
  style: string;
  outline_text?: string | null;
  outline_structure?: OutlineVolume[] | null;
  rhythm_curve?: number[] | null;
}

interface Chapter {
  id: string;
  title: string;
  chapter_number: number;
  status: 'draft' | 'published' | 'archived';
  updated_at: string;
}

type ChapterVersion = {
  id: string;
  chapter_id: string;
  version_number: number;
  title: string;
  content: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
};

const NovelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [chapterEditOpen, setChapterEditOpen] = useState(false);
  const [chapterEditForm] = Form.useForm();
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [outlineForm] = Form.useForm();
  const [outlineSaving, setOutlineSaving] = useState(false);
  const [outlineGenOpen, setOutlineGenOpen] = useState(false);
  const [outlineGenForm] = Form.useForm();
  const [outlineGenerating, setOutlineGenerating] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderSaving, setReorderSaving] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versions, setVersions] = useState<ChapterVersion[]>([]);
  const [versionChapter, setVersionChapter] = useState<Chapter | null>(null);
  const [previewVersion, setPreviewVersion] = useState<ChapterVersion | null>(null);

  const fetchNovel = useCallback(async (novelId: string) => {
    const cacheKey = `novel_outline_${novelId}`;
    const cachedRaw = typeof window !== 'undefined' ? window.localStorage.getItem(cacheKey) : null;
    const cached = cachedRaw ? (JSON.parse(cachedRaw) as Partial<Novel>) : null;

    try {
      const data = await api.get<Novel>(`/novels/${novelId}`);
      setNovel(data);

      // 优先使用本地缓存，如果本地缓存存在且更完整，则使用本地数据
      // 只有当本地缓存完全没有时，才使用服务器数据作为初始值
      const hasLocalCache = cached && (
        (cached.outline_text && cached.outline_text.length > 0) ||
        (cached.outline_structure && cached.outline_structure.length > 0)
      );

      const outlineText =
        hasLocalCache && cached?.outline_text
          ? cached.outline_text
          : typeof data.outline_text === 'string' ? data.outline_text : '';
      const outlineStructure =
        hasLocalCache && cached?.outline_structure && cached.outline_structure.length > 0
          ? cached.outline_structure
          : Array.isArray(data.outline_structure) ? data.outline_structure : [];
      const rhythmCurve =
        hasLocalCache && cached?.rhythm_curve && cached.rhythm_curve.length > 0
          ? cached.rhythm_curve
          : Array.isArray(data.rhythm_curve) ? data.rhythm_curve : [];

      outlineForm.setFieldsValue({
        outline_text: outlineText,
        outline_structure: outlineStructure,
        rhythm_curve: rhythmCurve,
      });

      // 同时更新本地缓存，确保最新数据被保存
      if (!hasLocalCache || (data.outline_text || data.outline_structure)) {
        const toCache: Partial<Novel> = {};
        if (typeof data.outline_text === 'string' && data.outline_text) {
          toCache.outline_text = data.outline_text;
        }
        if (Array.isArray(data.outline_structure) && data.outline_structure.length > 0) {
          toCache.outline_structure = data.outline_structure;
        }
        if (Array.isArray(data.rhythm_curve) && data.rhythm_curve.length > 0) {
          toCache.rhythm_curve = data.rhythm_curve;
        }
        if (Object.keys(toCache).length > 0 && typeof window !== 'undefined') {
          const existing = cachedRaw ? JSON.parse(cachedRaw) : {};
          window.localStorage.setItem(cacheKey, JSON.stringify({ ...existing, ...toCache }));
        }
      }
    } catch {
      message.error('获取小说详情失败');
    }
  }, [outlineForm]);

  const fetchChapters = useCallback(async (novelId: string) => {
    setLoading(true);
    try {
      const data = await api.get<Chapter[]>(`/chapters?novel_id=${novelId}`);
      setChapters(data || []);
    } catch {
      message.error('获取章节列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchNovel(id);
      fetchChapters(id);
    }
  }, [id, fetchNovel, fetchChapters]);

  const handleCreateChapter = async () => {
    if (!id) return;
    try {
      const maxNum = chapters.reduce((acc, c) => (typeof c.chapter_number === 'number' ? Math.max(acc, c.chapter_number) : acc), 0);
      const nextChapterNum = maxNum + 1;
      const data = await api.post<Chapter>('/chapters', {
        novel_id: id,
        title: `第${nextChapterNum}章`,
        chapter_number: nextChapterNum,
        content: '',
        status: 'draft',
      });
      message.success('创建章节成功');
      // Navigate to editor
      navigate(`/novel/${id}/chapter/${data.id}`);
    } catch {
      message.error('创建章节失败');
    }
  };

  const fetchVersions = useCallback(async (chapterId: string) => {
    setVersionsLoading(true);
    try {
      const data = await api.get<ChapterVersion[]>(`/chapters/${chapterId}/versions`);
      const list = Array.isArray(data) ? data : [];
      setVersions(list);
      setPreviewVersion(list[0] ?? null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '获取版本失败';
      message.error(msg);
      setVersions([]);
      setPreviewVersion(null);
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  const openChapterVersions = (chapter: Chapter, e: React.MouseEvent) => {
    e.stopPropagation();
    setVersionChapter(chapter);
    setVersionsOpen(true);
    fetchVersions(chapter.id);
  };

  const restoreChapterVersion = (v: ChapterVersion) => {
    if (!versionChapter) return;
    Modal.confirm({
      title: '确认恢复版本',
      content: `将章节恢复到 v${v.version_number}，当前内容会被覆盖。`,
      onOk: async () => {
        try {
          await api.post(`/chapters/${versionChapter.id}/restore`, { version_number: v.version_number });
          message.success('已恢复到该版本');
          if (id) fetchChapters(id);
          fetchVersions(versionChapter.id);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : '恢复失败';
          message.error(msg);
        }
      },
    });
  };

  const openEditNovel = () => {
    if (!novel) return;
    editForm.setFieldsValue({
      title: novel.title,
      description: novel.description,
      genre: novel.genre,
      style: novel.style,
    });
    setEditOpen(true);
  };

  const handleSaveNovel = async (values: Pick<Novel, 'title' | 'description' | 'genre' | 'style'>) => {
    if (!id) return;
    try {
      const updated = await api.put<Novel>(`/novels/${id}`, values);
      setNovel(updated);
      message.success('保存成功');
      setEditOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '保存失败';
      message.error(msg);
    }
  };

  const openEditChapter = (chapter: Chapter, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChapter(chapter);
    chapterEditForm.setFieldsValue({ title: chapter.title, status: chapter.status });
    setChapterEditOpen(true);
  };

  const handleSaveChapter = async (values: Pick<Chapter, 'title' | 'status'>) => {
    if (!editingChapter) return;
    try {
      await api.put(`/chapters/${editingChapter.id}`, values);
      message.success('保存成功');
      setChapterEditOpen(false);
      setEditingChapter(null);
      if (id) fetchChapters(id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '保存失败';
      message.error(msg);
    }
  };

  const handleDeleteChapter = (chapterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除章节',
      content: '删除后不可恢复，确定继续吗？',
      onOk: async () => {
        try {
          await api.delete(`/chapters/${chapterId}`);
          message.success('删除成功');
          if (id) fetchChapters(id);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : '删除失败';
          message.error(msg);
        }
      },
    });
  };

  const moveChapter = (index: number, dir: -1 | 1) => {
    setChapters((prev) => {
      const next = [...prev];
      const targetIndex = index + dir;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const tmp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = tmp;
      return next.map((c, i) => ({ ...c, chapter_number: i + 1 }));
    });
  };

  const saveChapterOrder = async () => {
    if (!id) return;
    setReorderSaving(true);
    try {
      await api.post('/chapters/reorder', { novel_id: id, ordered_ids: chapters.map((c) => c.id) });
      message.success('排序已保存');
      setReorderMode(false);
      fetchChapters(id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '保存失败';
      message.error(msg);
    } finally {
      setReorderSaving(false);
    }
  };

  const watchedOutlineStructure = Form.useWatch('outline_structure', outlineForm) as OutlineVolume[] | undefined;
  const computedRhythmCurve = (() => {
    const volumes = Array.isArray(watchedOutlineStructure) ? watchedOutlineStructure : [];
    const curve: number[] = [];
    for (const v of volumes) {
      const chapters = Array.isArray(v?.chapters) ? v.chapters : [];
      for (const c of chapters) {
        const t = typeof c?.tension === 'number' && Number.isFinite(c.tension) ? c.tension : 5;
        curve.push(Math.max(1, Math.min(10, Math.round(t))));
      }
    }
    return curve;
  })();

  // 实时自动保存大纲到本地存储
  useEffect(() => {
    if (!id) return;

    const autoSaveToLocal = () => {
      const values = outlineForm.getFieldsValue();
      const payload = {
        outline_text: typeof values.outline_text === 'string' ? values.outline_text : '',
        outline_structure: Array.isArray(values.outline_structure) ? values.outline_structure : [],
        rhythm_curve: computedRhythmCurve,
      };

      // 只在有内容时才保存
      const hasContent = payload.outline_text ||
        (payload.outline_structure && payload.outline_structure.length > 0);

      if (hasContent && typeof window !== 'undefined') {
        const cacheKey = `novel_outline_${id}`;
        window.localStorage.setItem(cacheKey, JSON.stringify(payload));
      }
    };

    // 防抖保存，避免频繁写入
    const timer = setTimeout(autoSaveToLocal, 500);
    return () => clearTimeout(timer);
  }, [id, outlineForm, watchedOutlineStructure, computedRhythmCurve]);

  const saveOutline = async () => {
    if (!id) return;
    setOutlineSaving(true);
    message.loading({ content: '保存中...', key: 'outline_save', duration: 0 });
    try {
      const values = (await outlineForm.validateFields()) as {
        outline_text?: string;
        outline_structure?: OutlineVolume[];
      };
      const payload = {
        outline_text: typeof values.outline_text === 'string' ? values.outline_text : '',
        outline_structure: Array.isArray(values.outline_structure) ? values.outline_structure : [],
        rhythm_curve: computedRhythmCurve,
      };
      const cacheKey = `novel_outline_${id}`;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(cacheKey, JSON.stringify(payload));
      }
      if (novel) {
        setNovel({ ...novel, ...payload });
      }

      try {
        const updated = await api.put<Novel>(`/novels/${id}`, payload);
        setNovel(updated);
        message.success({ content: '大纲已保存', key: 'outline_save' });
      } catch {
        message.success({ content: '已保存到本机', key: 'outline_save' });
      }
    } catch {
      message.error({ content: '请先完善必填项', key: 'outline_save' });
    } finally {
      setOutlineSaving(false);
    }
  };

  const generateOutline = async () => {
    if (!novel) return;
    setOutlineGenerating(true);
    message.loading({ content: '大纲生成中...', key: 'outline_gen', duration: 0 });
    try {
      const genValues = (await outlineGenForm.validateFields()) as {
        volumes: number;
        chaptersPerVolume: number;
        premise?: string;
      };
      const modelId =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('ai_model_id') || 'deepseek-ai/DeepSeek-V3.2'
          : 'deepseek-ai/DeepSeek-V3.2';
      const data = await api.post<unknown>('/ai/generate-outline', {
        novelTitle: novel.title,
        genre: novel.genre,
        style: novel.style,
        premise: genValues.premise || novel.description,
        volumes: genValues.volumes,
        chaptersPerVolume: genValues.chaptersPerVolume,
        model_id: modelId,
      });

      const obj = (data && typeof data === 'object' ? (data as Record<string, unknown>) : {}) as Record<
        string,
        unknown
      >;
      const nextStoryline = typeof obj.storyline === 'string' ? obj.storyline : '';
      const nextVolumes = Array.isArray(obj.volumes) ? (obj.volumes as OutlineVolume[]) : [];
      const nextCurve = Array.isArray(obj.rhythm_curve) ? (obj.rhythm_curve as number[]) : [];

      outlineForm.setFieldsValue({
        outline_text: nextStoryline,
        outline_structure: nextVolumes,
        rhythm_curve: nextCurve,
      });
      setOutlineGenOpen(false);
      message.success({ content: '已生成大纲', key: 'outline_gen' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '生成失败';
      message.error({ content: msg, key: 'outline_gen' });
    } finally {
      setOutlineGenerating(false);
    }
  };

  if (!novel) return <div className="text-white text-center py-20">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Breadcrumb
        items={[
          { title: <Link to="/dashboard">工作台</Link> },
          { title: novel.title },
        ]}
        className="text-[rgba(255,255,255,0.6)]"
      />

      <Card className="glass-card">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <Title level={2} className="mb-3 text-gradient">{novel.title}</Title>
            <Space className="mb-4" size={8}>
              <Tag color="purple">{novel.genre}</Tag>
              <Tag color="cyan">{novel.style}</Tag>
            </Space>
            <Paragraph className="text-[rgba(255,255,255,0.7)] mb-0">{novel.description}</Paragraph>
          </div>
          <Button
            icon={<EditOutlined />}
            onClick={openEditNovel}
            className="rounded-xl border-[rgba(167,139,250,0.2)] hover:border-[var(--accent-aurora)]"
          >
            编辑信息
          </Button>
        </div>
      </Card>

      <Tabs
        items={[
          {
            key: 'chapters',
            label: '分卷分章',
            children: (
              <>
                <div className="flex justify-between items-center mb-4">
                  <Title level={4} className="mb-0 text-white">章节列表</Title>
                  <Space size={8}>
                    {!reorderMode && (
                      <>
                        <Button
                          icon={<PlusOutlined />}
                          onClick={handleCreateChapter}
                          className="rounded-xl h-10"
                        >
                          新建章节
                        </Button>
                        <Button
                          icon={<BulbOutlined />}
                          onClick={() => navigate(`/inspirations?novelId=${id}`)}
                          className="rounded-xl h-10"
                        >
                          灵感池
                        </Button>
                      </>
                    )}
                    <Button
                      icon={<SwapOutlined />}
                      onClick={() => setReorderMode((v) => !v)}
                      className="rounded-xl h-10"
                    >
                      {reorderMode ? '完成' : '排序'}
                    </Button>
                    {reorderMode && (
                      <Button type="primary" loading={reorderSaving} onClick={saveChapterOrder} className="rounded-xl h-10">
                        保存
                      </Button>
                    )}
                  </Space>
                </div>

                <div className="space-y-2">
                  {loading ? (
                    <div className="text-center py-12 text-[rgba(255,255,255,0.5)]">加载中...</div>
                  ) : chapters.length === 0 ? (
                    <div className="text-center py-12 text-[rgba(255,255,255,0.5)]">
                      暂无章节，点击上方"新建章节"开始创作
                    </div>
                  ) : (
                    chapters.map((item, index) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (!reorderMode) navigate(`/novel/${id}/chapter/${item.id}`);
                        }}
                        className={`
                          glass-card rounded-xl p-4 transition-all duration-300 cursor-pointer
                          ${!reorderMode ? 'hover:border-[rgba(167,139,250,0.4)] hover:translate-x-1' : ''}
                        `}
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* Left: Chapter Info */}
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br from-[var(--accent-aurora)] to-[var(--accent-plasma)] flex items-center justify-center">
                              <span className="text-white font-bold text-lg">{item.chapter_number}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Text strong className="text-white text-base truncate">{item.title}</Text>
                                <Tag
                                  color={
                                    item.status === 'published'
                                      ? 'green'
                                      : item.status === 'archived'
                                        ? 'red'
                                        : 'orange'
                                  }
                                  className="flex-shrink-0"
                                >
                                  {item.status === 'published' ? '已发布' : item.status === 'archived' ? '归档' : '草稿'}
                                </Tag>
                              </div>
                              <Text type="secondary" className="text-xs text-[rgba(255,255,255,0.4)]">
                                {new Date(item.updated_at).toLocaleString()}
                              </Text>
                            </div>
                          </div>

                          {/* Right: Action Buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {reorderMode ? (
                              <>
                                <Button
                                  icon={<ArrowUpOutlined />}
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); moveChapter(index, -1); }}
                                  disabled={index === 0}
                                  className="rounded-lg w-9 h-9 flex items-center justify-center"
                                />
                                <Button
                                  icon={<ArrowDownOutlined />}
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); moveChapter(index, 1); }}
                                  disabled={index === chapters.length - 1}
                                  className="rounded-lg w-9 h-9 flex items-center justify-center"
                                />
                              </>
                            ) : (
                              <>
                                <Button
                                  icon={<HistoryOutlined />}
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); openChapterVersions(item, e); }}
                                  className="rounded-lg w-9 h-9 flex items-center justify-center text-[rgba(255,255,255,0.6)] hover:text-[var(--accent-comet)]"
                                  title="版本历史"
                                />
                                <Button
                                  icon={<EditOutlined />}
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); openEditChapter(item, e); }}
                                  className="rounded-lg w-9 h-9 flex items-center justify-center text-[rgba(255,255,255,0.6)] hover:text-[var(--accent-aurora)]"
                                  title="编辑"
                                />
                                <Button
                                  icon={<DeleteOutlined />}
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteChapter(item.id, e); }}
                                  className="rounded-lg w-9 h-9 flex items-center justify-center text-[rgba(255,255,255,0.6)] hover:text-[var(--error)]"
                                  title="删除"
                                />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ),
          },
          {
            key: 'outline',
            label: '大纲与节奏',
            children: (
              <div className="space-y-4">
                <Card
                  title={<span className="text-white" style={{ fontFamily: 'var(--font-display)' }}>大纲编辑</span>}
                  className="glass-card"
                  extra={
                    <Space>
                      <Button onClick={() => setOutlineGenOpen(true)} className="rounded-xl">AI 生成大纲</Button>
                      <Button type="primary" loading={outlineSaving} onClick={saveOutline} className="rounded-xl">
                        保存大纲
                      </Button>
                    </Space>
                  }
                >
                  <Form form={outlineForm} layout="vertical">
                    <Form.Item name="outline_text" label={<span className="text-[rgba(255,255,255,0.9)]">故事线（主线概述）</span>}>
                      <Input.TextArea rows={4} placeholder="用几段话概述主线、核心冲突与结局方向" />
                    </Form.Item>

                    <Form.List name="outline_structure">
                      {(volumeFields, { add: addVolume, remove: removeVolume }) => (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-[rgba(255,255,255,0.5)]">分卷分章结构</div>
                            <Button onClick={() => addVolume({ title: `第${volumeFields.length + 1}卷`, summary: '', chapters: [] })} className="rounded-xl">
                              添加卷
                            </Button>
                          </div>

                          <Collapse
                            items={volumeFields.map((vf) => ({
                              key: vf.key,
                              label: `卷 ${vf.name + 1}`,
                              children: (
                                <div className="space-y-3">
                                  <div className="flex gap-2">
                                    <Form.Item
                                      name={[vf.name, 'title']}
                                      label="卷标题"
                                      className="flex-1"
                                      rules={[{ required: true, message: '请输入卷标题' }]}
                                    >
                                      <Input placeholder="例如：迷雾初开" />
                                    </Form.Item>
                                    <Button danger onClick={() => removeVolume(vf.name)}>
                                      删除卷
                                    </Button>
                                  </div>
                                  <Form.Item name={[vf.name, 'summary']} label="卷摘要">
                                    <Input.TextArea rows={2} placeholder="本卷目标、转折与收束" />
                                  </Form.Item>

                                  <Form.List name={[vf.name, 'chapters']}>
                                    {(chapterFields, { add: addChapter, remove: removeChapter }) => (
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <div className="text-sm text-gray-500">章节</div>
                                          <Button
                                            onClick={() =>
                                              addChapter({
                                                title: `第${chapterFields.length + 1}章`,
                                                summary: '',
                                                tension: 5,
                                              })
                                            }
                                          >
                                            添加章
                                          </Button>
                                        </div>

                                        {chapterFields.map((cf) => (
                                          <Card
                                            key={cf.key}
                                            size="small"
                                            title={`章 ${cf.name + 1}`}
                                            extra={
                                              <Button danger size="small" onClick={() => removeChapter(cf.name)}>
                                                删除
                                              </Button>
                                            }
                                          >
                                            <Form.Item
                                              name={[cf.name, 'title']}
                                              label="章标题"
                                              rules={[{ required: true, message: '请输入章标题' }]}
                                            >
                                              <Input placeholder="例如：夜雨来客" />
                                            </Form.Item>
                                            <Form.Item name={[cf.name, 'summary']} label="章摘要">
                                              <Input.TextArea rows={2} placeholder="该章发生什么、冲突点是什么、结尾钩子是什么" />
                                            </Form.Item>
                                            <Form.Item name={[cf.name, 'tension']} label="节奏强度（1-10）">
                                              <InputNumber min={1} max={10} step={1} style={{ width: '100%' }} />
                                            </Form.Item>
                                          </Card>
                                        ))}
                                      </div>
                                    )}
                                  </Form.List>
                                </div>
                              ),
                            }))}
                          />
                        </div>
                      )}
                    </Form.List>
                  </Form>
                </Card>

                <Card title="节奏曲线">
                  <ReactECharts
                    option={{
                      grid: { left: 36, right: 16, top: 24, bottom: 28 },
                      xAxis: {
                        type: 'category',
                        data: computedRhythmCurve.map((_, i) => `第${i + 1}章`),
                        axisLabel: { interval: Math.max(0, Math.floor(computedRhythmCurve.length / 12) - 1) },
                      },
                      yAxis: { type: 'value', min: 1, max: 10 },
                      series: [
                        {
                          type: 'line',
                          data: computedRhythmCurve,
                          smooth: true,
                          areaStyle: {},
                        },
                      ],
                      tooltip: { trigger: 'axis' },
                    }}
                    style={{ height: 240 }}
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title={<span className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>编辑小说信息</span>}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical" onFinish={handleSaveNovel}>
          <Form.Item name="title" label={<span className="text-[rgba(255,255,255,0.9)]">小说标题</span>} rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入小说标题" size="large" />
          </Form.Item>
          <Form.Item name="description" label={<span className="text-[rgba(255,255,255,0.9)]">简介</span>}>
            <Input.TextArea rows={4} placeholder="请输入小说简介" />
          </Form.Item>
          <Form.Item name="genre" label={<span className="text-[rgba(255,255,255,0.9)]">类型</span>} initialValue="玄幻">
            <Select size="large">
              <Option value="玄幻">玄幻</Option>
              <Option value="科幻">科幻</Option>
              <Option value="都市">都市</Option>
              <Option value="历史">历史</Option>
              <Option value="悬疑">悬疑</Option>
            </Select>
          </Form.Item>
          <Form.Item name="style" label={<span className="text-[rgba(255,255,255,0.9)]">风格</span>} initialValue="热血">
            <Select size="large">
              <Option value="热血">热血</Option>
              <Option value="轻松">轻松</Option>
              <Option value="暗黑">暗黑</Option>
              <Option value="正剧">正剧</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<span className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>AI 生成大纲</span>}
        open={outlineGenOpen}
        onCancel={() => setOutlineGenOpen(false)}
        confirmLoading={outlineGenerating}
        okButtonProps={{ disabled: outlineGenerating }}
        cancelButtonProps={{ disabled: outlineGenerating }}
        onOk={() => {
          setOutlineGenerating(true);
          outlineGenForm.submit();
        }}
        okText="生成"
        cancelText="取消"
      >
        <Form
          form={outlineGenForm}
          layout="vertical"
          onFinish={generateOutline}
          onFinishFailed={() => setOutlineGenerating(false)}
          initialValues={{ volumes: 3, chaptersPerVolume: 10, premise: novel.description || '' }}
        >
          <Form.Item name="premise" label={<span className="text-[rgba(255,255,255,0.9)]">核心设定/前提（可选）</span>}>
            <Input.TextArea rows={3} placeholder="例如：主角获得禁术后被各方追杀，必须在一年内解开身世之谜" />
          </Form.Item>
          <Form.Item name="volumes" label={<span className="text-[rgba(255,255,255,0.9)]">卷数</span>} rules={[{ required: true, message: '请输入卷数' }]}>
            <InputNumber min={1} max={20} step={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="chaptersPerVolume"
            label={<span className="text-[rgba(255,255,255,0.9)]">每卷章数</span>}
            rules={[{ required: true, message: '请输入每卷章数' }]}
          >
            <InputNumber min={1} max={200} step={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<span className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>编辑章节</span>}
        open={chapterEditOpen}
        onCancel={() => {
          setChapterEditOpen(false);
          setEditingChapter(null);
        }}
        onOk={() => chapterEditForm.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form form={chapterEditForm} layout="vertical" onFinish={handleSaveChapter}>
          <Form.Item name="title" label={<span className="text-[rgba(255,255,255,0.9)]">章节标题</span>} rules={[{ required: true, message: '请输入章节标题' }]}>
            <Input placeholder="请输入章节标题" size="large" />
          </Form.Item>
          <Form.Item name="status" label={<span className="text-[rgba(255,255,255,0.9)]">状态</span>} initialValue="draft">
            <Select size="large">
              <Option value="draft">草稿</Option>
              <Option value="published">已发布</Option>
              <Option value="archived">归档</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<span className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{versionChapter ? `版本历史：第${versionChapter.chapter_number}章 ${versionChapter.title}` : '版本历史'}</span>}
        open={versionsOpen}
        onCancel={() => {
          setVersionsOpen(false);
          setVersionChapter(null);
          setPreviewVersion(null);
          setVersions([]);
        }}
        footer={null}
        width={920}
      >
        <div className="flex gap-4">
          <div className="w-80">
            <List
              loading={versionsLoading}
              dataSource={versions}
              renderItem={(v) => (
                <List.Item
                  onClick={() => setPreviewVersion(v)}
                  className={previewVersion?.id === v.id ? 'bg-[rgba(167,139,250,0.15)] cursor-pointer rounded-lg' : 'cursor-pointer hover:bg-[rgba(167,139,250,0.05)] rounded-lg'}
                  actions={[
                    <Button key="restore" size="small" onClick={() => restoreChapterVersion(v)}>
                      恢复
                    </Button>,
                  ]}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Text strong className="text-white">{`v${v.version_number}`}</Text>
                      <Tag
                        color={
                          v.status === 'published' ? 'green' : v.status === 'archived' ? 'red' : 'orange'
                        }
                      >
                        {v.status === 'published' ? '已发布' : v.status === 'archived' ? '归档' : '草稿'}
                      </Tag>
                    </div>
                    <div className="text-xs text-[rgba(255,255,255,0.4)]">{new Date(v.created_at).toLocaleString()}</div>
                    <div className="text-sm text-[rgba(255,255,255,0.8)]">{v.title}</div>
                  </div>
                </List.Item>
              )}
            />
          </div>

          <Divider type="vertical" style={{ height: 'auto' }} />

          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <Text strong className="text-white">{previewVersion ? `v${previewVersion.version_number} ${previewVersion.title}` : '预览'}</Text>
              </div>
            </div>
            <Input.TextArea
              value={previewVersion?.content ?? ''}
              readOnly
              rows={20}
              placeholder="选择左侧版本以预览内容"
              className="version-preview-textarea"
            />
          </div>
        </div>
      </Modal>

      <style>{`
        .version-preview-textarea .ant-input {
          background: rgba(255, 255, 255, 0.03) !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }
      `}</style>
    </div>
  );
};

export default NovelDetail;
