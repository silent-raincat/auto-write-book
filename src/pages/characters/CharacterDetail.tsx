import React, { useEffect, useState } from 'react';
import { Modal, Descriptions, Tag, Timeline, Spin, Tabs, Button, Space } from 'antd';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useCharacterStore } from '@/stores/useCharacterStore';
import type { Character } from '@/types/character';
import RelationshipEditor from './RelationshipEditor';
import RelationshipGraph from './RelationshipGraph';

interface CharacterDetailProps {
  visible: boolean;
  onClose: () => void;
  character: Character | null;
  novelId: string | null;
}

const STATE_TYPE_LABELS: Record<string, string> = {
  emotion: '情绪',
  motivation: '动机',
  condition: '处境',
  goal: '目标',
};

const STATE_TYPE_COLORS: Record<string, string> = {
  emotion: 'red',
  motivation: 'orange',
  condition: 'blue',
  goal: 'green',
};

const CharacterDetail: React.FC<CharacterDetailProps> = ({
  visible,
  onClose,
  character,
  novelId,
}) => {
  const [showRelationshipEditor, setShowRelationshipEditor] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const { characterArc, loading, fetchCharacterArc } = useCharacterStore();

  useEffect(() => {
    if (visible && character) {
      fetchCharacterArc(character.id);
    }
  }, [visible, character, fetchCharacterArc]);

  if (!character) return null;

  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      children: (
        <Descriptions bordered column={1}>
          <Descriptions.Item label="姓名">{character.name}</Descriptions.Item>
          <Descriptions.Item label="性别">
            {character.gender ? <Tag color={character.gender === '男' ? 'blue' : character.gender === '女' ? 'magenta' : 'default'}>
              {character.gender}
            </Tag> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="年龄">{character.age ? `${character.age}岁` : '-'}</Descriptions.Item>
          <Descriptions.Item label="性格特征">
            {character.personality || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="外貌描写">
            {character.appearance || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="背景故事">
            {character.background || '-'}
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'arc',
      label: '角色弧光',
      children: (
        <div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spin />
            </div>
          ) : !characterArc || characterArc.arc.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              暂无角色弧光数据
            </div>
          ) : (
            <Timeline mode="left">
              {characterArc.arc.map((chapter, idx) => (
                <Timeline.Item
                  key={idx}
                  label={`第 ${chapter.chapter_number} 章`}
                  color="blue"
                >
                  <div>
                    <div className="font-medium mb-2">{chapter.chapter_title}</div>
                    <div className="space-y-2 ml-2">
                      {chapter.states.map((state, stateIdx) => (
                        <div key={stateIdx} className="flex items-start gap-2">
                          <Tag color={STATE_TYPE_COLORS[state.type]}>
                            {STATE_TYPE_LABELS[state.type] || state.type}
                          </Tag>
                          <div className="flex-1">
                            <div className="font-medium">{state.name}</div>
                            {state.value && (
                              <div className="text-sm text-gray-600">{state.value}</div>
                            )}
                          </div>
                          {state.importance > 7 && (
                            <Tag color="red" className="ml-auto">重要</Tag>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          )}
        </div>
      ),
    },
    {
      key: 'relationships',
      label: '关系图谱',
      children: (
        <div>
          <div className="mb-4">
            <Button
              icon={<TeamOutlined />}
              onClick={() => setShowRelationshipEditor(true)}
            >
              管理关系
            </Button>
          </div>
          <RelationshipGraph novelId={novelId} />
        </div>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={
          <Space>
            <UserOutlined />
            <span>{character.name}</span>
          </Space>
        }
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Modal>

      <RelationshipEditor
        visible={showRelationshipEditor}
        onClose={() => setShowRelationshipEditor(false)}
        character={character}
        novelId={novelId}
      />
    </>
  );
};

export default CharacterDetail;
