import { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, Handle, Position } from 'reactflow';
import ELK from 'elkjs/lib/elk.bundled.js';
import 'reactflow/dist/style.css';
import familyData from './data/family.json';
import './App.css';

const ROOT_UNION_ID = 'u_jiangchun_chengrong';
const MATERNAL_UNION_ID = 'u_chengyongshan_duanzhengbi';
const AUNT_UNION_ID = 'u_fengyizheng_chengyafei';
const ME_ID = 'p_jiangyida';
const BROTHER_ID = 'p_jiangsenda';

const UNION_SIZE = { width: 260, height: 52 };
const PERSON_SIZE = { width: 120, height: 40 };

const elk = new ELK();

function UnionNode({ data }) {
  return (
    <div className="union-node">
      <Handle type="target" position={Position.Top} className="node-handle" />
      <button
        type="button"
        className={`union-name ${data.focusSide === 'left' ? 'active' : ''}`}
        onClick={() => data.onSelectPerson?.(data.leftId)}
      >
        {data.leftName}
      </button>
      <button className="union-toggle" onClick={data.onToggle}>
        ⇄
      </button>
      <button
        type="button"
        className={`union-name ${data.focusSide === 'right' ? 'active' : ''}`}
        onClick={() => data.onSelectPerson?.(data.rightId)}
      >
        {data.rightName}
      </button>
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
}

function PersonNode({ data }) {
  return (
    <button className="person-node" onClick={data.onSelect}>
      <Handle type="target" position={Position.Top} className="node-handle" />
      {data.name}
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </button>
  );
}

function sortSiblings(a, b) {
  const aDob = a.dob ? new Date(a.dob) : null;
  const bDob = b.dob ? new Date(b.dob) : null;
  if (aDob && bDob && aDob.getTime() !== bDob.getTime()) {
    return aDob - bDob;
  }
  if (a.birthOrder && b.birthOrder && a.birthOrder !== b.birthOrder) {
    return a.birthOrder - b.birthOrder;
  }
  return (a.names?.zh?.full || '').localeCompare(b.names?.zh?.full || '');
}

function buildVisibleGraph(rootUnionId, unionFocusSide, maps) {
  const {
    peopleById,
    unionsById,
    childrenByUnionId,
    parentUnionByChildId,
    onSelectPerson,
    onToggleUnion,
  } = maps;

  const nodes = [];
  const edges = [];
  const nodeIds = new Set();
  const edgeIds = new Set();

  const addUnionNode = (unionId) => {
    const union = unionsById.get(unionId);
    if (!union || nodeIds.has(unionId)) return;
    const left = peopleById.get(union.partnerLeftId);
    const right = peopleById.get(union.partnerRightId);
    nodes.push({
      id: union.id,
      type: 'unionNode',
      data: {
        leftName: left?.names?.zh?.full || union.partnerLeftId,
        rightName: right?.names?.zh?.full || union.partnerRightId,
        leftId: union.partnerLeftId,
        rightId: union.partnerRightId,
        focusSide: unionFocusSide[union.id] || union.focusSide || 'left',
        onToggle: () => onToggleUnion(union.id),
        onSelectPerson,
      },
      style: { ...UNION_SIZE },
    });
    nodeIds.add(unionId);
  };

  const setNodeMeta = (nodeId, meta) => {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;
    node.data = { ...node.data, ...meta };
  };

  const addPersonNode = (personId) => {
    const person = peopleById.get(personId);
    if (!person || nodeIds.has(personId)) return;
    nodes.push({
      id: person.id,
      type: 'personNode',
      data: {
        name: person.names?.zh?.full || person.id,
        onSelect: () => onSelectPerson(person.id),
      },
      style: { ...PERSON_SIZE },
    });
    nodeIds.add(personId);
  };

  const addEdge = (source, target, index, sourceHandle, targetHandle) => {
    const id = `e_${source}_${target}_${index}`;
    if (edgeIds.has(id)) return;
    edges.push({
      id,
      source,
      target,
      type: 'smoothstep',
      sourceHandle,
      targetHandle,
    });
    edgeIds.add(id);
  };

  const addChildrenEdges = (unionId, children) => {
    if (children.length === 0) return;
    children.forEach((child, idx) => {
      addPersonNode(child.id);
      addEdge(unionId, child.id, idx);
    });
  };

  const rootUnion = unionsById.get(rootUnionId);
  if (!rootUnion) return { nodes, edges };
  addUnionNode(rootUnionId);

  const rawChildrenIds = childrenByUnionId.get(rootUnionId) || [];
  const sortedChildren = rawChildrenIds
    .map((id) => peopleById.get(id))
    .filter(Boolean)
    .sort(sortSiblings);
  const finalChildren =
    sortedChildren.length > 0
      ? sortedChildren
      : [ME_ID, BROTHER_ID]
          .map((id) => peopleById.get(id))
          .filter(Boolean)
          .sort(sortSiblings);

  addChildrenEdges(rootUnionId, finalChildren);

  const rootFocusSide = unionFocusSide[rootUnionId] || rootUnion.focusSide || 'left';
  const activeParentId =
    rootFocusSide === 'left' ? rootUnion.partnerLeftId : rootUnion.partnerRightId;

  const grandUnionId = parentUnionByChildId.get(activeParentId);
  if (grandUnionId) {
    addUnionNode(grandUnionId);
  }

  if (grandUnionId && rootFocusSide === 'right') {
    if (grandUnionId === MATERNAL_UNION_ID) {
      const auntUnion = unionsById.get(AUNT_UNION_ID);
      if (auntUnion) {
        addUnionNode(auntUnion.id);
        const grandChildren = (childrenByUnionId.get(grandUnionId) || [])
          .map((id) => peopleById.get(id))
          .filter(Boolean)
          .sort(sortSiblings);
        const childOrder = new Map(grandChildren.map((child, idx) => [child.id, idx]));

        const mother = peopleById.get(rootUnion.partnerRightId);
        const aunt = peopleById.get(auntUnion.partnerRightId);
        const unionOrder = [
          { unionId: rootUnionId, person: mother },
          { unionId: auntUnion.id, person: aunt },
        ].sort((a, b) => {
          const aIndex = childOrder.get(a.person?.id);
          const bIndex = childOrder.get(b.person?.id);
          if (aIndex != null && bIndex != null && aIndex !== bIndex) {
            return aIndex - bIndex;
          }
          return sortSiblings(a.person || {}, b.person || {});
        });

        unionOrder.forEach((item, idx) => {
          addEdge(grandUnionId, item.unionId, idx);
        });

        const cousinChildren = (childrenByUnionId.get(auntUnion.id) || [])
          .map((id) => peopleById.get(id))
          .filter(Boolean)
          .sort(sortSiblings);
        addChildrenEdges(auntUnion.id, cousinChildren);
      } else {
        addEdge(grandUnionId, rootUnionId, 0);
      }
      return { nodes, edges };
    }

    const grandChildren = (childrenByUnionId.get(grandUnionId) || [])
      .map((id) => peopleById.get(id))
      .filter(Boolean)
      .sort(sortSiblings);

    if (grandChildren.length > 0) {
      addChildrenEdges(grandUnionId, grandChildren);
    }
    addEdge(grandUnionId, rootUnionId, 0);
  } else if (grandUnionId) {
    const grandUnion = unionsById.get(grandUnionId);
    const grandParentId = grandUnion?.partnerLeftId;
    const greatUnionId = grandParentId ? parentUnionByChildId.get(grandParentId) : null;
    const grandUnionFocus = unionFocusSide[grandUnionId] || grandUnion?.focusSide || 'left';

    if (greatUnionId && grandUnionFocus === 'left') {
      addUnionNode(greatUnionId);
      const greatChildren = (childrenByUnionId.get(greatUnionId) || [])
        .map((id) => peopleById.get(id))
        .filter(Boolean)
        .sort(sortSiblings);

      greatChildren.forEach((child, idx) => {
        const childUnion = Array.from(unionsById.values()).find(
          (union) =>
            union.partnerLeftId === child.id || union.partnerRightId === child.id
        );
        if (child.id === grandParentId || childUnion) {
          const unionId = child.id === grandParentId ? grandUnionId : childUnion?.id;
          if (unionId) {
            addUnionNode(unionId);
            if (unionId !== grandUnionId) {
              setNodeMeta(unionId, {
                siblingOrder: idx,
                siblingParentId: greatUnionId,
              });
            }
          }
          if (unionId) {
            addEdge(greatUnionId, unionId, idx);
          } else {
            addPersonNode(child.id);
            addEdge(greatUnionId, child.id, idx);
          }
        } else {
          addPersonNode(child.id);
          addEdge(greatUnionId, child.id, idx);
        }
      });
    }

    addEdge(grandUnionId, rootUnionId, 0);
  }

  const dedupedNodes = Array.from(new Map(nodes.map((node) => [node.id, node])).values());
  const dedupedEdges = Array.from(new Map(edges.map((edge) => [edge.id, edge])).values());

  return { nodes: dedupedNodes, edges: dedupedEdges };
}

async function layoutWithElk(nodes, edges) {
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.portConstraints': 'FIXED_ORDER',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
      'elk.layered.nodePlacement.bk.edgeStraightening': 'IMPROVE_STRAIGHTNESS',
      'elk.layered.considerModelOrder': 'true',
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.layered.spacing.edgeNodeBetweenLayers': '50',
      'elk.spacing.edgeEdge': '20',
    },
    children: nodes.map((node) => {
      const ports = node.ports || node.data?.ports;
      return {
        id: node.id,
        width: node.style?.width || PERSON_SIZE.width,
        height: node.style?.height || PERSON_SIZE.height,
        ports: ports?.map((port) => ({
          id: port.id,
          properties: {
            'elk.port.side': port.side,
          },
        })),
      };
    }),
    edges: edges.map((edge) => {
      const sourcePort = edge.sourceHandle
        ? `${edge.source}:${edge.sourceHandle}`
        : edge.source;
      const targetPort = edge.targetHandle
        ? `${edge.target}:${edge.targetHandle}`
        : edge.target;
      return {
        id: edge.id,
        sources: [sourcePort],
        targets: [targetPort],
      };
    }),
  };

  const layout = await elk.layout(graph);
  const nodePositions = new Map();
  layout.children?.forEach((child) => {
    nodePositions.set(child.id, { x: child.x || 0, y: child.y || 0 });
  });

  const childMap = new Map();
  edges.forEach((edge) => {
    if (!childMap.has(edge.source)) childMap.set(edge.source, []);
    childMap.get(edge.source).push(edge.target);
  });

  const collectSubtree = (startId) => {
    const seen = new Set();
    const stack = [startId];
    while (stack.length > 0) {
      const current = stack.pop();
      if (seen.has(current)) continue;
      seen.add(current);
      const children = childMap.get(current) || [];
      children.forEach((child) => stack.push(child));
    }
    return seen;
  };

  if (nodePositions.has(ROOT_UNION_ID) && nodePositions.has(AUNT_UNION_ID)) {
    const rootPos = nodePositions.get(ROOT_UNION_ID);
    const auntPos = nodePositions.get(AUNT_UNION_ID);
    if (rootPos && auntPos && rootPos.x > auntPos.x) {
      const rootSubtree = collectSubtree(ROOT_UNION_ID);
      const auntSubtree = collectSubtree(AUNT_UNION_ID);
      const rootDelta = auntPos.x - rootPos.x;
      const auntDelta = rootPos.x - auntPos.x;

      rootSubtree.forEach((nodeId) => {
        const pos = nodePositions.get(nodeId);
        if (pos) nodePositions.set(nodeId, { x: pos.x + rootDelta, y: pos.y });
      });
      auntSubtree.forEach((nodeId) => {
        const pos = nodePositions.get(nodeId);
        if (pos) nodePositions.set(nodeId, { x: pos.x + auntDelta, y: pos.y });
      });
    }
  }

  const siblingGroups = new Map();
  nodes.forEach((node) => {
    const order = node.data?.siblingOrder;
    const parentId = node.data?.siblingParentId;
    if (order == null || !parentId) return;
    if (!siblingGroups.has(parentId)) siblingGroups.set(parentId, []);
    siblingGroups.get(parentId).push(node);
  });

  siblingGroups.forEach((groupNodes) => {
    const orderedByBirth = [...groupNodes].sort(
      (a, b) => a.data.siblingOrder - b.data.siblingOrder
    );
    const orderedByX = [...groupNodes]
      .map((node) => ({
        node,
        x: nodePositions.get(node.id)?.x ?? 0,
      }))
      .sort((a, b) => a.x - b.x);

    orderedByBirth.forEach((node, idx) => {
      const desired = orderedByX[idx];
      const currentPos = nodePositions.get(node.id);
      if (!desired || !currentPos) return;
      const delta = desired.x - currentPos.x;
      if (Math.abs(delta) < 1) return;
      const subtree = collectSubtree(node.id);
      subtree.forEach((nodeId) => {
        const pos = nodePositions.get(nodeId);
        if (pos) nodePositions.set(nodeId, { x: pos.x + delta, y: pos.y });
      });
    });
  });

  return {
    nodes: nodes.map((node) => ({
      ...node,
      position: nodePositions.get(node.id) || { x: 0, y: 0 },
    })),
    edges,
  };
}

