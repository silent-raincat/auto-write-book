import React, { useState, useEffect } from 'react';
import {
  Layout,
  Button,
  Input,
  Select,
  Modal,
  Space,
  Typography,
  message,
  Spin,
  Divider,
  Card,
  Tooltip,
  Tag,
  Slider,
  Switch,
  ColorPicker
} from 'antd';
import {
  PlusOutlined,
  BulbOutlined,
  DeleteOutlined,
  RocketOutlined,
  CheckSquareOutlined,
  BorderOutlined,
  ReloadOutlined,
  CopyOutlined
} from '@ant-design/icons';
import InspirationCard from '../components/InspirationCard';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColorPickerProps } from 'antd';

const { Content, Sider } = Layout;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface Novel {
  id: string;
  title: string;
  description?: string;
  genre?: string;
  style?: string;
}

interface Inspiration {
  id: string;
  content: string;
  category: string;
  tags: string[];
  is_used: boolean;
  used_chapters: string[];
  color: string;
  created_at: string;
  updated_at: string;
}

const CATEGORY_OPTIONS = [
  { label: '🎬 场景', value: 'scene' },
  { label: '💬 对话', value: 'dialogue' },
  { label: '📖 情节', value: 'plot' },
  { label: '🌟 氛围', value: 'atmosphere' },
  { label: '⚡ 动作', value: 'action' },
  { label: '👤 角色', value: 'character' },
  { label: '💡 通用', value: 'general' },
];

