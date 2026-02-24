import React, { useEffect, useState, useRef } from 'react';
import { Card, Select, Spin, Tag, Space, Tooltip } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useCharacterStore } from '@/stores/useCharacterStore';
import type { GraphLink } from '@/types/character';

interface RelationshipGraphProps {
  novelId: string | null;
}

const RELATIONSHIP_TYPE_COLORS: Record<string, string> = {
  friend: '#52c41a',
  enemy: '#f5222d',
  family: '#1890ff',
  lover: '#eb2f96',
  mentor: '#722ed1',
  rival: '#fa8c16',
  ally: '#13c2c2',
  stranger: '#bfbfbf',
  other: '#8c8c8c',
};

const RELATIONSHIP_TYPE_LABELS: Record<string, string> = {
  friend: '朋友',
  enemy: '敌人',
  family: '家人',
  lover: '恋人',
  mentor: '导师',
  rival: '竞争对手',
  ally: '盟友',
  stranger: '陌生人',
  other: '其他',
};

const RelationshipGraph: React.FC<RelationshipGraphProps> = ({ novelId }) => {
  const { graphData, loading, fetchGraphData } = useCharacterStore();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (novelId) {
      fetchGraphData(novelId);
    }
  }, [novelId, fetchGraphData]);

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center items-center h-96">
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <Card>
        <div className="flex justify-center items-center h-96 text-gray-400">
          暂无角色关系数据
        </div>
      </Card>
    );
  }

  // Filter links by type
  const filteredLinks = selectedType === 'all'
    ? graphData.links
    : graphData.links.filter(link => link.type === selectedType);

  // Get nodes that are connected by filtered links
  const connectedNodeIds = new Set([
    ...filteredLinks.map(l => l.source),
    ...filteredLinks.map(l => l.target),
  ]);
  const filteredNodes = graphData.nodes.filter(n => connectedNodeIds.has(n.id));

  const relationshipTypes = Array.from(new Set(graphData.links.map(l => l.type)));

  const getChartOption = () => {
    const nodes = filteredNodes.map(n => ({
      id: n.id,
      name: n.name,
      symbolSize: 50,
      itemStyle: {
        color: '#1890ff',
      },
      label: {
        show: true,
        position: 'bottom',
        fontSize: 12,
      },
    }));

    const links = filteredLinks.map(l => ({
      source: l.source,
      target: l.target,
      name: RELATIONSHIP_TYPE_LABELS[l.type] || l.type,
      lineStyle: {
        color: RELATIONSHIP_TYPE_COLORS[l.type] || '#8c8c8c',
        width: l.intensity,
        curveness: 0.2,
      },
      edgeSymbol: ['circle', 'arrow'],
      edgeSymbolSize: [4, 10],
    }));

    return {
      tooltip: {
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            return params.data.name;
          }
          if (params.dataType === 'edge') {
            const link = filteredLinks.find(
              l => l.source === params.data.source && l.target === params.data.target
            );
            if (link) {
              const sourceNode = filteredNodes.find(n => n.id === link.source);
              const targetNode = filteredNodes.find(n => n.id === link.target);
              return `
                <div>
                  <div><strong>${sourceNode?.name}</strong> → <strong>${targetNode?.name}</strong></div>
                  <div>关系: ${RELATIONSHIP_TYPE_LABELS[link.type] || link.type}</div>
                  <div>强度: ${link.intensity}/10</div>
                  ${link.description ? `<div>描述: ${link.description}</div>` : ''}
                </div>
              `;
            }
          }
          return '';
        },
      },
      legend: [{
        data: relationshipTypes.map(t => ({
          name: RELATIONSHIP_TYPE_LABELS[t] || t,
          icon: 'circle',
        })),
        top: 10,
        left: 'center',
      }],
      series: [{
        type: 'graph',
        layout: 'force',
        data: nodes,
        links: links,
        categories: relationshipTypes.map(t => ({ name: RELATIONSHIP_TYPE_LABELS[t] || t })),
        roam: true,
        label: {
          show: true,
          position: 'right',
        },
        labelLayout: {
          hideOverlap: true,
        },
        force: {
          repulsion: 300,
          edgeLength: [100, 200],
          gravity: 0.1,
        },
        edgeLabel: {
          show: true,
          fontSize: 10,
          formatter: (params: any) => {
            return params.data.name;
          },
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 4,
          },
        },
      }],
    };
  };

  const onEvents = {
    mouseover: (params: any) => {
      if (params.dataType === 'edge') {
        const link = filteredLinks.find(
          l => l.source === params.data.source && l.target === params.data.target
        );
        if (link) {
          setHoveredLink(link);
        }
      }
    },
    mouseout: () => {
      setHoveredLink(null);
    },
    click: (params: any) => {
      if (params.dataType === 'node') {
        console.log('Clicked node:', params.data);
        // Could open character detail modal here
      }
    },
  };

  return (
    <Card
      title="角色关系图谱"
      extra={
        <Space>
          <span className="text-sm">筛选:</span>
          <Select
            style={{ width: 120 }}
            value={selectedType}
            onChange={setSelectedType}
          >
            <Select.Option value="all">全部</Select.Option>
            {relationshipTypes.map(type => (
              <Select.Option key={type} value={type}>
                {RELATIONSHIP_TYPE_LABELS[type] || type}
              </Select.Option>
            ))}
          </Select>
        </Space>
      }
    >
      <div className="space-y-4">
        {/* 图例 */}
        <div className="flex justify-center gap-4 text-sm">
          {relationshipTypes.map(type => (
            <Tag
              key={type}
              color={RELATIONSHIP_TYPE_COLORS[type]}
              className="cursor-pointer"
              onClick={() => setSelectedType(type === selectedType ? 'all' : type)}
            >
              {RELATIONSHIP_TYPE_LABELS[type] || type}
            </Tag>
          ))}
        </div>

        {/* 图表 */}
        <ReactECharts
          ref={chartRef}
          option={getChartOption()}
          onEvents={onEvents}
          style={{ height: '500px' }}
          notMerge={true}
          lazyUpdate={true}
        />

        {/* 悬停信息 */}
        {hoveredLink && (
          <div className="text-sm text-gray-600 text-center">
            <Tooltip title={hoveredLink.description}>
              <span>
                关系强度: <strong>{hoveredLink.intensity}/10</strong>
              </span>
            </Tooltip>
          </div>
        )}
      </div>
    </Card>
  );
};

export default RelationshipGraph;