export default function App() {
  const peopleById = useMemo(
    () => new Map(familyData.people.map((person) => [person.id, person])),
    []
  );
  const unionsById = useMemo(
    () => new Map(familyData.unions.map((union) => [union.id, union])),
    []
  );
  const childrenByUnionId = useMemo(() => {
    const map = new Map();
    familyData.childOf.forEach((link) => {
      if (!map.has(link.unionId)) map.set(link.unionId, []);
      map.get(link.unionId).push(link.childId);
    });
    return map;
  }, []);
  const parentUnionByChildId = useMemo(() => {
    const map = new Map();
    familyData.childOf.forEach((link) => {
      map.set(link.childId, link.unionId);
    });
    return map;
  }, []);

  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [unionFocusSide, setUnionFocusSide] = useState(() =>
    familyData.unions.reduce((acc, union) => {
      acc[union.id] = union.focusSide || 'left';
      return acc;
    }, {})
  );

  const handleToggleUnion = (unionId) => {
    setUnionFocusSide((prev) => ({
      ...prev,
      [unionId]: prev[unionId] === 'left' ? 'right' : 'left',
    }));
  };

  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () =>
      buildVisibleGraph(ROOT_UNION_ID, unionFocusSide, {
        peopleById,
        unionsById,
        childrenByUnionId,
        parentUnionByChildId,
        onSelectPerson: setSelectedPersonId,
        onToggleUnion: handleToggleUnion,
      }),
    [unionFocusSide, peopleById, unionsById, childrenByUnionId, parentUnionByChildId]
  );

  const [layoutedNodes, setLayoutedNodes] = useState([]);
  const [layoutedEdges, setLayoutedEdges] = useState([]);

  useEffect(() => {
    let active = true;
    layoutWithElk(rawNodes, rawEdges).then((result) => {
      if (!active) return;
      setLayoutedNodes(result.nodes);
      setLayoutedEdges(result.edges);
    });
    return () => {
      active = false;
    };
  }, [rawNodes, rawEdges]);

  const selectedPerson = selectedPersonId ? peopleById.get(selectedPersonId) : null;

  return (
    <div className="family-page">
      <div className={`canvas-shell ${selectedPerson ? 'with-panel' : ''}`}>
        <ReactFlow
          nodes={layoutedNodes}
          edges={layoutedEdges}
          nodeTypes={{ unionNode: UnionNode, personNode: PersonNode }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background gap={16} color="#d8c9b3" />
          <Controls />
        </ReactFlow>
      </div>

      {selectedPerson && (
        <aside className="profile-panel">
          <div className="panel-header">
            <h2>{selectedPerson.names?.zh?.full || '人物档案'}</h2>
            <button className="close-btn" onClick={() => setSelectedPersonId(null)}>
              ×
            </button>
          </div>
          <div className="panel-body">
            <p>
              <span className="label">英文名</span>
              {selectedPerson.names?.en
                ? `${selectedPerson.names.en.first} ${selectedPerson.names.en.last}`.trim()
                : '—'}
            </p>
            <p>
              <span className="label">出生日期</span>
              {selectedPerson.dob || '—'}
            </p>
            <p>
              <span className="label">所在地</span>
              {selectedPerson.location || '—'}
            </p>
            <p>
              <span className="label">昵称</span>
              {selectedPerson.nicknames?.length ? selectedPerson.nicknames.join('、') : '—'}
            </p>
            <p>
              <span className="label">备注</span>
              {selectedPerson.notes || '—'}
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}
