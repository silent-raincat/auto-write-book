import React, { useEffect, useState } from 'react';
import { Modal, Descriptions, Tag, Button, Space, Divider, Empty, Spin } from 'antd';
import { EditOutlined, LinkOutlined } from '@ant-design/icons';
import type { WorldViewEntry } from '@/types/worldview';

interface EntryDetailProps {
  visible: boolean;
  onClose: () => void;
  entryId: string | null;
  onEdit: () => void;
}

const EntryDetail: React.FC<EntryDetailProps> = ({
  visible,
  onClose,
  entryId,
  onEdit,
}) => {
  const [entry, setEntry] = useState<WorldViewEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [relatedEntries, setRelatedEntries] = useState<WorldViewEntry[]>([]);
  const [relatedCharacters, setRelatedCharacters] = useState<any[]>([]);

  useEffect(() => {
    if (visible && entryId) {
      fetchEntryData();
    }
  }, [visible, entryId]);

  const fetchEntryData = async () => {
    setLoading(true);
    try {
      // Fetch entry
      const entryRes = await fetch(`/api/worldview-entries/${entryId}`);
      const entryJson = await entryRes.json();
      const entryData = entryJson.data;
      setEntry(entryData);

      // Fetch related entries
      if (entryData.related_entries && entryData.related_entries.length > 0) {
        const relatedPromises = entryData.related_entries.map((id: string) =>
          fetch(`/api/worldview-entries/${id}`).then(r => r.json())
        );
        const relatedData = await Promise.all(relatedPromises);
        setRelatedEntries(relatedData.map((d: any) => d.data).filter(Boolean));
      }

      // Fetch related characters
      if (entryData.related_characters && entryData.related_characters.length > 0) {
        const charPromises = entryData.related_characters.map((id: string) =>
          fetch(`/api/characters/${id}`).then(r => r.json())
        );
        const charData = await Promise.all(charPromises);
        setRelatedCharacters(charData.map((d: any) => d.data).filter(Boolean));
      }
    } catch {
      // Ignore error
    } finally {
      setLoading(false);
    }
  };

  if (!visible || !entryId) return null;

  if (loading) {
    return (
      <Modal
        open={visible}
        onCancel={onClose}
        footer={null}
        width={700}
      >
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      </Modal>
    );
  }

  if (!entry) {
    return (
      <Modal
        open={visible}
        onCancel={onClose}
        footer={null}
        width={700}
      >
        <Empty description="条目不存在" />
      </Modal>
    );
  }

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>关闭</Button>
          <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
            编辑
          </Button>
        </Space>
      }
      width={700}
    >
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <h2 className="text-xl font-bold">{entry.title}</h2>
          {entry.is_locked && <Tag color="orange">已锁定</Tag>}
        </div>

        {entry.tags && entry.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {entry.tags.map((tag, idx) => (
              <Tag key={idx}>{tag}</Tag>
            ))}
          </div>
        )}

        <Divider />

        <Descriptions bordered column={1}>
          <Descriptions.Item label="内容">
            <div className="whitespace-pre-wrap">{entry.content || '-'}</div>
          </Descriptions.Item>
        </Descriptions>

        {relatedEntries.length > 0 && (
          <>
            <Divider orientation="left">关联条目</Divider>
            <div className="space-y-2">
              {relatedEntries.map((e) => (
                <div key={e.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <LinkOutlined />
                  <span>{e.title}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {relatedCharacters.length > 0 && (
          <>
            <Divider orientation="left">关联角色</Divider>
            <div className="flex gap-2 flex-wrap">
              {relatedCharacters.map((c) => (
                <Tag key={c.id} color="blue">
                  {c.name}
                </Tag>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default EntryDetail;