const MODEL_OPTIONS = [
  { label: 'DeepSeek-V3.2', value: 'deepseek-ai/DeepSeek-V3.2' },
  { label: 'DeepSeek-R1', value: 'deepseek-ai/DeepSeek-R1' },
  { label: 'Qwen3-Next-80B-A3B-Instruct', value: 'Qwen/Qwen3-Next-80B-A3B-Instruct' },
  { label: 'DeepSeek-R1-Distill-Qwen-7B', value: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B' },
];

const InspirationPool: React.FC = () => {
  const [searchParams] = useSearchParams();
  const novelId = searchParams.get('novelId') || '';
  const navigate = useNavigate();

  const [novel, setNovel] = useState<Novel | null>(null);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [filteredInspirations, setFilteredInspirations] = useState<Inspiration[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // 创建灵感模态框
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newInspirationContent, setNewInspirationContent] = useState('');
  const [newInspirationCategory, setNewInspirationCategory] = useState('general');
  const [newInspirationColor, setNewInspirationColor] = useState<ColorPickerProps['value']>('#1890ff');

  // 生成设置
  const [selectedInspirations, setSelectedInspirations] = useState<Set<string>>(new Set());
  const [targetWordCount, setTargetWordCount] = useState(3000);
  const [selectedModel, setSelectedModel] = useState('deepseek-ai/DeepSeek-V3.2');
  const [enableStream, setEnableStream] = useState(false);

  // 生成结果预览
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // 筛选状态
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterUsed, setFilterUsed] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 获取小说列表
  const fetchNovels = async () => {
    try {
      const response = await fetch('/api/novels');
      const data = await response.json();
      if (data.data) {
        setNovels(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch novels:', error);
    }
  };

  useEffect(() => {
    fetchNovels();
  }, []);

  useEffect(() => {
    if (novelId) {
      fetchNovel();
      fetchInspirations();
    } else {
      // 没有novelId时，加载小说列表但不做警告
      setNovel(null);
      setInspirations([]);
      setFilteredInspirations([]);
      setLoading(false);
    }
  }, [novelId]);

  useEffect(() => {
    applyFilters();
  }, [inspirations, filterCategory, filterUsed, searchKeyword]);

  const fetchNovel = async () => {
    try {
      const response = await fetch(`/api/novels/${novelId}`);
      const data = await response.json();
      if (data.success) {
        setNovel(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch novel:', error);
    }
  };

  const fetchInspirations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/inspirations?novel_id=${novelId}`);
      const data = await response.json();
      if (data.materials) {
        setInspirations(data.materials);
      }
    } catch (error) {
      console.error('Failed to fetch inspirations:', error);
      message.error('加载灵感素材失败');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...inspirations];

    if (filterCategory !== 'all') {
      filtered = filtered.filter((insp) => insp.category === filterCategory);
    }

    if (filterUsed === 'used') {
      filtered = filtered.filter((insp) => insp.is_used);
    } else if (filterUsed === 'unused') {
      filtered = filtered.filter((insp) => !insp.is_used);
    }

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(
        (insp) =>
          insp.content.toLowerCase().includes(keyword) ||
          insp.tags.some((tag) => tag.toLowerCase().includes(keyword))
      );
    }

    setFilteredInspirations(filtered);
  };

  const handleColorChange: ColorPickerProps['onChange'] = (color, css) => {
    setNewInspirationColor(color);
  };

  const handleCreateInspiration = async () => {
    if (!newInspirationContent.trim()) {
      message.warning('请输入灵感内容');
      return;
    }

    try {
      let colorValue = '#1890ff';
      if (typeof newInspirationColor === 'string') {
        colorValue = newInspirationColor;
      } else if (newInspirationColor && typeof newInspirationColor === 'object' && 'toHexString' in newInspirationColor && typeof newInspirationColor.toHexString === 'function') {
        colorValue = newInspirationColor.toHexString();
      }

      const response = await fetch('/api/inspirations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novel_id: novelId,
          content: newInspirationContent,
          category: newInspirationCategory,
          color: colorValue,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        message.success('灵感创建成功');
        setNewInspirationContent('');
        setNewInspirationCategory('general');
        setNewInspirationColor('#1890ff');
        setIsCreateModalOpen(false);
        fetchInspirations();
      } else {
        message.error(data.error || '创建失败');
      }
    } catch (error) {
      console.error('Failed to create inspiration:', error);
      message.error('创建灵感失败');
    }
  };

  const handleUpdateInspiration = async (id: string, data: Partial<Inspiration>) => {
    try {
      const response = await fetch(`/api/inspirations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        message.success('更新成功');
        fetchInspirations();
      } else {
        const result = await response.json();
        message.error(result.error || '更新失败');
      }
    } catch (error) {
      console.error('Failed to update inspiration:', error);
      message.error('更新失败');
    }
  };

  const handleDeleteInspiration = async (id: string) => {
    try {
      const response = await fetch(`/api/inspirations/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('删除成功');
        fetchInspirations();
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      console.error('Failed to delete inspiration:', error);
      message.error('删除失败');
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedInspirations);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedInspirations(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedInspirations.size === filteredInspirations.length) {
      setSelectedInspirations(new Set());
    } else {
      setSelectedInspirations(new Set(filteredInspirations.map((i) => i.id)));
    }
  };

  const handleGenerateChapter = async () => {
    if (selectedInspirations.size === 0) {
      message.warning('请至少选择一个灵感素材');
      return;
    }

    setGenerating(true);
    setGeneratedContent('');
    setGeneratedTitle('');
    setShowPreview(true);

    try {
      const response = await fetch('/api/ai/generate-from-inspirations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-modelscope-api-key': localStorage.getItem('modelscope_api_key') || '',
        },
        body: JSON.stringify({
          novelId,
          inspirationIds: Array.from(selectedInspirations),
          targetWordCount,
          model_id: selectedModel,
          stream: false, // 禁用流式输出以便预览
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '生成失败');
      }

      const data = await response.json();
      if (data.success) {
        setGeneratedTitle(data.data.title);
        setGeneratedContent(data.data.content);
        message.success('章节生成成功！请预览并保存');
      }
    } catch (error: any) {
      console.error('Generation failed:', error);
      message.error(error.message || '生成失败');
      setShowPreview(false);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAsChapter = async () => {
    if (!generatedContent) {
      message.warning('没有可保存的内容');
      return;
    }

    try {
      // 获取当前章节数量
      const chaptersResponse = await fetch(`/api/chapters?novel_id=${novelId}`);
      const chaptersData = await chaptersResponse.json();
      const chapterCount = chaptersData.data?.length || 0;
      const newChapterNumber = chapterCount + 1;

      // 创建章节
      const createResponse = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novel_id: novelId,
          title: generatedTitle,
          content: generatedContent,
          chapter_number: newChapterNumber,
          status: 'draft',
        }),
      });

      if (createResponse.ok) {
        const newChapter = await createResponse.json();

        // 标记灵感为已使用
        for (const inspirationId of selectedInspirations) {
          await fetch(`/api/inspirations/${inspirationId}/mark-used`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chapter_id: newChapter.data.id }),
          });
        }

        message.success('章节保存成功！');
        setSelectedInspirations(new Set());
        setGeneratedContent('');
        setGeneratedTitle('');
        setShowPreview(false);
        fetchInspirations();

        // 询问是否继续编辑
        Modal.confirm({
          title: '章节已保存',
          content: '是否前往编辑器继续编辑？',
          okText: '前往编辑',
          cancelText: '留在灵感池',
          onOk: () => {
            navigate(`/editor?novelId=${novelId}&chapterId=${newChapter.data.id}`);
          }
        });
      } else {
        throw new Error('保存章节失败');
      }
    } catch (error: any) {
      console.error('Save failed:', error);
      message.error(error.message || '保存失败');
    }
  };

  const handleRegenerate = () => {
    handleGenerateChapter();
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(generatedContent);
    message.success('已复制到剪贴板');
  };

  const stats = {
    total: inspirations.length,
    used: inspirations.filter((i) => i.is_used).length,
    unused: inspirations.filter((i) => !i.is_used).length,
  };

  // 没有选择小说时显示小说选择界面
  if (!novelId) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#0f0f0f' }}>
        <Content style={{ padding: '24px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', marginTop: 80 }}>
            <Card
              style={{
                background: '#1a1a1a',
                borderColor: '#333',
                textAlign: 'center',
                padding: 40
              }}
            >
              <BulbOutlined style={{ fontSize: 64, color: '#faad14', marginBottom: 24 }} />
              <Title level={2} style={{ color: '#fff', marginBottom: 16 }}>
                选择小说
              </Title>
              <Text type="secondary" style={{ fontSize: 16, marginBottom: 32, display: 'block' }}>
                请选择要管理灵感的小说
              </Text>

              {novels.length === 0 ? (
                <div>
                  <Text type="secondary">暂无小说，请先创建小说</Text>
                  <Button
                    type="primary"
                    style={{ marginTop: 16 }}
                    onClick={() => navigate('/dashboard')}
                  >
                    前往工作台
                  </Button>
                </div>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {novels.map((n) => (
                    <Card
                      key={n.id}
                      style={{
                        background: '#0f0f0f',
                        borderColor: '#333',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                      hoverable
                      onClick={() => navigate(`/inspirations?novelId=${n.id}`)}
                      bodyStyle={{ padding: 16 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space direction="vertical" size={0}>
                          <Text strong style={{ fontSize: 16, color: '#fff' }}>
                            {n.title}
                          </Text>
                          {n.description && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {n.description.substring(0, 50)}{n.description.length > 50 ? '...' : ''}
                            </Text>
                          )}
                          <Space size={4}>
                            {n.genre && <Tag color="purple">{n.genre}</Tag>}
                            {n.style && <Tag color="cyan">{n.style}</Tag>}
                          </Space>
                        </Space>
                        <Button type="primary" icon={<BulbOutlined />}>
                          进入灵感池
                        </Button>
                      </div>
                    </Card>
                  ))}
                </Space>
              )}
            </Card>
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#0f0f0f' }}>
      <Content style={{ padding: '24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* 头部 */}
          <div style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <BulbOutlined style={{ fontSize: 32, color: '#faad14' }} />
                  <div>
                    <Title level={2} style={{ margin: 0, color: '#fff' }}>
                      灵感池
                    </Title>
                    <Text type="secondary">{novel?.title || '未命名小说'}</Text>
                  </div>
                </Space>
                <Space>
                  <Button onClick={() => navigate('/inspirations')}>
                    切换小说
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>
                    添加灵感
                  </Button>
                </Space>
              </div>

              {/* 统计信息 */}
              <Space size="large">
                <Text>总计: <Text strong style={{ color: '#1890ff' }}>{stats.total}</Text></Text>
                <Text>已使用: <Text strong style={{ color: '#52c41a' }}>{stats.used}</Text></Text>
                <Text>未使用: <Text strong style={{ color: '#faad14' }}>{stats.unused}</Text></Text>
              </Space>
            </Space>
          </div>

          <Layout hasSider>
            {/* 左侧：灵感列表 */}
            <Content style={{ marginRight: 24 }}>
              <Card
                size="small"
                style={{ marginBottom: 16, background: '#1a1a1a', borderColor: '#333' }}
                bodyStyle={{ padding: 12 }}
              >
                <Space wrap style={{ width: '100%' }}>
                  <Input
                    placeholder="搜索灵感..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    style={{ width: 200 }}
                    allowClear
                  />
                  <Select
                    value={filterCategory}
                    onChange={setFilterCategory}
                    options={[{ label: '全部分类', value: 'all' }, ...CATEGORY_OPTIONS]}
                    style={{ width: 150 }}
                  />
                  <Select
                    value={filterUsed}
                    onChange={setFilterUsed}
                    options={[
                      { label: '全部状态', value: 'all' },
                      { label: '已使用', value: 'used' },
                      { label: '未使用', value: 'unused' },
                    ]}
                    style={{ width: 120 }}
                  />
                  <Button icon={<ReloadOutlined />} onClick={fetchInspirations}>
                    刷新
                  </Button>
                  <div style={{ flex: 1 }} />
                  <Tooltip title={selectedInspirations.size === filteredInspirations.length ? '取消全选' : '全选'}>
                    <Button
                      icon={selectedInspirations.size === filteredInspirations.length ? <CheckSquareOutlined /> : <BorderOutlined />}
                      onClick={handleSelectAll}
                    >
                      {selectedInspirations.size} / {filteredInspirations.length}
                    </Button>
                  </Tooltip>
                </Space>
              </Card>

              {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Spin size="large" />
                </div>
              ) : filteredInspirations.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: 40, background: '#1a1a1a', borderColor: '#333' }}>
                  <BulbOutlined style={{ fontSize: 48, color: '#444', marginBottom: 16 }} />
                  <Text type="secondary">暂无灵感素材，点击上方按钮添加</Text>
                </Card>
              ) : (
                <div>
                  {filteredInspirations.map((inspiration) => (
                    <div key={inspiration.id} onClick={(e) => e.stopPropagation()}>
                      <InspirationCard
                        inspiration={inspiration}
                        isSelected={selectedInspirations.has(inspiration.id)}
                        onSelect={() => handleToggleSelect(inspiration.id)}
                        onUpdate={handleUpdateInspiration}
                        onDelete={handleDeleteInspiration}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Content>

            {/* 右侧：生成面板和预览 */}
            <Sider width={showPreview ? 500 : 320} style={{ background: 'transparent', transition: 'width 0.3s' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* 生成设置 */}
                {!showPreview && (
                  <Card
                    title="AI 生成设置"
                    style={{ background: '#1a1a1a', borderColor: '#333' }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                      <div>
                        <Text strong>已选择灵感</Text>
                        <div style={{ marginTop: 8, minHeight: 60, maxHeight: 200, overflow: 'auto', background: '#0f0f0f', padding: 8, borderRadius: 4 }}>
                          {selectedInspirations.size === 0 ? (
                            <Text type="secondary" style={{ fontSize: 12 }}>未选择任何灵感</Text>
                          ) : (
                            inspirations
                              .filter((i) => selectedInspirations.has(i.id))
                              .map((insp) => (
                                <Tag
                                  key={insp.id}
                                  closable
                                  onClose={() => handleToggleSelect(insp.id)}
                                  style={{ marginBottom: 4 }}
                                >
                                  {insp.content.substring(0, 20)}...
                                </Tag>
                              ))
                          )}
                        </div>
                      </div>

                      <div>
                        <Text strong>目标字数</Text>
                        <div style={{ marginTop: 8 }}>
                          <Slider
                            min={500}
                            max={10000}
                            step={500}
                            value={targetWordCount}
                            onChange={setTargetWordCount}
                            marks={{ 1000: '1k', 3000: '3k', 5000: '5k', 10000: '10k' }}
                          />
                          <Text type="secondary">当前: {targetWordCount} 字</Text>
                        </div>
                      </div>

                      <div>
                        <Text strong>AI 模型</Text>
                        <Select
                          value={selectedModel}
                          onChange={setSelectedModel}
                          options={MODEL_OPTIONS}
                          style={{ width: '100%', marginTop: 8 }}
                        />
                      </div>

                      <Button
                        type="primary"
                        size="large"
                        icon={<RocketOutlined />}
                        onClick={handleGenerateChapter}
                        loading={generating}
                        disabled={selectedInspirations.size === 0}
                        block
                      >
                        生成章节
                      </Button>

                      <Text type="secondary" style={{ fontSize: 12 }}>
                        基于选中的灵感素材，AI将自动生成一个完整的章节
                      </Text>
                    </Space>
                  </Card>
                )}

                {/* 预览面板 */}
                {showPreview && (
                  <Card
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>生成预览</span>
                        <Button
                          type="text"
                          size="small"
                          onClick={() => setShowPreview(false)}
                        >
                          关闭预览
                        </Button>
                      </div>
                    }
                    style={{ background: '#1a1a1a', borderColor: '#333' }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      {generating ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                          <Spin size="large" />
                          <div style={{ marginTop: 16 }}>
                            <Text type="secondary">AI正在创作中...</Text>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <Text strong>章节标题</Text>
                            <div style={{ marginTop: 8, padding: 12, background: '#0f0f0f', borderRadius: 4 }}>
                              <Text style={{ color: '#fff' }}>{generatedTitle || '未命名章节'}</Text>
                            </div>
                          </div>

                          <div>
                            <Text strong>章节内容</Text>
                            <div
                              style={{
                                marginTop: 8,
                                padding: 12,
                                background: '#0f0f0f',
                                borderRadius: 4,
                                maxHeight: 400,
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                                lineHeight: 1.8
                              }}
                            >
                              <Text style={{ color: '#ccc' }}>
                                {generatedContent || '暂无内容'}
                              </Text>
                            </div>
                          </div>

                          <div style={{ marginTop: 16 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              字数: {generatedContent.length} 字
                            </Text>
                          </div>

                          <Space direction="vertical" style={{ width: '100%' }} size="small">
                            <Button
                              type="primary"
                              size="large"
                              icon={<CheckSquareOutlined />}
                              onClick={handleSaveAsChapter}
                              block
                            >
                              保存为章节
                            </Button>

                            <Space style={{ width: '100%' }}>
                              <Button
                                icon={<ReloadOutlined />}
                                onClick={handleRegenerate}
                                disabled={generating}
                                style={{ flex: 1 }}
                              >
                                重新生成
                              </Button>
                              <Button
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                  setShowPreview(false);
                                  setGeneratedContent('');
                                  setGeneratedTitle('');
                                }}
                                style={{ flex: 1 }}
                              >
                                放弃
                              </Button>
                            </Space>

                            <Button
                              icon={<CopyOutlined />}
                              onClick={handleCopyContent}
                              block
                            >
                              复制内容
                            </Button>
                          </Space>
                        </>
                      )}
                    </Space>
                  </Card>
                )}
              </Space>
            </Sider>
          </Layout>
        </div>
      </Content>

      {/* 创建灵感模态框 */}
      <Modal
        title="添加灵感素材"
        open={isCreateModalOpen}
        onOk={handleCreateInspiration}
        onCancel={() => setIsCreateModalOpen(false)}
        okText="创建"
        cancelText="取消"
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>分类</Text>
            <Select
              value={newInspirationCategory}
              onChange={setNewInspirationCategory}
              options={CATEGORY_OPTIONS}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>

          <div>
            <Text strong>颜色标记</Text>
            <div style={{ marginTop: 8 }}>
              <ColorPicker
                value={newInspirationColor}
                onChange={handleColorChange}
                showText
                format="hex"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <Text strong>灵感内容</Text>
            <TextArea
              value={newInspirationContent}
              onChange={(e) => setNewInspirationContent(e.target.value)}
              rows={8}
              placeholder="输入你的灵感想法...可以是一个场景、一段对话、一个情节构思等"
              style={{ marginTop: 8 }}
            />
          </div>
        </Space>
      </Modal>
    </Layout>
  );
};

export default InspirationPool;
