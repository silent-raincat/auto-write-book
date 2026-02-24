import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Input, Slider, Button, List, Tag, Space, message, Popconfirm } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useCharacterStore } from '@/stores/useCharacterStore';
import type { Character, CharacterRelationship, CreateRelationshipValues } from '@/types/character';

const { TextArea } = Input;

interface RelationshipEditorProps {
  visible: boolean;
  onClose: () => void;
  character: Character | null;
  novelId: string | null;
}

const RELATIONSHIP_TYPES = [
  { label: '朋友', value: 'friend' },
  { label: '敌人', value: 'enemy' },
  { label: '家人', value: 'family' },
  { label: '恋人', value: 'lover' },
  { label: '导师', value: 'mentor' },
  { label: '竞争对手', value: 'rival' },
  { label: '盟友', value: 'ally' },
  { label: '陌生人', value: 'stranger' },
  { label: '其他', value: 'other' },
];

const RELATIONSHIP_STATUSES = [
  { label: '活跃', value: 'active' },
  { label: '疏远', value: 'estranged' },
  { label: '已故', value: 'deceased' },
  { label: '复杂', value: 'complicated' },
];

const RelationshipEditor: React.FC<RelationshipEditorProps> = ({
  visible,
  onClose,
  character,
  novelId,
}) => {
  const [form] = Form.useForm();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { createRelationship, updateRelationship, deleteRelationship } = useCharacterStore();

  useEffect(() => {
    if (visible && novelId && character) {
      fetchCharacters();
      fetchRelationships();
    }
  }, [visible, novelId, character]);

  const fetchCharacters = async () => {
    try {
      const res = await fetch(`/api/characters?novel_id=${novelId}`);
      const json = await res.json();
      const otherCharacters = (json.data || []).filter((c: Character) => c.id !== character?.id);
      setCharacters(otherCharacters);
    } catch {
      message.error('获取角色列表失败');
    }
  };

  const fetchRelationships = async () => {
    try {
      const res = await fetch(`/api/character-relationships?novel_id=${novelId}`);
      const json = await res.json();
      const charRelations = (json.data || []).filter(
        (r: CharacterRelationship) => r.character_id === character?.id
      );
      setRelationships(charRelations);
    } catch {
      message.error('获取关系列表失败');
    }
  };

  const handleSubmit = async (values: any) => {
    if (!novelId || !character) return;

    const data: CreateRelationshipValues = {
      novel_id: novelId,
      character_id: character.id,
      related_character_id: values.related_character_id,
      relationship_type: values.relationship_type,
      relationship_description: values.relationship_description,
      intensity: values.intensity,
      status: values.status || 'active',
    };

    try {
      if (editingId) {
        await updateRelationship(editingId, data);
        message.success('更新成功');
      } else {
        await createRelationship(data);
        message.success('创建成功');
      }
      form.resetFields();
      setEditingId(null);
      fetchRelationships();
    } catch {
      message.error(editingId ? '更新失败' : '创建失败');
    }
  };

  const handleEdit = (rel: CharacterRelationship) => {
    setEditingId(rel.id);
    form.setFieldsValue(rel);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRelationship(id);
      message.success('删除成功');
      fetchRelationships();
    } catch {
      message.error('删除失败');
    }
  };

  const getRelatedCharacterName = (characterId: string) => {
    const char = characters.find(c => c.id === characterId);
    return char?.name || '未知';
  };

  const getRelationshipTypeLabel = (type: string) => {
    return RELATIONSHIP_TYPES.find(t => t.value === type)?.label || type;
  };

  const getStatusLabel = (status: string) => {
    return RELATIONSHIP_STATUSES.find(s => s.value === status)?.label || status;
  };

  const availableCharacters = characters.filter(
    c => !relationships.find(r => r.related_character_id === c.id && r.id !== editingId)
  );

  return (
    <Modal
      title={character ? `${character.name} 的关系管理` : '关系管理'}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div className="space-y-6">
        {/* 现有关系列表 */}
        <div>
          <h4 className="font-medium mb-3">现有关系</h4>
          {relationships.length === 0 ? (
            <div className="text-gray-400 text-center py-4">暂无关系</div>
          ) : (
            <List
              dataSource={relationships}
              renderItem={(rel) => (
                <List.Item
                  actions={[
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(rel)}
                    />,
                    <Popconfirm
                      title="确认删除"
                      onConfirm={() => handleDelete(rel.id)}
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{getRelatedCharacterName(rel.related_character_id)}</span>
                        <Tag color="blue">{getRelationshipTypeLabel(rel.relationship_type)}</Tag>
                        <Tag color={rel.status === 'active' ? 'green' : 'orange'}>
                          {getStatusLabel(rel.status)}
                        </Tag>
                      </Space>
                    }
                    description={
                      <div className="space-y-1">
                        <div className="text-xs">
                          关系强度: <span className="font-medium">{rel.intensity}/10</span>
                        </div>
                        {rel.relationship_description && (
                          <div className="text-xs text-gray-500">{rel.relationship_description}</div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>

        {/* 添加/编辑关系表单 */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">
            {editingId ? '编辑关系' : '添加新关系'}
          </h4>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="related_character_id"
              label="关联角色"
              rules={[{ required: true, message: '请选择关联角色' }]}
            >
              <Select
                placeholder="选择角色"
                disabled={!!editingId}
              >
                {availableCharacters.map((c) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="relationship_type"
              label="关系类型"
              rules={[{ required: true, message: '请选择关系类型' }]}
            >
              <Select placeholder="选择关系类型">
                {RELATIONSHIP_TYPES.map((t) => (
                  <Select.Option key={t.value} value={t.value}>
                    {t.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="status"
              label="关系状态"
              initialValue="active"
            >
              <Select>
                {RELATIONSHIP_STATUSES.map((s) => (
                  <Select.Option key={s.value} value={s.value}>
                    {s.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="intensity"
              label="关系强度"
              initialValue={5}
              rules={[{ required: true, message: '请设置关系强度' }]}
            >
              <Slider min={1} max={10} marks={{ 1: '弱', 5: '中', 10: '强' }} />
            </Form.Item>

            <Form.Item
              name="relationship_description"
              label="关系描述"
            >
              <TextArea rows={3} placeholder="描述这段关系..." />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                  {editingId ? '更新' : '添加'}
                </Button>
                {editingId && (
                  <Button onClick={() => { setEditingId(null); form.resetFields(); }}>
                    取消
                  </Button>
                )}
              </Space>
            </Form.Item>
          </Form>
        </div>
      </div>
    </Modal>
  );
};

export default RelationshipEditor;
