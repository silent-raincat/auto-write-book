import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Button, Select, Switch, message, Space, Tag } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useWorldViewStore } from '@/stores/useWorldViewStore';
import type { WorldViewEntry } from '@/types/worldview';

const { TextArea } = Input;
const { Option } = Select;

interface EntryEditorProps {
  visible: boolean;
  onClose: () => void;
  novelId: string;
  categoryId: string | null;
  entryId?: string;
}

const EntryEditor: React.FC<EntryEditorProps> = ({
  visible,
  onClose,
  novelId,
  categoryId,
  entryId,
}) => {
  const [form] = Form.useForm();
  const [tags, setTags] = useState<string[]>([]);
  const [inputTag, setInputTag] = useState('');
  const [characters, setCharacters] = useState<any[]>([]);
  const [allEntries, setAllEntries] = useState<WorldViewEntry[]>([]);

  const {
    entries,
    loading,
    createEntry,
    updateEntry,
    fetchEntries,
  } = useWorldViewStore();

  const isEdit = !!entryId;

  useEffect(() => {
    if (visible) {
      fetchCharacters();
      fetchAllEntries();
      if (entryId) {
        fetchEntryData();
      }
    }
  }, [visible, entryId]);

  const fetchCharacters = async () => {
    try {
      const res = await fetch(`/api/characters?novel_id=${novelId}`);
      const json = await res.json();
      setCharacters(json.data || []);
    } catch {
      // Ignore
    }
  };

  const fetchAllEntries = async () => {
    try {
      const res = await fetch(`/api/worldview-entries?novel_id=${novelId}`);
      const json = await res.json();
      setAllEntries(json.data || []);
    } catch {
      // Ignore
    }
  };

  const fetchEntryData = async () => {
    try {
      const res = await fetch(`/api/worldview-entries/${entryId}`);
      const json = await res.json();
      const entry = json.data;
      form.setFieldsValue({
        title: entry.title,
        content: entry.content,
        tags: entry.tags || [],
        related_entries: entry.related_entries || [],
        related_characters: entry.related_characters || [],
        is_locked: entry.is_locked || false,
      });
      setTags(entry.tags || []);
    } catch {
      message.error('获取条目数据失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const data = {
        novel_id: novelId,
        category_id: categoryId!,
        title: values.title,
        content: values.content,
        tags: tags,
        related_entries: values.related_entries || [],
        related_characters: values.related_characters || [],
        is_locked: values.is_locked || false,
      };

      if (entryId) {
        await updateEntry(entryId, data);
        message.success('更新成功');
      } else {
        await createEntry(data);
        message.success('创建成功');
      }
      form.resetFields();
      setTags([]);
      onClose();
    } catch {
      message.error(entryId ? '更新失败' : '创建失败');
    }
  };

  const handleAddTag = () => {
    if (inputTag && !tags.includes(inputTag)) {
      setTags([...tags, inputTag]);
      setInputTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const availableEntries = allEntries.filter(e => e.id !== entryId);

  return (
    <Modal
      title={isEdit ? '编辑条目' : '添加条目'}
      open={visible}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={700}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入标题' }]}
        >
          <Input placeholder="条目标题" />
        </Form.Item>

        <Form.Item name="content" label="内容">
          <TextArea rows={8} placeholder="详细描述..." />
        </Form.Item>

        <Form.Item label="标签">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={inputTag}
                onChange={(e) => setInputTag(e.target.value)}
                onPressEnter={handleAddTag}
                placeholder="输入标签后按回车添加"
              />
              <Button onClick={handleAddTag} icon={<PlusOutlined />}>
                添加
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {tags.map((tag) => (
                <Tag
                  key={tag}
                  closable
                  onClose={() => handleRemoveTag(tag)}
                >
                  {tag}
                </Tag>
              ))}
            </div>
          </div>
        </Form.Item>

        <Form.Item name="related_entries" label="关联条目">
          <Select
            mode="multiple"
            placeholder="选择关联的其他条目"
            allowClear
          >
            {availableEntries.map((e) => (
              <Option key={e.id} value={e.id}>
                {e.title}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="related_characters" label="关联角色">
          <Select
            mode="multiple"
            placeholder="选择关联的角色"
            allowClear
          >
            {characters.map((c) => (
              <Option key={c.id} value={c.id}>
                {c.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="is_locked"
          label="锁定条目"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EntryEditor;
